import { World } from './world.js';
import { Ant, ANT_STATE } from './ant.js';
import { getSpecies } from './species.js';

export class ColonySimulation {
  constructor(initialState = {}, config = {}) {
    this.species = getSpecies(initialState.species || config.species || 'black_garden');
    this.world = new World(60, 60);

    this.antCount = initialState.antCount || 27;
    this.water = initialState.water !== undefined ? initialState.water : 8;
    this.food = initialState.food !== undefined ? initialState.food : 12;
    this.brood = 6; // Eggs/larvae in nursery
    this.speedMultiplier = config.simSpeed || 1.0;

    this.ants = [];
    this.initAnts();

    this.resourceTimer = 0;
    this.broodTimer = 0;
    this.onColonyUpdate = null; // Callback for UI
  }

  initAnts() {
    this.ants = [];
    const spawnPoints = this.world.getPassableLocations();
    for (let i = 0; i < this.antCount; i++) {
      let pos = null;
      if (spawnPoints && spawnPoints.length > 0) {
        pos = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
      }
      this.ants.push(new Ant(i, this.world, this.species, pos));
    }
  }

  setSpecies(speciesId) {
    this.species = getSpecies(speciesId);
    for (const ant of this.ants) {
      ant.species = this.species;
      ant.isReplete = (this.species.id === 'honeypot' && Math.random() < 0.18);
    }
  }

  setAntCount(newCount) {
    newCount = Math.max(5, Math.min(100, Math.round(newCount)));
    this.antCount = newCount;
    const spawnPoints = this.world.getPassableLocations();

    while (this.ants.length < newCount) {
      const pos = spawnPoints && spawnPoints.length > 0
        ? spawnPoints[Math.floor(Math.random() * spawnPoints.length)]
        : null;
      this.ants.push(new Ant(this.ants.length, this.world, this.species, pos));
    }
    while (this.ants.length > newCount) {
      this.ants.pop();
    }
    if (this.onColonyUpdate) this.onColonyUpdate();
  }

  reset(newState = {}) {
    this.species = getSpecies(newState.species || 'black_garden');
    this.world = new World(60, 60);
    this.antCount = newState.antCount || 27;
    this.water = newState.water !== undefined ? newState.water : 8;
    this.food = newState.food !== undefined ? newState.food : 12;
    this.brood = 6;
    this.resourceTimer = 0;
    this.broodTimer = 0;
    this.initAnts();
    if (this.onColonyUpdate) this.onColonyUpdate();
  }

  addFood(amount = 5) {
    this.food = Math.min(99, this.food + amount);
    this.world.addFood(amount);

    // Alert foragers and active ants to swarm up and gather food!
    let alerted = 0;
    for (const ant of this.ants) {
      if (!ant.isReplete && (ant.role === 'forager' || Math.random() < 0.65)) {
        ant.alertToFood();
        alerted++;
        if (alerted >= Math.max(6, amount * 2)) break;
      }
    }

    if (this.onColonyUpdate) this.onColonyUpdate();
  }

  addWater(amount = 5) {
    this.water = Math.min(99, this.water + amount);
    this.world.addWater(amount);

    // Alert ants to drink from the fresh moisture pool!
    let alerted = 0;
    for (const ant of this.ants) {
      if (!ant.isReplete && (ant.hydration < 0.75 || Math.random() < 0.45)) {
        ant.alertToWater();
        alerted++;
        if (alerted >= 8) break;
      }
    }

    if (this.onColonyUpdate) this.onColonyUpdate();
  }

  getColonyStatus() {
    if (this.food <= 2 && this.water <= 2) return 'Depleted';
    if (this.food <= 2) return 'Hungry';
    if (this.water <= 2) return 'Thirsty';
    if (this.food >= 15 && this.water >= 10) return 'Thriving';
    return 'Active';
  }

  update(dt) {
    const effectiveDt = dt * this.speedMultiplier;

    // Update physical world
    this.world.update(effectiveDt);

    // Update individual ants
    const colonyNeeds = { food: this.food, water: this.water };
    for (const ant of this.ants) {
      ant.update(effectiveDt, colonyNeeds);
    }

    // Social interaction: check for trophallaxis meetings
    this.checkTrophallaxis();

    // Natural resource consumption over time
    this.resourceTimer += effectiveDt;
    if (this.resourceTimer >= 20.0) { // Every 20 seconds at 1x speed
      this.resourceTimer = 0;
      if (this.food > 0) this.food = Math.max(0, this.food - 1);
      if (this.water > 0) this.water = Math.max(0, this.water - 1);
      if (this.onColonyUpdate) this.onColonyUpdate();
    }

    // Colony growth: eggs hatch when resources are healthy
    this.broodTimer += effectiveDt;
    if (this.broodTimer >= 45.0) { // Every 45s
      this.broodTimer = 0;
      if (this.food >= 6 && this.water >= 4 && this.ants.length < 60) {
        // Hatch a new worker!
        const newAnt = new Ant(this.ants.length, this.world, this.species, { x: 22, y: 34 });
        this.ants.push(newAnt);
        this.antCount = this.ants.length;
        if (this.onColonyUpdate) this.onColonyUpdate();
      }
    }
  }

  checkTrophallaxis() {
    // Only check every once in a while to keep performant
    if (Math.random() > 0.08) return;

    for (let i = 0; i < this.ants.length; i++) {
      const a = this.ants[i];
      if (a.state === ANT_STATE.TROPHALLAXIS || a.isReplete || a.y <= this.world.surfaceRow) continue;

      for (let j = i + 1; j < this.ants.length; j++) {
        const b = this.ants[j];
        if (b.state === ANT_STATE.TROPHALLAXIS || b.isReplete || b.y <= this.world.surfaceRow) continue;

        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 1.4) {
          // Trigger social trophallaxis interaction!
          a.state = ANT_STATE.TROPHALLAXIS;
          b.state = ANT_STATE.TROPHALLAXIS;
          a.timer = 1.0 + Math.random() * 1.5;
          b.timer = a.timer;
          a.partner = b;
          b.partner = a;
          break;
        }
      }
    }
  }

  getSnapshot() {
    return {
      species: this.species.id,
      antCount: this.antCount,
      water: this.water,
      food: this.food,
      dirtMound: this.world.dirtMoundCount
    };
  }
}
