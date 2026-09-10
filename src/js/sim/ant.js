import { CELL } from './world.js';

export const ANT_STATE = {
  WANDER: 'wander',
  FORAGE: 'forage',
  CARRY_FOOD: 'carry_food',
  DRINK: 'drink',
  DIG: 'dig',
  CARRY_DIRT: 'carry_dirt',
  TROPHALLAXIS: 'trophallaxis',
  REST: 'rest'
};

export class Ant {
  constructor(id, world, species, initialPos = null) {
    this.id = id;
    this.world = world;
    this.species = species;

    // Position in world coordinates
    if (initialPos) {
      this.x = initialPos.x;
      this.y = initialPos.y;
    } else {
      this.x = 22 + (Math.random() - 0.5) * 6;
      this.y = 33 + (Math.random() - 0.5) * 3;
    }

    this.vx = 0;
    this.vy = 0;
    this.angle = Math.random() * Math.PI * 2; // Facing direction in radians
    this.targetAngle = this.angle;
    this.speed = 0.5 + Math.random() * 0.4;
    this.state = ANT_STATE.WANDER;

    // Biological locomotion state
    this.walkCycle = Math.random() * Math.PI * 2;
    this.antennaPhase = Math.random() * Math.PI * 2;
    this.isMoving = false;

    // Needs & carrying
    this.energy = 0.7 + Math.random() * 0.3;
    this.hydration = 0.7 + Math.random() * 0.3;
    this.carriedItem = null; // null | { type: 'food', item: ... } | { type: 'dirt' }
    this.target = null; // { x, y }

    // Caste / role assignment
    const rand = Math.random();
    if (rand < 0.35) {
      this.role = 'forager';
    } else if (rand < 0.65) {
      this.role = 'excavator';
    } else {
      this.role = 'nurse';
    }

    // Honeypot special replete caste
    this.isReplete = (species.id === 'honeypot' && Math.random() < 0.18);

    this.timer = Math.random() * 3;
    this.partner = null; // For trophallaxis

    // Anti-stuck and nudge tracking
    this.lastX = this.x;
    this.lastY = this.y;
    this.stuckTimer = 0;
    this.overrideTimer = 0; // Lockout timer during which nudges are not overridden by flow fields
  }

  update(dt, colonyNeeds) {
    // Honeypot replete normally hangs storing nectar, but repositions if nudged
    if (this.isReplete) {
      this.antennaPhase += dt * 4;
      if (this.overrideTimer > 0) {
        this.overrideTimer -= dt;
        this.walkCycle += 8 * dt;
        this.moveInTunnels(dt, 0.35);
        return;
      }
      this.isMoving = false;
      return;
    }

    this.walkCycle += (this.isMoving ? 14 : 0) * dt;
    this.antennaPhase += dt * 6;
    this.timer -= dt;
    if (this.overrideTimer > 0) {
      this.overrideTimer -= dt;
    }

    // Needs decay slowly over time
    this.energy -= 0.005 * dt;
    this.hydration -= 0.008 * dt;

    // State machine transitions
    if (this.timer <= 0) {
      this.decideNextAction(colonyNeeds);
    }

    // Execute state behavior
    switch (this.state) {
      case ANT_STATE.WANDER:
        this.stepWander(dt);
        break;
      case ANT_STATE.FORAGE:
        this.stepForage(dt);
        break;
      case ANT_STATE.CARRY_FOOD:
        this.stepCarryFood(dt);
        break;
      case ANT_STATE.DRINK:
        this.stepDrink(dt);
        break;
      case ANT_STATE.DIG:
        this.stepDig(dt);
        break;
      case ANT_STATE.CARRY_DIRT:
        this.stepCarryDirt(dt);
        break;
      case ANT_STATE.TROPHALLAXIS:
        this.stepTrophallaxis(dt);
        break;
      case ANT_STATE.REST:
        this.isMoving = false;
        break;
    }

    // Natural angle smoothing
    let angleDiff = this.targetAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.angle += angleDiff * Math.min(1.0, 10 * dt);

    // Robust autonomous stuck watchdog: detects if an ant hasn't moved for >0.85s
    const cellC = Math.floor(this.x);
    const cellR = Math.floor(this.y);
    if (cellR >= this.world.surfaceRow && !this.world.isPassable(cellC, cellR)) {
      // Buried in dirt: unstick immediately!
      this.unstick();
    } else {
      const distMoved = Math.hypot(this.x - this.lastX, this.y - this.lastY);
      if (distMoved < 0.04) {
        this.stuckTimer += dt;
        if (this.stuckTimer > 0.85) {
          this.unstick();
          this.stuckTimer = 0;
        }
      } else {
        this.stuckTimer = 0;
        this.lastX = this.x;
        this.lastY = this.y;
      }
    }
  }

  nudge(pushAngle, pushForce) {
    this.partner = null;
    this.state = ANT_STATE.WANDER;
    this.overrideTimer = 2.5; // Don't let flow fields override this direction for 2.5s
    this.stuckTimer = 0;
    this.targetAngle = pushAngle;
    this.angle = pushAngle;
    this.isMoving = true;
    this.speed = Math.max(0.85, this.speed * 1.5); // Scurry speed burst!

    // Displace along push vector with collision sliding
    const dist = pushForce * 1.6;
    const nx = this.x + Math.cos(pushAngle) * dist;
    const ny = this.y + Math.sin(pushAngle) * dist;

    if (this.canStepTo(nx, ny)) {
      this.x = nx;
      this.y = ny;
    } else if (this.canStepTo(nx, this.y)) {
      this.x = nx;
    } else if (this.canStepTo(this.x, ny)) {
      this.y = ny;
    } else {
      this.unstick();
    }
  }

  unstick() {
    this.partner = null;
    this.state = ANT_STATE.WANDER;
    this.overrideTimer = 2.0;
    this.stuckTimer = 0;
    this.isMoving = true;
    this.speed = Math.max(0.75, this.speed);

    const c = Math.floor(this.x);
    const r = Math.floor(this.y);

    // Search radially up to 5 blocks away for the nearest open corridor
    let bestDist = 999;
    let targetX = null;
    let targetY = null;

    for (let radius = 1; radius <= 5; radius++) {
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          const nc = c + dc;
          const nr = r + dr;
          if (this.canStepTo(nc + 0.5, nr + 0.5)) {
            const d = Math.hypot(dc, dr);
            if (d < bestDist) {
              bestDist = d;
              targetX = nc + 0.5;
              targetY = nr + 0.5;
            }
          }
        }
      }
      if (targetX !== null) break;
    }

    if (targetX !== null) {
      this.x = targetX;
      this.y = targetY;
      this.lastX = targetX;
      this.lastY = targetY;
      this.targetAngle = Math.random() * Math.PI * 2;
    } else {
      // Safe fallback to central chamber
      this.x = 22.5;
      this.y = 33.5;
      this.lastX = 22.5;
      this.lastY = 33.5;
      this.targetAngle = Math.random() * Math.PI * 2;
    }
  }

  decideNextAction(colonyNeeds) {
    this.timer = 1.5 + Math.random() * 2.5;

    // If carrying something, continue dedicated task
    if (this.carriedItem) {
      if (this.carriedItem.type === 'food') {
        this.state = ANT_STATE.CARRY_FOOD;
        return;
      }
      if (this.carriedItem.type === 'dirt') {
        this.state = ANT_STATE.CARRY_DIRT;
        return;
      }
    }

    // If thirsty and water available
    if (this.hydration < 0.4 && colonyNeeds.water > 0) {
      this.state = ANT_STATE.DRINK;
      this.target = { x: 47 + Math.random() * 3, y: 20 + Math.random() * 2 };
      return;
    }

    // Check role preference
    if (this.role === 'forager') {
      // If food is on surface or hungry, head up to forage
      if (this.world.foodItems.some(f => !f.isCarried)) {
        this.state = ANT_STATE.FORAGE;
        return;
      }
    } else if (this.role === 'excavator') {
      // Excavators love expanding new shafts
      if (Math.random() < 0.6) {
        this.state = ANT_STATE.DIG;
        return;
      }
    }

    // Default wander
    if (Math.random() < 0.2) {
      this.state = ANT_STATE.REST;
      this.timer = 1 + Math.random() * 2;
    } else {
      this.state = ANT_STATE.WANDER;
    }
  }

  stepWander(dt) {
    // If on surface, encourage walking along ground and returning to nest entrance
    if (this.y < this.world.surfaceRow - 1.5 && Math.random() < 0.2) {
      this.targetAngle = Math.atan2(this.world.surfaceRow - this.y, 26 - this.x) + (Math.random() - 0.5) * 0.4;
    }

    this.moveInTunnels(dt, this.speed * 0.75);

    // Random turn when meeting forks
    if (Math.random() < 0.05) {
      this.targetAngle += (Math.random() - 0.5) * 1.5;
    }
  }

  alertToFood() {
    if (this.isReplete) return;
    this.state = ANT_STATE.FORAGE;
    this.timer = 8.0; // Stay focused on foraging
    this.isMoving = true;
    this.speed = (0.7 + Math.random() * 0.4) * (this.species.forageSpeed || 1.0);
  }

  alertToWater() {
    if (this.isReplete) return;
    this.state = ANT_STATE.DRINK;
    this.timer = 8.0;
    this.isMoving = true;
  }

  stepForage(dt) {
    if (this.overrideTimer > 0) {
      this.moveInTunnels(dt, this.speed * 1.25);
      return;
    }

    // If still deep in tunnels, follow surface flow directly to the entrance
    if (this.y > this.world.surfaceRow - 0.5) {
      const flowAngle = this.world.getFlowAngle(this.world.surfaceFlow, this.x, this.y);
      if (flowAngle !== null) {
        this.targetAngle = flowAngle;
      }
      this.moveInTunnels(dt, this.speed * 1.25);
      return;
    }

    // On surface: look for nearest food item
    let nearestFood = null;
    let minDist = 999;
    for (const f of this.world.foodItems) {
      if (f.isCarried) continue;
      const d = Math.hypot(f.x - this.x, f.y - this.y);
      if (d < minDist) {
        minDist = d;
        nearestFood = f;
      }
    }

    if (nearestFood) {
      const dx = nearestFood.x - this.x;
      const dy = nearestFood.y - this.y;

      if (minDist < 1.8) {
        // Pick up food!
        nearestFood.isCarried = true;
        this.carriedItem = { type: 'food', item: nearestFood };
        this.state = ANT_STATE.CARRY_FOOD;
        this.timer = 12.0;
        return;
      }

      this.targetAngle = Math.atan2(dy, dx);
      this.moveForward(dt, this.speed * 1.2);
    } else {
      // No food on surface, navigate back towards nest entrance
      if (Math.hypot(this.x - 26, this.y - 9.5) > 2.2) {
        this.targetAngle = Math.atan2(9.5 - this.y, 26 - this.x);
        this.moveForward(dt, this.speed * 0.9);
      } else {
        this.state = ANT_STATE.WANDER;
        this.targetAngle = Math.PI / 2; // Head down into burrow
      }
    }
  }

  stepCarryFood(dt) {
    const distToGranary = Math.hypot(22 - this.x, 34 - this.y);
    if (distToGranary < 3.2) {
      // Reached food storage chamber: deposit food!
      if (this.carriedItem && this.carriedItem.item) {
        const idx = this.world.foodItems.indexOf(this.carriedItem.item);
        if (idx !== -1) this.world.foodItems.splice(idx, 1);
      }
      this.carriedItem = null;
      this.state = ANT_STATE.WANDER;
      this.energy = Math.min(1.0, this.energy + 0.6);
      this.timer = 2.0;
      return;
    }

    if (this.overrideTimer > 0) {
      this.moveInTunnels(dt, this.speed * 1.1);
      return;
    }

    // Follow granary flow down into the nest
    const flowAngle = this.world.getFlowAngle(this.world.granaryFlow, this.x, this.y);
    if (flowAngle !== null) {
      this.targetAngle = flowAngle;
    }
    this.moveInTunnels(dt, this.speed * 1.1);
  }

  stepDrink(dt) {
    const distToWater = Math.hypot(48 - this.x, 20 - this.y);
    if (distToWater < 2.5) {
      // Drink at the reservoir
      this.hydration = 1.0;
      this.isMoving = false;
      this.timer -= dt;
      if (this.timer <= 5.0) {
        this.state = ANT_STATE.WANDER;
      }
      return;
    }

    if (this.overrideTimer > 0) {
      this.moveInTunnels(dt, this.speed * 1.15);
      return;
    }

    // Follow water flow to aquifer
    const flowAngle = this.world.getFlowAngle(this.world.waterFlow, this.x, this.y);
    if (flowAngle !== null) {
      this.targetAngle = flowAngle;
    }
    this.moveInTunnels(dt, this.speed * 1.15);
  }

  stepDig(dt) {
    // Find an adjacent soil cell to dig
    const c = Math.floor(this.x);
    const r = Math.floor(this.y);

    const digTargets = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nc = c + dc;
        const nr = r + dr;
        if (nr >= this.world.surfaceRow + 2 && !this.world.isPassable(nc, nr)) {
          digTargets.push({ c: nc, r: nr });
        }
      }
    }

    if (digTargets.length > 0) {
      const chosen = digTargets[Math.floor(Math.random() * digTargets.length)];
      this.targetAngle = Math.atan2(chosen.r - this.y, chosen.c - this.x);
      this.isMoving = true;

      // Dig out the cell and update flow fields
      this.world.setCell(chosen.c, chosen.r, CELL.AIR);
      this.world.recomputeFlowFields();
      this.carriedItem = { type: 'dirt' };
      this.state = ANT_STATE.CARRY_DIRT;
      return;
    }

    // Wander deeper to find new digging sites
    this.moveInTunnels(dt, this.speed * 0.8);
  }

  stepCarryDirt(dt) {
    if (this.overrideTimer > 0) {
      this.moveInTunnels(dt, this.speed * 1.1);
      return;
    }

    // Follow surface flow directly up to entrance
    if (this.y > this.world.surfaceRow - 0.5) {
      const flowAngle = this.world.getFlowAngle(this.world.surfaceFlow, this.x, this.y);
      if (flowAngle !== null) {
        this.targetAngle = flowAngle;
      }
      this.moveInTunnels(dt, this.speed * 1.1);
    } else {
      // On surface: walk towards mound and deposit dirt pellet
      const targetMoundCol = this.x < 26 ? 20 : 32;
      this.targetAngle = Math.atan2(0, targetMoundCol - this.x);
      this.moveForward(dt, this.speed * 0.9);

      if (Math.abs(this.x - targetMoundCol) < 2) {
        this.world.depositMound(this.x);
        this.carriedItem = null;
        this.state = ANT_STATE.WANDER;
        this.targetAngle = Math.atan2(1, 26 - this.x);
        this.timer = 1.0;
      }
    }
  }

  stepTrophallaxis(dt) {
    // Pause and share food liquid
    this.isMoving = false;
    if (!this.partner || Math.hypot(this.partner.x - this.x, this.partner.y - this.y) > 2.2 || this.timer <= 0) {
      this.state = ANT_STATE.WANDER;
      this.partner = null;
      return;
    }
    this.targetAngle = Math.atan2(this.partner.y - this.y, this.partner.x - this.x);
  }

  navigateTowards(targetX, targetY, dt) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    this.targetAngle = Math.atan2(dy, dx);
    this.moveInTunnels(dt, this.speed);
  }

  canStepTo(nx, ny) {
    if (nx < 1.0 || nx > this.world.cols - 2.0 || ny < 0.5 || ny > this.world.rows - 1.5) {
      return false;
    }
    const gc = Math.floor(nx);
    const gr = Math.floor(ny);
    return gr < this.world.surfaceRow || this.world.isPassable(gc, gr);
  }

  findOpenAngle() {
    const c = Math.floor(this.x);
    const r = Math.floor(this.y);
    const candidates = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dc === 0 && dr === 0) continue;
        const nc = c + dc;
        const nr = r + dr;
        if (this.canStepTo(nc + 0.5, nr + 0.5)) {
          candidates.push(Math.atan2(dr, dc));
        }
      }
    }
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    return null;
  }

  moveInTunnels(dt, baseSpeed) {
    const dist = baseSpeed * dt * 8.5 * this.species.scale;
    const cosA = Math.cos(this.targetAngle);
    const sinA = Math.sin(this.targetAngle);
    const nx = this.x + cosA * dist;
    const ny = this.y + sinA * dist;

    // 1. Direct step
    if (this.canStepTo(nx, ny)) {
      this.x = nx;
      this.y = ny;
      this.isMoving = true;
      return;
    }

    // 2. Horizontal slide (X-axis)
    if (this.canStepTo(nx, this.y) && Math.abs(cosA) > 0.15) {
      this.x = nx;
      this.isMoving = true;
      return;
    }

    // 3. Vertical slide (Y-axis)
    if (this.canStepTo(this.x, ny) && Math.abs(sinA) > 0.15) {
      this.y = ny;
      this.isMoving = true;
      return;
    }

    // 4. Truly blocked: pick an open heading
    this.isMoving = false;
    const openAngle = this.findOpenAngle();
    if (openAngle !== null) {
      this.targetAngle = openAngle;
    } else {
      this.targetAngle += (Math.random() > 0.5 ? 1 : -1) * (1.1 + Math.random() * 0.9);
    }
  }

  moveForward(dt, speed) {
    const dist = speed * dt * 8;
    this.x = Math.max(1, Math.min(this.world.cols - 2, this.x + Math.cos(this.targetAngle) * dist));
    this.y = Math.max(1, Math.min(this.world.rows - 2, this.y + Math.sin(this.targetAngle) * dist));
    this.isMoving = true;
  }
}
