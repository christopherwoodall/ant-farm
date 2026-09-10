# Ant Farm 🐜

A native cross-platform desktop ant farm companion and simulation built with Electron and HTML5 Canvas. The app lives in your system tray (notification area) and displays a sleek, floating glassmorphic widget on your desktop inspired by classic ant farms and virtual pets (Tamagotchi).

---

## Features

- **System Tray / Notification Area Integration**:
  - **Left-Click Tray Icon**: Smoothly toggle the ant farm window between visible and hidden.
  - **Right-Click Context Menu**:
    - **Window Location**:
      - `Docked (Bottom-Right)`: Automatically docks above your taskbar in the bottom-right corner.
      - `Float (Draggable)`: Detach the widget and freely drag it anywhere on your desktop. Remembers your chosen position.
      - `Reset Position`: Instantly returns the widget to the default docked location.
    - `Always on Top`: Toggle whether the farm stays above other application windows.
    - `Quick Water (+5)` & `Quick Food (+5)`: Feed or hydrate your colony directly from the tray without opening settings.
    - `Settings...`: Open the configuration dialog.
    - `Quit Ant Farm`: Exit the application.

- **Interactive Viewport & Window Controls**:
  - **Click-and-Drag Window Resize (No Chrome)**: Grab the corner grip at the bottom-right of the widget card to smoothly resize the window to any custom dimension. The ant farm viewport and canvas dynamically scale to fill the new size!
  - **Scroll Wheel Zoom**: Zoom in up to 4.5x or zoom out directly over the viewport. A dynamic zoom badge indicates current magnification.
  - **Pan Dragging**: When zoomed in, click and drag the soil cross-section to inspect individual chambers, the queen, and worker legs up close.
  - **Double-Click**: Instantly resets zoom to default 1.0x view.
  - **Glass Knock & Nudge**: Clicking the glass produces an acoustic ripple shockwave that physically knocks and nudges nearby ants along the tunnels, freeing any ant that might be stuck or hesitant!
  - **Autonomous Anti-Stuck Watchdog**: Built-in obstacle avoidance that detects if an ant is blocked for >1.2s and smoothly routes it back into open tunnel corridors.

- **Active Foraging & Colony Behaviors**:
  - **Active Feeding Rush**: Clicking **🌾 Food** triggers an alarm pheromone across the colony. Forager ants immediately turn around, scramble up the winding tunnels to the surface, locate seeds/crumbs, grab them in their mandibles, and carry them down to the central granary!
  - **Active Hydration Rush**: Clicking **💧 Water** creates a rain splash into the subterranean aquifer. Ants hurry through the tunnels to drink from the pool and rehydrate the brood.
  - **Excavation**: Worker ants dig away solid soil blocks to expand new tunnels, pick up dirt pellets, carry them to the surface, and build up the entrance mound.

- **Multiple Ant Species**:
  - **Black Garden Ant (*Lasius niger*)**: Hardy generalists, balanced diggers, high resilience.
  - **Red Harvester Ant (*Pogonomyrmex barbatus*)**: Specialized seed collectors with enlarged crushing mandibles.
  - **Carpenter Ant (*Camponotus pennsylvanicus*)**: Massive excavators capable of carving vast galleries.
  - **Honeypot Ant (*Myrmecocystus mexicanus*)**: Features specialized "replete" ants with swollen translucent amber abdomens acting as living nectar storage vats.

- **Tamagotchi-Style Colony Care**:
  - Colony needs (Food and Water) decay over time.
  - Plentiful food and water trigger the queen to lay eggs, which hatch into new worker ants.
  - Colony health statuses: *Thriving*, *Active*, *Hungry*, *Thirsty*, *Depleted*.
  - Persistent state (`colony.json`) ensures your colony survives across launches.

- **Responsive Layout & Streamlined Controls**:
  - **Fluid Container-Aware Layout**: Built with CSS Container Queries (`@container`) and flexible layouts so the card adapts smoothly across different window dimensions without clipping or awkward whitespace.
  - **Integrated Action Buttons Under Stats**: Quick action buttons (**💧 Water** and **🌾 Food**) are positioned side-by-side directly beneath the live colony statistics panel for fast, ergonomic feeding and hydration.
  - **Dynamic Density Scaling**: In narrower sizes, stat labels cleanly condense to icons + values (`🐜 27 | 💧 8 | 🟡 12`) to preserve clean proportions.

- **Customization & Settings**:
  - **Customizable Ant Population**: Slider to adjust live colony size from 5 up to 80 ants anytime.
  - **Interactive Window Resizing**: Click-and-drag corner handle to resize the frameless window freely to any custom dimension, with a "Reset Size (400 × 180)" shortcut in Settings.
  - **Window opacity slider**: (50% to 100%).
  - **Simulation speed**: (0.5x, 1x, 2x, 5x).
  - **Procedural Web Audio effects**: (water drops, seed crunching, soil digging) with mute toggle.

---

## Build & Automation

Ant Farm includes both a cross-platform **`Makefile`** (for macOS, Linux, and Windows with GNU make) and a native **`build.ps1`** PowerShell script (for Windows).

> **Note**: Running either `make` or `.\build.ps1` with **no arguments** prints the complete interactive help menu and available targets.

### Using `build.ps1` (Windows PowerShell)

```powershell
# Display help and usage (default)
.\build.ps1

# Setup: install dependencies locally into node_modules
.\build.ps1 setup

# Run: launch desktop companion
.\build.ps1 run

# Check: validate JavaScript syntax across all source files
.\build.ps1 check

# Build standalone executables:
.\build.ps1 build-win      # Standalone Windows x64 app (into dist/)
.\build.ps1 build-mac      # Standalone macOS app (Universal x64 & arm64)
.\build.ps1 build-linux    # Standalone Linux x64 app
.\build.ps1 build-all      # Build for all three OS platforms

# Clean build artifacts:
.\build.ps1 clean          # Remove dist/
.\build.ps1 clean-all      # Remove dist/ and node_modules/
```

### Using `Makefile` (Cross-Platform)

```bash
# Display help and usage (default)
make

# Setup: download dependencies into node_modules
make setup

# Run: launch desktop companion
make run

# Check: validate JavaScript syntax
make check

# Build standalone executables:
make build-win            # Package Windows x64 binary
make build-mac            # Package macOS Universal binary
make build-linux          # Package Linux x64 binary
make build-all            # Package for all OS platforms

# Clean build artifacts:
make clean                # Remove dist/
make clean-all            # Remove dist/ and node_modules/
```

---

## Quick Start (No Build Needed)

No system-wide packages or administrator privileges are required. All dependencies are stored locally in the project folder.

- **Windows Batch**: Double-click **`run.bat`**
- **PowerShell**: `.\run.ps1` or `.\build.ps1 run`
- **Make**: `make run`
- **npm**: `npm start`

---

## Project Structure

```
ant-farm/
├── run.bat                     # Windows batch launcher
├── run.ps1                     # PowerShell launcher
├── package.json                # Project dependencies & scripts
├── GAME.md                     # Architecture, UX mechanics & DLC/plugin guide
├── electron/
│   ├── main.js                 # Electron main process & window management
│   ├── preload.js              # Context bridge for secure IPC
│   ├── tray.js                 # Tray icon, context menus, and docking logic
│   └── store.js                # Persistent settings and colony state
├── src/
│   ├── index.html              # Main ant farm glassmorphic desktop card
│   ├── settings.html           # Settings dialog
│   ├── css/
│   │   ├── widget.css          # Dark glassmorphic styling
│   │   └── settings.css        # Settings modal styling
│   ├── js/
│   │   ├── app.js              # Widget UI controller & IPC bindings
│   │   ├── settings.js         # Settings controller & species preview
│   │   ├── sim/
│   │   │   ├── ant.js          # 6-legged tripod gait kinematics & state machine
│   │   │   ├── world.js        # 2D soil grid, fluid dynamics & excavation
│   │   │   ├── species.js      # Species definitions & biological parameters
│   │   │   ├── simulation.js   # Colony lifecycle, resources & reproduction
│   │   │   └── renderer.js     # HTML5 Canvas 2D renderer & particle FX
│   │   └── audio/
│   │       └── sound.js        # Procedural Web Audio sound effects
│   └── assets/
│       └── icons/              # Tray icon & application icon
```
