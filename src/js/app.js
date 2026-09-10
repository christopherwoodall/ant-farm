import { ColonySimulation } from './sim/simulation.js';
import { AntFarmRenderer } from './sim/renderer.js';
import { SoundController } from './audio/sound.js';

async function init() {
  try {
    const canvas = document.getElementById('farm-canvas');
    const card = document.getElementById('farm-card');
    const colonyTitle = document.getElementById('colony-title');
    const speciesTag = document.getElementById('species-tag');
    const statAnts = document.getElementById('stat-ants');
    const statWater = document.getElementById('stat-water');
    const statFood = document.getElementById('stat-food');
    const statusBadge = document.getElementById('status-badge');
    const btnWater = document.getElementById('btn-water');
    const btnFood = document.getElementById('btn-food');
    const btnSettings = document.getElementById('btn-settings');
    const btnClose = document.getElementById('btn-close');
    const viewport = document.getElementById('viewport-wrapper');

    // Load config & colony state from Electron main process
    let config = {};
    let colonyState = {};
    if (window.antFarmAPI) {
      config = await window.antFarmAPI.getConfig();
      colonyState = await window.antFarmAPI.getColonyState();
    }

    // Audio controller
    const sound = new SoundController();
    sound.enabled = config.soundEnabled !== false;

  // Initialize simulation and renderer
  const simulation = new ColonySimulation(colonyState, config);
  const renderer = new AntFarmRenderer(canvas);

  function applyConfig(newConfig) {
    config = { ...config, ...newConfig };
    sound.enabled = config.soundEnabled !== false;
    simulation.speedMultiplier = config.simSpeed || 1.0;

    if (config.colonyName && colonyTitle) {
      colonyTitle.textContent = config.colonyName;
    }

    if (config.antCount !== undefined && config.antCount !== simulation.antCount) {
      simulation.setAntCount(config.antCount);
    }

    if (config.species && config.species !== simulation.species.id) {
      simulation.setSpecies(config.species);
    }

    if (config.windowMode === 'float') {
      card.classList.add('floating');
    } else {
      card.classList.remove('floating');
    }

    updateUI();
  }

  function updateUI() {
    speciesTag.textContent = `${simulation.species.name} (${simulation.species.scientific})`;
    statAnts.textContent = simulation.antCount;
    statWater.textContent = simulation.water;
    statFood.textContent = simulation.food;

    // Update status badge
    const status = simulation.getColonyStatus();
    statusBadge.textContent = status;
    statusBadge.className = 'colony-badge';

    switch (status) {
      case 'Thriving':
        statusBadge.classList.add('badge-thriving');
        break;
      case 'Hungry':
        statusBadge.classList.add('badge-hungry');
        break;
      case 'Thirsty':
        statusBadge.classList.add('badge-thirsty');
        break;
      default:
        statusBadge.classList.add('badge-active');
        break;
    }
  }

  simulation.onColonyUpdate = () => {
    updateUI();
    saveColony();
  };

  function showToast(text, x, y) {
    const toast = document.createElement('div');
    toast.className = 'float-toast';
    toast.textContent = text;
    toast.style.left = `${x}px`;
    toast.style.top = `${y}px`;
    card.appendChild(toast);
    setTimeout(() => toast.remove(), 800);
  }

  // Action: Add Water
  btnWater.addEventListener('click', (e) => {
    simulation.addWater(5);
    sound.playWaterDrop();
    const rect = btnWater.getBoundingClientRect();
    showToast('+5 Water', rect.left - 10, rect.top - 15);
    saveColony();
  });

  // Action: Add Food
  btnFood.addEventListener('click', (e) => {
    simulation.addFood(5);
    sound.playFoodDrop();
    const rect = btnFood.getBoundingClientRect();
    showToast('+5 Food', rect.left - 10, rect.top - 15);
    saveColony();
  });

  // Mouse Wheel Zoom
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.2 : 0.83;
    renderer.setZoom(renderer.zoom * factor);
    viewport.style.cursor = renderer.zoom > 1.0 ? 'grab' : 'pointer';
  }, { passive: false });

  // Double click resets zoom
  viewport.addEventListener('dblclick', (e) => {
    e.preventDefault();
    renderer.setZoom(1.0);
    viewport.style.cursor = 'pointer';
  });

  // Pan dragging when zoomed in, and tap on glass when clicked
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let totalDragDist = 0;
  let mouseDownInViewport = false;

  viewport.addEventListener('mousedown', (e) => {
    isPanning = true;
    mouseDownInViewport = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    totalDragDist = 0;
    if (renderer.zoom > 1.0) {
      viewport.style.cursor = 'grabbing';
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    const dx = e.clientX - panStartX;
    const dy = e.clientY - panStartY;
    totalDragDist += Math.hypot(dx, dy);

    if (totalDragDist > 6 && renderer.zoom > 1.0) {
      const rect = viewport.getBoundingClientRect();
      const scaleFactor = renderer.width / Math.max(1, rect.width);
      renderer.pan(dx * scaleFactor, dy * scaleFactor);
    }
    panStartX = e.clientX;
    panStartY = e.clientY;
  });

  window.addEventListener('mouseup', (e) => {
    if (!isPanning) return;
    isPanning = false;
    viewport.style.cursor = renderer.zoom > 1.0 ? 'grab' : 'pointer';

    // If mouse moved less than 8px total, it's an intentional tap on the glass!
    if (mouseDownInViewport && totalDragDist < 8) {
      mouseDownInViewport = false;
      sound.playDig();
      const rect = viewport.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const clickY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

      const screenX = (clickX / rect.width) * renderer.width;
      const screenY = (clickY / rect.height) * renderer.height;
      const worldPos = renderer.screenToWorld(screenX, screenY, simulation.world);

      // Add visual acoustic ripples
      renderer.addRipple(worldPos.c, worldPos.r);

      // 1. Ants close to tap receive a strong directional outward shockwave
      // 2. Global acoustic vibration alerts and unsticks ALL ants across the entire farm!
      for (const ant of simulation.ants) {
        const dx = ant.x - worldPos.c;
        const dy = ant.y - worldPos.r;
        const dist = Math.hypot(dx, dy);

        if (dist < 4.0) {
          // Direct tap on/near ant: emergency unstick and sprint!
          ant.unstick();
          const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.5;
          ant.nudge(angle, 3.5);
        } else if (dist < 28) {
          // Direct shockwave impulse
          const pushForce = Math.max(1.2, (1.0 - dist / 28) * 3.2);
          const pushAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.4;
          ant.nudge(pushAngle, pushForce);
        } else {
          // Ambient vibration across the whole glass enclosure
          const scrambleAngle = Math.random() * Math.PI * 2;
          ant.nudge(scrambleAngle, 0.7);
        }
      }
    } else {
      mouseDownInViewport = false;
    }
  });

  // Settings & Close controls
  btnSettings.addEventListener('click', () => {
    if (window.antFarmAPI) window.antFarmAPI.openSettings();
  });

  btnClose.addEventListener('click', () => {
    if (window.antFarmAPI) window.antFarmAPI.closeWindow();
  });

  // IPC Listeners
  if (window.antFarmAPI) {
    window.antFarmAPI.onWaterTriggered((amount) => {
      simulation.addWater(amount);
      sound.playWaterDrop();
      saveColony();
    });

    window.antFarmAPI.onFoodTriggered((amount) => {
      simulation.addFood(amount);
      sound.playFoodDrop();
      saveColony();
    });

    window.antFarmAPI.onConfigChanged((newConfig) => {
      applyConfig(newConfig);
    });

    window.antFarmAPI.onResetColony((state) => {
      simulation.reset(state || {});
      updateUI();
      saveColony();
    });
  }

  // Periodic colony save
  function saveColony() {
    if (window.antFarmAPI) {
      window.antFarmAPI.saveColonyState(simulation.getSnapshot());
    }
  }
  setInterval(saveColony, 10000);

  // Frameless Window Drag-to-Resize without window chrome
  const resizeHandle = document.getElementById('resize-handle');
  let isResizing = false;
  let resizeStartScreenX = 0;
  let resizeStartScreenY = 0;
  let resizeStartWidth = 0;
  let resizeStartHeight = 0;

  if (resizeHandle && window.antFarmAPI) {
    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing = true;
      resizeStartScreenX = e.screenX;
      resizeStartScreenY = e.screenY;
      resizeStartWidth = window.outerWidth || window.innerWidth;
      resizeStartHeight = window.outerHeight || window.innerHeight;
      document.body.style.cursor = 'nwse-resize';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      e.preventDefault();
      const deltaX = e.screenX - resizeStartScreenX;
      const deltaY = e.screenY - resizeStartScreenY;
      const targetWidth = Math.max(320, Math.min(850, resizeStartWidth + deltaX));
      const targetHeight = Math.max(140, Math.min(450, resizeStartHeight + deltaY));
      window.antFarmAPI.resizeWindow(targetWidth, targetHeight);
    });

    window.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
      }
    });
  }

  // Handle canvas resolution dynamically when resized
  function updateCanvasResolution() {
    const rect = viewport.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        renderer.resize(targetW, targetH);
      }
    }
  }
  window.addEventListener('resize', updateCanvasResolution);
  setTimeout(updateCanvasResolution, 100);

  // Apply initial config
  applyConfig(config);

  // Animation Loop
  let lastTime = performance.now();
  function loop(currentTime) {
    try {
      const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      simulation.update(dt);
      renderer.render(simulation, dt);
    } catch (renderErr) {
      console.error('Error in render/simulation loop:', renderErr);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  } catch (err) {
    console.error('Initialization error in app.js:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
