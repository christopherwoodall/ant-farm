const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULT_CONFIG = {
  colonyName: 'Ant Farm',
  windowMode: 'docked', // 'docked' or 'float'
  windowX: null,
  windowY: null,
  windowScale: 'standard', // 'compact', 'standard', 'large'
  opacity: 95, // 50 to 100
  alwaysOnTop: true,
  soundEnabled: true,
  species: 'black_garden', // 'black_garden', 'harvester', 'carpenter', 'honeypot'
  simSpeed: 1.0,
  notificationsEnabled: true
};

const DEFAULT_COLONY = {
  version: 1,
  colonyName: 'Ant Farm',
  species: 'black_garden',
  antCount: 27,
  water: 8,
  food: 12,
  dirtMound: 0,
  lastUpdated: Date.now(),
  tunnels: [] // serializable excavated blocks
};

class Store {
  constructor() {
    this.userDataPath = app.getPath('userData');
    this.configFile = path.join(this.userDataPath, 'config.json');
    this.colonyFile = path.join(this.userDataPath, 'colony.json');
    this.config = this.loadConfig();
    this.colony = this.loadColony();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const raw = fs.readFileSync(this.configFile, 'utf8');
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      }
    } catch (err) {
      console.warn('Failed to load config, using defaults:', err);
    }
    return { ...DEFAULT_CONFIG };
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save config:', err);
    }
    return this.config;
  }

  loadColony() {
    try {
      if (fs.existsSync(this.colonyFile)) {
        const raw = fs.readFileSync(this.colonyFile, 'utf8');
        return { ...DEFAULT_COLONY, ...JSON.parse(raw) };
      }
    } catch (err) {
      console.warn('Failed to load colony, using defaults:', err);
    }
    return { ...DEFAULT_COLONY };
  }

  saveColony(state) {
    this.colony = { ...this.colony, ...state, lastUpdated: Date.now() };
    try {
      fs.writeFileSync(this.colonyFile, JSON.stringify(this.colony, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save colony state:', err);
    }
    return this.colony;
  }

  resetColony(species) {
    this.colony = {
      ...DEFAULT_COLONY,
      species: species || this.config.species || 'black_garden',
      lastUpdated: Date.now()
    };
    this.saveColony(this.colony);
    return this.colony;
  }
}

module.exports = Store;
