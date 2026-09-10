import { CELL } from './world.js';
import { ANT_STATE } from './ant.js';

export class AntFarmRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.width = canvas.width;
    this.height = canvas.height;

    // Soil color palettes
    this.soilColors = {
      [CELL.SOIL_TOP]: '#7c2d12',
      [CELL.SOIL_MID]: '#9a3412',
      [CELL.SOIL_DEEP]: '#431407',
      [CELL.MOUND]: '#b45309'
    };

    this.tunnelColor = '#291307';
    this.tunnelEdgeColor = '#1d0c04';
    this.skyColor = '#1e293b';

    this.animTime = 0;
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.zoomDisplayTimer = 0;
    this.ripples = [];
  }

  addRipple(x, y) {
    this.ripples.push({ x, y, radius: 0.5, alpha: 0.85 });
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.width = width;
    this.height = height;
  }

  setZoom(newZoom) {
    const clamped = Math.max(1.0, Math.min(4.5, newZoom));
    if (clamped !== this.zoom) {
      this.zoom = clamped;
      this.zoomDisplayTimer = 1.5; // Show zoom badge for 1.5s
      if (this.zoom === 1.0) {
        this.panX = 0;
        this.panY = 0;
      } else {
        this.clampPan();
      }
    }
  }

  pan(dx, dy) {
    if (this.zoom <= 1.0) return;
    this.panX += dx;
    this.panY += dy;
    this.clampPan();
  }

  clampPan() {
    const maxPanX = (this.zoom - 1.0) * (this.width / 2);
    const maxPanY = (this.zoom - 1.0) * (this.height / 2);
    this.panX = Math.max(-maxPanX, Math.min(maxPanX, this.panX));
    this.panY = Math.max(-maxPanY, Math.min(maxPanY, this.panY));
  }

  screenToWorld(screenX, screenY, world) {
    // Inverse transform of translate(w/2 + panX, h/2 + panY) * scale(zoom) * translate(-w/2, -h/2)
    const normX = (screenX - (this.width / 2 + this.panX)) / this.zoom + this.width / 2;
    const normY = (screenY - (this.height / 2 + this.panY)) / this.zoom + this.height / 2;
    const c = (normX / this.width) * world.cols;
    const r = (normY / this.height) * world.rows;
    return { c, r };
  }

  render(simulation, dt) {
    this.animTime += dt;
    if (this.zoomDisplayTimer > 0) {
      this.zoomDisplayTimer -= dt;
    }

    const ctx = this.ctx;
    const world = simulation.world;
    const cw = this.width / world.cols;
    const ch = this.height / world.rows;

    ctx.clearRect(0, 0, this.width, this.height);

    // Apply Zoom & Pan Transform
    ctx.save();
    ctx.translate(this.width / 2 + this.panX, this.height / 2 + this.panY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.width / 2, -this.height / 2);

    // 1. Draw Sky / Surface atmosphere
    const surfaceY = world.surfaceRow * ch;
    const skyGrad = ctx.createLinearGradient(0, 0, 0, surfaceY);
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, surfaceY);

    // 2. Draw Soil & Tunnels grid
    this.renderSoil(ctx, world, cw, ch);

    // 3. Draw Water pocket
    this.renderWater(ctx, world, cw, ch);

    // 4. Draw Surface Food & Dropped Items
    this.renderFood(ctx, world, cw, ch);

    // 5. Draw Ants
    for (const ant of simulation.ants) {
      this.renderAnt(ctx, ant, cw, ch);
    }

    // 6. Draw Falling Water Drops
    this.renderFallingWater(ctx, world, cw, ch);

    // 7. Draw Glass Tap Acoustic Shockwaves
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const rip = this.ripples[i];
      rip.radius += dt * 36;
      rip.alpha -= dt * 2.4;
      if (rip.alpha <= 0) {
        this.ripples.splice(i, 1);
        continue;
      }
      ctx.strokeStyle = `rgba(56, 189, 248, ${rip.alpha})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(rip.x * cw, rip.y * ch, rip.radius * (cw / 4), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    // 7. Subtle glass highlight / vignette border
    this.renderGlassOverlay(ctx);

    // 8. Zoom Indicator Overlay when zooming
    if (this.zoomDisplayTimer > 0 && this.zoom > 1.0) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(8, 8, 42, 18);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(8, 8, 42, 18);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(`${this.zoom.toFixed(1)}x`, 14, 21);
    }
  }

  renderSoil(ctx, world, cw, ch) {
    const cols = world.cols;
    const rows = world.rows;

    for (let r = world.surfaceRow; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = world.getCell(c, r);
        const x = c * cw;
        const y = r * ch;

        if (cell === CELL.AIR) {
          // Tunnel cavity
          ctx.fillStyle = this.tunnelColor;
          ctx.fillRect(x - 0.5, y - 0.5, cw + 1, ch + 1);

          // Subtle tunnel shadow along boundaries
          const hasTopSoil = !world.isPassable(c, r - 1);
          if (hasTopSoil) {
            ctx.fillStyle = 'rgba(10, 5, 2, 0.45)';
            ctx.fillRect(x, y, cw, ch * 0.4);
          }
        } else if (cell !== CELL.WATER) {
          // Dirt block
          let color = this.soilColors[cell] || this.soilColors[CELL.SOIL_MID];
          ctx.fillStyle = color;
          ctx.fillRect(x - 0.5, y - 0.5, cw + 1, ch + 1);

          // Organic texture noise based on coordinates
          if ((c * 7 + r * 13) % 5 === 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.fillRect(x + cw * 0.2, y + ch * 0.2, cw * 0.6, ch * 0.6);
          } else if ((c * 11 + r * 3) % 7 === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.fillRect(x + cw * 0.3, y + ch * 0.3, cw * 0.4, ch * 0.4);
          }
        }
      }
    }

    // Surface mounds above ground
    for (let r = 0; r < world.surfaceRow; r++) {
      for (let c = 0; c < cols; c++) {
        if (world.getCell(c, r) === CELL.MOUND) {
          const x = c * cw;
          const y = r * ch;
          ctx.fillStyle = this.soilColors[CELL.MOUND];
          ctx.beginPath();
          ctx.arc(x + cw / 2, y + ch / 2, cw * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  renderWater(ctx, world, cw, ch) {
    const cols = world.cols;
    const rows = world.rows;

    ctx.fillStyle = 'rgba(56, 189, 248, 0.82)'; // Vibrant cyan-blue
    for (let r = 16; r <= 24; r++) {
      for (let c = 43; c <= 53; c++) {
        if (world.getCell(c, r) === CELL.WATER) {
          const x = c * cw;
          const y = r * ch;
          const wave = Math.sin(this.animTime * 3 + c * 0.8) * (ch * 0.15);
          ctx.fillRect(x, y + wave, cw, ch);
        }
      }
    }
  }

  renderFood(ctx, world, cw, ch) {
    for (const f of world.foodItems) {
      if (f.isCarried) continue;
      const x = f.x * cw;
      const y = f.y * ch;

      ctx.save();
      ctx.translate(x, y);

      if (f.type === 'seed') {
        // Seed grain
        ctx.fillStyle = '#f59e0b'; // Amber seed
        ctx.beginPath();
        ctx.ellipse(0, 0, cw * 0.7, cw * 0.45, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      } else {
        // Crumb
        ctx.fillStyle = '#84cc16'; // Protein / leaf crumb
        ctx.beginPath();
        ctx.arc(0, 0, cw * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  renderFallingWater(ctx, world, cw, ch) {
    ctx.fillStyle = '#38bdf8';
    for (const w of world.waterDrops) {
      const x = w.x * cw;
      const y = w.y * ch;
      ctx.beginPath();
      ctx.arc(x, y, cw * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderAnt(ctx, ant, cw, ch) {
    const ax = ant.x * cw;
    const ay = ant.y * ch;
    const scale = (ant.species.scale || 1.0) * (cw / 5.0);

    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(ant.angle);
    ctx.scale(scale, scale);

    const bodyCol = ant.species.color || '#1e293b';
    const abdCol = ant.species.abdomenColor || '#0f172a';
    const highCol = ant.species.highlightColor || '#64748b';

    // 1. Biological 6-Leg Tripod Gait Kinematics
    const cycle = ant.walkCycle;
    const legPhase1 = Math.sin(cycle) * 0.4;
    const legPhase2 = Math.sin(cycle + Math.PI) * 0.4;

    ctx.strokeStyle = bodyCol;
    ctx.lineWidth = 0.85;
    ctx.lineCap = 'round';

    // Tripod 1: Left-Front (L1), Right-Middle (R2), Left-Rear (L3)
    // Left Front (L1)
    this.drawLeg(ctx, -1, -2, -6, -5 + legPhase1 * 3, -8, -3 + legPhase1 * 4);
    // Right Middle (R2)
    this.drawLeg(ctx, 0, 2, 5, 4 + legPhase1 * 3, 8, 3 + legPhase1 * 4);
    // Left Rear (L3)
    this.drawLeg(ctx, 2, -2, -5, -4 + legPhase1 * 3, -7, -6 + legPhase1 * 4);

    // Tripod 2: Right-Front (R1), Left-Middle (L2), Right-Rear (R3)
    // Right Front (R1)
    this.drawLeg(ctx, -1, 2, 6, 5 + legPhase2 * 3, 8, 3 + legPhase2 * 4);
    // Left Middle (L2)
    this.drawLeg(ctx, 0, -2, -5, -4 + legPhase2 * 3, -8, -3 + legPhase2 * 4);
    // Right Rear (R3)
    this.drawLeg(ctx, 2, 2, 5, 4 + legPhase2 * 3, 7, 6 + legPhase2 * 4);

    // 2. Abdomen (Gaster)
    ctx.fillStyle = abdCol;
    ctx.beginPath();
    if (ant.isReplete) {
      // Swollen honey pot replete
      ctx.fillStyle = '#f59e0b';
      ctx.arc(-5, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(254, 240, 138, 0.6)';
      ctx.beginPath();
      ctx.arc(-5.5, -1, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.ellipse(-4.5, 0, 3.8, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Petiole (Narrow waist)
    ctx.fillStyle = bodyCol;
    ctx.beginPath();
    ctx.ellipse(-1.2, 0, 1.0, 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Thorax (Mesosoma)
    ctx.fillStyle = bodyCol;
    ctx.beginPath();
    ctx.ellipse(0.8, 0, 2.4, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Head
    ctx.fillStyle = bodyCol;
    ctx.beginPath();
    ctx.ellipse(4.2, 0, 2.0, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mandibles
    ctx.strokeStyle = highCol;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(5.8, -0.7);
    ctx.lineTo(7.2, -0.3);
    ctx.moveTo(5.8, 0.7);
    ctx.lineTo(7.2, 0.3);
    ctx.stroke();

    // 6. Antennae with twitching
    const antWave1 = Math.sin(ant.antennaPhase) * 0.35;
    const antWave2 = Math.cos(ant.antennaPhase * 1.2) * 0.35;

    ctx.strokeStyle = bodyCol;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    // Left antenna
    ctx.moveTo(5.0, -0.9);
    ctx.lineTo(7.5, -2.5 + antWave1);
    ctx.lineTo(10.0, -3.5 + antWave1 * 1.5);
    // Right antenna
    ctx.moveTo(5.0, 0.9);
    ctx.lineTo(7.5, 2.5 + antWave2);
    ctx.lineTo(10.0, 3.5 + antWave2 * 1.5);
    ctx.stroke();

    // 7. Carried item (in front of head)
    if (ant.carriedItem) {
      if (ant.carriedItem.type === 'food') {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(8.5, 0, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (ant.carriedItem.type === 'dirt') {
        ctx.fillStyle = '#9a3412';
        ctx.beginPath();
        ctx.arc(8.2, 0, 2.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 8. Trophallaxis heart/nourishment indicator
    if (ant.state === ANT_STATE.TROPHALLAXIS && ant.partner) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.beginPath();
      ctx.arc(7.0, 0, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawLeg(ctx, bx, by, kx, ky, fx, fy) {
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(kx, ky);
    ctx.lineTo(fx, fy);
    ctx.stroke();
  }

  renderGlassOverlay(ctx) {
    // Subtle inner border reflection
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, this.width - 1, this.height - 1);
  }
}
