const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Utility to create valid PNG buffers with Node's built-in zlib
function createPng(width, height, pixelFn) {
  // 1. Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // 2. IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);  // Bit depth: 8
  ihdr.writeUInt8(6, 9);  // Color type: RGBA
  ihdr.writeUInt8(0, 10); // Compression
  ihdr.writeUInt8(0, 11); // Filter
  ihdr.writeUInt8(0, 12); // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // 3. IDAT Raw scanlines (each row begins with filter byte 0)
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter byte: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);

  // 4. IEND Chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 table & function
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const typeAndData = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
}

// Tray icon: 32x32 clean ant silhouette
function trayPixel(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  
  // Distance checks
  // Head: circle at (16, 9), r = 3.5
  const dh = Math.hypot(x - cx, y - (cy - 7));
  if (dh <= 3.8) return [255, 255, 255, 240];

  // Thorax: ellipse at (16, 15), rx = 2.8, ry = 4.2
  const dtx = (x - cx) / 2.8;
  const dty = (y - cy) / 4.2;
  if (dtx * dtx + dty * dty <= 1) return [255, 255, 255, 240];

  // Abdomen (gaster): ellipse at (16, 23), rx = 4.2, ry = 5.5
  const dax = (x - cx) / 4.2;
  const day = (y - (cy + 7)) / 5.5;
  if (dax * dax + day * day <= 1) return [255, 255, 255, 240];

  // Antennae: left and right curved ticks
  if (y >= cy - 12 && y <= cy - 7) {
    if (Math.abs(x - (cx - 3.5 - (cy - 7 - y) * 0.8)) < 1) return [255, 255, 255, 200];
    if (Math.abs(x - (cx + 3.5 + (cy - 7 - y) * 0.8)) < 1) return [255, 255, 255, 200];
  }

  // Legs (6 legs branching from thorax)
  // Leg 1 (front left & right)
  if (Math.abs(y - (cy - 2) - Math.abs(x - cx) * 0.4) < 1.2 && Math.abs(x - cx) >= 2 && Math.abs(x - cx) <= 10) {
    return [255, 255, 255, 220];
  }
  // Leg 2 (middle left & right)
  if (Math.abs(y - cy) < 1.1 && Math.abs(x - cx) >= 2 && Math.abs(x - cx) <= 12) {
    return [255, 255, 255, 220];
  }
  // Leg 3 (rear left & right)
  if (Math.abs(y - (cy + 3) + Math.abs(x - cx) * 0.5) < 1.2 && Math.abs(x - cx) >= 2 && Math.abs(x - cx) <= 11) {
    return [255, 255, 255, 220];
  }

  return [0, 0, 0, 0];
}

// App icon: 128x128 stylized warm ant farm badge
function appPixel(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = 56;
  const d = Math.hypot(x - cx, y - cy);

  // Outer rounded square or circle container
  if (d > r) return [0, 0, 0, 0];

  // Border glow
  if (d > r - 3) return [56, 189, 248, 200]; // Cyan accent border

  // Background: deep earthy soil gradient
  const grad = y / h;
  const bgR = Math.round(35 + grad * 40);
  const bgG = Math.round(25 + grad * 20);
  const bgB = Math.round(20 + grad * 15);

  // Scaled ant in center
  const scale = 2.5;
  const sx = (x - cx) / scale + 16;
  const sy = (y - cy) / scale + 16;
  if (sx >= 0 && sx < 32 && sy >= 0 && sy < 32) {
    const antCol = trayPixel(sx, sy, 32, 32);
    if (antCol[3] > 0) {
      return [250, 204, 21, antCol[3]]; // Golden ant
    }
  }

  // Little soil tunnel arches
  if (y > 75 && Math.abs(Math.sin(x * 0.08) * 12 + 90 - y) < 7) {
    return [bgR + 40, bgG + 25, bgB + 20, 255]; // Lighter tunnel
  }

  return [bgR, bgG, bgB, 255];
}

const outDir = path.join(__dirname, '../assets/icons');
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'tray-icon.png'), createPng(32, 32, trayPixel));
fs.writeFileSync(path.join(outDir, 'icon.png'), createPng(128, 128, appPixel));

console.log('Successfully generated tray-icon.png and icon.png');
