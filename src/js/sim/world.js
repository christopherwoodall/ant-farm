// Cell types in the 2D ant farm grid
export const CELL = {
  AIR: 0,
  SOIL_TOP: 1,
  SOIL_MID: 2,
  SOIL_DEEP: 3,
  WATER: 4,
  FOOD: 5,
  MOUND: 6
};

export class World {
  constructor(cols = 60, rows = 60) {
    this.cols = cols;
    this.rows = rows;
    this.surfaceRow = 10; // First 10 rows are open air / surface
    this.grid = new Uint8Array(cols * rows);
    this.moisture = new Float32Array(cols * rows);
    this.pheromones = new Float32Array(cols * rows); // Food / trail pheromones
    this.foodItems = []; // Array of {x, y, vx, vy, isCarried}
    this.waterDrops = []; // Array of falling water drops {x, y, vy}
    this.dirtMoundCount = 0;

    this.initTerrain();
  }

  index(c, r) {
    return r * this.cols + c;
  }

  inBounds(c, r) {
    return c >= 0 && c < this.cols && r >= 0 && r < this.rows;
  }

  getCell(c, r) {
    if (!this.inBounds(c, r)) return CELL.SOIL_DEEP;
    return this.grid[this.index(c, r)];
  }

  setCell(c, r, val) {
    if (!this.inBounds(c, r)) return;
    this.grid[this.index(c, r)] = val;
  }

  isPassable(c, r) {
    if (!this.inBounds(c, r)) return false;
    const type = this.getCell(c, r);
    return type === CELL.AIR || type === CELL.WATER;
  }

  getPassableLocations() {
    const locs = [];
    for (let r = this.surfaceRow; r < this.rows - 2; r++) {
      for (let c = 2; c < this.cols - 2; c++) {
        if (this.isPassable(c, r)) {
          locs.push({ x: c + 0.5, y: r + 0.5 });
        }
      }
    }
    return locs;
  }

  initTerrain() {
    // Fill air above surface, soil below
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (r < this.surfaceRow) {
          this.setCell(c, r, CELL.AIR);
        } else if (r < this.surfaceRow + 15) {
          this.setCell(c, r, CELL.SOIL_TOP);
        } else if (r < this.rows - 12) {
          this.setCell(c, r, CELL.SOIL_MID);
        } else {
          this.setCell(c, r, CELL.SOIL_DEEP);
        }
      }
    }

    // Carve initial tunnel network matching realistic ant biology and the user's mockup:
    // 1. Surface entrance shaft around col 25-28
    this.carveTunnel(26, this.surfaceRow - 1, 26, 22, 2);

    // 2. Upper branching tunnels
    this.carveTunnel(26, 20, 15, 24, 2);
    this.carveTunnel(26, 22, 40, 24, 2);

    // 3. Central main hub / brood chamber around (22, 34)
    this.carveChamber(22, 34, 6, 4);

    // 4. Connect upper tunnels to central chamber
    this.carveTunnel(15, 24, 20, 33, 2);
    this.carveTunnel(40, 24, 28, 33, 2);

    // 5. Lower deep gallery
    this.carveTunnel(22, 36, 16, 46, 2);
    this.carveTunnel(25, 36, 38, 45, 2);
    this.carveChamber(15, 47, 5, 3);
    this.carveChamber(39, 46, 5, 3);

    // 6. Water pocket / moisture reservoir in top-right (cols 44-53, rows 16-24)
    this.carveChamber(48, 19, 5, 4);
    // Fill bottom half of chamber with water
    for (let r = 19; r <= 22; r++) {
      for (let c = 45; c <= 51; c++) {
        if (this.getCell(c, r) === CELL.AIR) {
          this.setCell(c, r, CELL.WATER);
        }
      }
    }

    // Connect water chamber with access tunnel
    this.carveTunnel(40, 24, 45, 20, 2);

    // Set high moisture around water chamber
    for (let r = 14; r <= 26; r++) {
      for (let c = 40; c <= 55; c++) {
        if (this.inBounds(c, r)) {
          this.moisture[this.index(c, r)] = 0.9;
        }
      }
    }

    this.recomputeFlowFields();
  }

  computeFlowField(targetPoints) {
    const dist = new Int16Array(this.cols * this.rows);
    dist.fill(-1);
    const queue = [];

    for (const pt of targetPoints) {
      if (this.inBounds(pt.c, pt.r)) {
        const idx = this.index(pt.c, pt.r);
        dist[idx] = 0;
        queue.push({ c: pt.c, r: pt.r });
      }
    }

    let head = 0;
    while (head < queue.length) {
      const { c, r } = queue[head++];
      const d = dist[this.index(c, r)];

      const neighbors = [
        { c: c + 1, r },
        { c: c - 1, r },
        { c, r: r + 1 },
        { c, r: r - 1 }
      ];

      for (const n of neighbors) {
        if (this.inBounds(n.c, n.r) && (n.r < this.surfaceRow || this.isPassable(n.c, n.r))) {
          const nIdx = this.index(n.c, n.r);
          if (dist[nIdx] === -1) {
            dist[nIdx] = d + 1;
            queue.push(n);
          }
        }
      }
    }

    return dist;
  }

  recomputeFlowFields() {
    // 1. Surface entrance flow (c=26, r=10)
    this.surfaceFlow = this.computeFlowField([
      { c: 26, r: this.surfaceRow - 1 },
      { c: 25, r: this.surfaceRow - 1 },
      { c: 27, r: this.surfaceRow - 1 }
    ]);

    // 2. Granary / nursery chamber flow (c=22, r=34)
    this.granaryFlow = this.computeFlowField([
      { c: 22, r: 34 },
      { c: 21, r: 34 },
      { c: 23, r: 34 }
    ]);

    // 3. Water reservoir flow (c=48, r=20)
    this.waterFlow = this.computeFlowField([
      { c: 47, r: 20 },
      { c: 48, r: 20 },
      { c: 49, r: 20 }
    ]);
  }

  getFlowAngle(flowField, x, y) {
    if (!flowField) return null;
    const c = Math.floor(x);
    const r = Math.floor(y);
    if (!this.inBounds(c, r)) return null;

    const currentDist = flowField[this.index(c, r)];
    if (currentDist === 0) return null; // Already reached target

    let bestDist = currentDist > 0 ? currentDist : 99999;
    let bestX = null;
    let bestY = null;

    const neighbors = [
      { dc: 1, dr: 0 },
      { dc: -1, dr: 0 },
      { dc: 0, dr: 1 },
      { dc: 0, dr: -1 },
      { dc: 1, dr: 1 },
      { dc: -1, dr: 1 },
      { dc: 1, dr: -1 },
      { dc: -1, dr: -1 }
    ];

    for (const n of neighbors) {
      const nc = c + n.dc;
      const nr = r + n.dr;
      if (this.inBounds(nc, nr) && (nr < this.surfaceRow || this.isPassable(nc, nr))) {
        const d = flowField[this.index(nc, nr)];
        if (d >= 0 && d < bestDist) {
          bestDist = d;
          bestX = nc + 0.5;
          bestY = nr + 0.5;
        }
      }
    }

    if (bestX !== null) {
      return Math.atan2(bestY - y, bestX - x);
    }
    return null;
  }

  carveTunnel(x0, y0, x1, y1, radius = 2) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let cx = x0;
    let cy = y0;

    while (true) {
      this.carveCircle(cx, cy, radius);
      if (cx === x1 && cy === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }
  }

  carveChamber(cx, cy, rx, ry) {
    for (let r = cy - ry; r <= cy + ry; r++) {
      for (let c = cx - rx; c <= cx + rx; c++) {
        if (this.inBounds(c, r) && r >= this.surfaceRow) {
          const normX = (c - cx) / rx;
          const normY = (r - cy) / ry;
          if (normX * normX + normY * normY <= 1.0) {
            this.setCell(c, r, CELL.AIR);
          }
        }
      }
    }
  }

  carveCircle(cx, cy, radius) {
    const r2 = radius * radius;
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (dc * dc + dr * dr <= r2) {
          const c = cx + dc;
          const r = cy + dr;
          if (this.inBounds(c, r) && r >= this.surfaceRow) {
            this.setCell(c, r, CELL.AIR);
          }
        }
      }
    }
  }

  addFood(amount = 5) {
    for (let i = 0; i < amount; i++) {
      // Drop food on surface near the colony entrance
      const x = 12 + Math.random() * (this.cols - 24);
      const y = 2 + Math.random() * (this.surfaceRow - 3);
      this.foodItems.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.4,
        vy: 0.8 + Math.random() * 0.4,
        isCarried: false,
        size: 1.2 + Math.random() * 0.8,
        type: Math.random() > 0.4 ? 'seed' : 'crumb'
      });
    }
  }

  addWater(amount = 5) {
    for (let i = 0; i < amount * 2; i++) {
      // Rain water drops into top right aquifer
      const x = 44 + Math.random() * 8;
      const y = 1 + Math.random() * (this.surfaceRow - 2);
      this.waterDrops.push({
        x,
        y,
        vy: 1.2 + Math.random() * 0.6,
        size: 1.5 + Math.random() * 0.8
      });
    }
  }

  depositMound(c) {
    // Add dirt pellet to surface near entrance (cols 20-32)
    const moundCol = Math.max(16, Math.min(36, Math.round(c)));
    let r = this.surfaceRow - 1;
    while (r > 1 && this.getCell(moundCol, r) !== CELL.AIR) {
      r--;
    }
    if (r >= 2) {
      this.setCell(moundCol, r, CELL.MOUND);
      this.dirtMoundCount++;
    }
  }

  update(dt) {
    // Update falling food items
    for (let i = this.foodItems.length - 1; i >= 0; i--) {
      const f = this.foodItems[i];
      if (f.isCarried) continue;

      const nextX = f.x + f.vx;
      const nextY = f.y + f.vy;
      const gridC = Math.floor(nextX);
      const gridR = Math.floor(nextY);

      if (gridR >= this.surfaceRow && !this.isPassable(gridC, gridR)) {
        // Settled on ground
        f.vy = 0;
        f.vx = 0;
        f.y = Math.min(f.y, this.surfaceRow - 0.3);
      } else {
        f.x = Math.max(2, Math.min(this.cols - 3, nextX));
        f.y = nextY;
      }
    }

    // Update falling water drops
    for (let i = this.waterDrops.length - 1; i >= 0; i--) {
      const w = this.waterDrops[i];
      w.y += w.vy;
      const c = Math.floor(w.x);
      const r = Math.floor(w.y);

      if (!this.inBounds(c, r) || r >= this.rows - 2 || (!this.isPassable(c, r) && r >= this.surfaceRow)) {
        // Reached soil or aquifer: moisten surrounding area
        if (this.inBounds(c, r)) {
          this.moisture[this.index(c, r)] = Math.min(1.0, this.moisture[this.index(c, r)] + 0.3);
          if (r > 16 && r < 24 && c >= 44 && c <= 52 && this.getCell(c, r) === CELL.AIR) {
            this.setCell(c, r, CELL.WATER);
          }
        }
        this.waterDrops.splice(i, 1);
      }
    }

    // Pheromone decay
    for (let i = 0; i < this.pheromones.length; i++) {
      if (this.pheromones[i] > 0.001) {
        this.pheromones[i] *= 0.995;
      }
    }
  }
}
