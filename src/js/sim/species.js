export const SPECIES = {
  black_garden: {
    id: 'black_garden',
    name: 'Black Garden Ant',
    scientific: 'Lasius niger',
    color: '#1e293b',
    abdomenColor: '#0f172a',
    highlightColor: '#475569',
    scale: 1.0,
    digSpeed: 1.0,
    forageSpeed: 1.0,
    waterEfficiency: 1.0,
    foodEfficiency: 1.0,
    description: 'Hardy, resilient generalists. Steady excavators and cooperative foragers.',
    specialFeature: 'Trophallaxis mastery'
  },
  harvester: {
    id: 'harvester',
    name: 'Red Harvester Ant',
    scientific: 'Pogonomyrmex barbatus',
    color: '#b91c1c',
    abdomenColor: '#7f1d1d',
    highlightColor: '#f87171',
    scale: 1.1,
    digSpeed: 0.9,
    forageSpeed: 1.35,
    waterEfficiency: 1.2,
    foodEfficiency: 0.9,
    description: 'Powerful seed gatherers with large heads and crushing mandibles.',
    specialFeature: 'Granary storage focus'
  },
  carpenter: {
    id: 'carpenter',
    name: 'Carpenter Ant',
    scientific: 'Camponotus pennsylvanicus',
    color: '#18181b',
    abdomenColor: '#27272a',
    highlightColor: '#52525b',
    scale: 1.28,
    digSpeed: 1.3,
    forageSpeed: 0.85,
    waterEfficiency: 0.9,
    foodEfficiency: 1.2,
    description: 'Massive workers with high physical endurance and rapid gallery carving.',
    specialFeature: 'High structural excavation'
  },
  honeypot: {
    id: 'honeypot',
    name: 'Honeypot Ant',
    scientific: 'Myrmecocystus mexicanus',
    color: '#d97706',
    abdomenColor: '#f59e0b',
    highlightColor: '#fde68a',
    scale: 1.05,
    digSpeed: 0.85,
    forageSpeed: 1.15,
    waterEfficiency: 1.4,
    foodEfficiency: 1.3,
    description: 'Arid climate specialists. Repletes store golden nectar in swollen abdomens.',
    specialFeature: 'Replete nectar reservoirs'
  }
};

export function getSpecies(id) {
  return SPECIES[id] || SPECIES.black_garden;
}
