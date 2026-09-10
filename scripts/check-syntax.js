const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const filesToCheck = [
  'electron/main.js',
  'electron/preload.js',
  'electron/tray.js',
  'electron/store.js',
  'src/js/app.js',
  'src/js/settings.js',
  'src/js/audio/sound.js',
  'src/js/sim/simulation.js',
  'src/js/sim/world.js',
  'src/js/sim/ant.js',
  'src/js/sim/renderer.js',
  'src/js/sim/species.js'
];

console.log('🐜 Validating JavaScript syntax across project files...\n');

let passed = 0;
let failed = 0;

for (const relPath of filesToCheck) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`  ❌ Missing file: ${relPath}`);
    failed++;
    continue;
  }

  try {
    execSync(`"${process.execPath}" -c "${fullPath}"`, { stdio: 'pipe' });
    console.log(`  ✓ ${relPath}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ Syntax error in ${relPath}:\n`, err.stderr ? err.stderr.toString() : err.message);
    failed++;
  }
}

console.log('\n----------------------------------------');
if (failed === 0) {
  console.log(`🎉 All ${passed} JavaScript files validated cleanly!`);
  process.exit(0);
} else {
  console.error(`💥 Validation failed: ${failed} file(s) had issues.`);
  process.exit(1);
}
