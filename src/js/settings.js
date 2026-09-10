import { SPECIES, getSpecies } from './sim/species.js';

document.addEventListener('DOMContentLoaded', async () => {
  const speciesSelect = document.getElementById('species-select');
  const previewName = document.getElementById('preview-species-name');
  const previewDesc = document.getElementById('preview-species-desc');
  const previewTrait = document.getElementById('preview-species-trait');

  const colonyNameInput = document.getElementById('colony-name-input');
  const antCountRange = document.getElementById('ant-count-range');
  const antCountVal = document.getElementById('ant-count-val');

  const windowModeSelect = document.getElementById('window-mode-select');
  const windowScaleSelect = document.getElementById('window-scale-select');
  const opacityRange = document.getElementById('opacity-range');
  const opacityVal = document.getElementById('opacity-val');
  const alwaysOnTopCheck = document.getElementById('always-on-top-check');

  const soundCheck = document.getElementById('sound-check');
  const speedSelect = document.getElementById('speed-select');

  const btnResetColony = document.getElementById('btn-reset-colony');
  const btnSave = document.getElementById('btn-save');

  if (!window.antFarmAPI) return;

  const config = await window.antFarmAPI.getConfig();
  const colony = await window.antFarmAPI.getColonyState();

  const PRESETS = {
    compact: { width: 340, height: 150 },
    standard: { width: 400, height: 180 },
    large: { width: 480, height: 215 }
  };

  // Populate form values
  colonyNameInput.value = config.colonyName || colony.colonyName || 'Ant Farm';
  antCountRange.value = colony.antCount || config.antCount || 27;
  antCountVal.textContent = antCountRange.value;

  antCountRange.addEventListener('input', () => {
    antCountVal.textContent = antCountRange.value;
  });

  speciesSelect.value = config.species || 'black_garden';
  windowModeSelect.value = config.windowMode || 'docked';

  const currentW = config.customWidth;
  const currentH = config.customHeight;
  if (!currentW || (currentW === 400 && currentH === 180)) {
    windowScaleSelect.value = 'standard';
  } else if (currentW === 340 && currentH === 150) {
    windowScaleSelect.value = 'compact';
  } else if (currentW === 480 && currentH === 215) {
    windowScaleSelect.value = 'large';
  } else if (windowScaleSelect.querySelector('option[value="custom"]')) {
    windowScaleSelect.value = 'custom';
  } else {
    windowScaleSelect.value = config.windowScale || 'standard';
  }

  windowScaleSelect.addEventListener('change', async () => {
    const val = windowScaleSelect.value;
    if (PRESETS[val]) {
      const p = PRESETS[val];
      await window.antFarmAPI.resizeWindow(p.width, p.height);
      await window.antFarmAPI.saveConfig({ windowScale: val, customWidth: p.width, customHeight: p.height });
    }
  });
  opacityRange.value = config.opacity !== undefined ? config.opacity : 95;
  opacityVal.textContent = `${opacityRange.value}%`;
  alwaysOnTopCheck.checked = config.alwaysOnTop !== false;
  soundCheck.checked = config.soundEnabled !== false;
  const currentSpeed = parseFloat(config.simSpeed) || 1.0;
  for (const opt of speedSelect.options) {
    if (Math.abs(parseFloat(opt.value) - currentSpeed) < 0.05) {
      speedSelect.value = opt.value;
      break;
    }
  }

  function updateSpeciesPreview() {
    const sp = getSpecies(speciesSelect.value);
    previewName.textContent = `${sp.name} (${sp.scientific})`;
    previewDesc.textContent = sp.description;
    previewTrait.textContent = `Special trait: ${sp.specialFeature}`;
  }

  speciesSelect.addEventListener('change', updateSpeciesPreview);
  updateSpeciesPreview();

  opacityRange.addEventListener('input', () => {
    opacityVal.textContent = `${opacityRange.value}%`;
    // Live update opacity
    window.antFarmAPI.saveConfig({ opacity: parseInt(opacityRange.value, 10) });
  });

  alwaysOnTopCheck.addEventListener('change', () => {
    window.antFarmAPI.saveConfig({ alwaysOnTop: alwaysOnTopCheck.checked });
  });

  windowModeSelect.addEventListener('change', () => {
    window.antFarmAPI.setWindowMode(windowModeSelect.value);
  });

  btnSave.addEventListener('click', async () => {
    const newAntCount = parseInt(antCountRange.value, 10);
    const colonyName = colonyNameInput.value.trim() || 'Ant Farm';
    const updated = {
      colonyName,
      antCount: newAntCount,
      species: speciesSelect.value,
      windowMode: windowModeSelect.value,
      windowScale: windowScaleSelect.value,
      opacity: parseInt(opacityRange.value, 10),
      alwaysOnTop: alwaysOnTopCheck.checked,
      soundEnabled: soundCheck.checked,
      simSpeed: parseFloat(speedSelect.value)
    };

    if (PRESETS[windowScaleSelect.value]) {
      const p = PRESETS[windowScaleSelect.value];
      updated.customWidth = p.width;
      updated.customHeight = p.height;
      await window.antFarmAPI.resizeWindow(p.width, p.height);
    }

    await window.antFarmAPI.saveConfig(updated);
    await window.antFarmAPI.saveColonyState({
      colonyName,
      species: updated.species,
      antCount: newAntCount
    });

    const originalText = btnSave.textContent;
    btnSave.textContent = '✓ Saved!';
    btnSave.style.backgroundColor = '#10b981';
    setTimeout(() => {
      btnSave.textContent = originalText;
      btnSave.style.backgroundColor = '';
    }, 1500);
  });

  btnResetColony.addEventListener('click', async () => {
    const confirmReset = window.confirm('Are you sure you want to reset the ant colony and start fresh?');
    if (confirmReset) {
      const sp = speciesSelect.value;
      await window.antFarmAPI.saveConfig({ species: sp, antCount: 27 });
      await window.antFarmAPI.resetColony(sp);

      antCountRange.value = 27;
      antCountVal.textContent = '27';
      colonyNameInput.value = 'Ant Farm';

      btnResetColony.textContent = '✓ Colony Reset';
      btnResetColony.style.backgroundColor = '#16a34a';
      setTimeout(() => {
        btnResetColony.textContent = 'Reset Colony';
        btnResetColony.style.backgroundColor = '';
      }, 1500);
    }
  });
});
