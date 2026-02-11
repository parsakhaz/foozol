#!/usr/bin/env node
/**
 * Windows Build Script for Crystal
 *
 * This script handles the complexities of building Crystal on Windows,
 * particularly dealing with pnpm + node-gyp compatibility issues.
 *
 * Usage:
 *   node scripts/build-win.js [arch]
 *
 * Arguments:
 *   arch - Target architecture: 'x64', 'arm64', or 'both' (default: 'x64')
 *
 * What this script does:
 * 1. Patches winpty.gyp to fix batch file path issues on Windows
 * 2. Copies node-addon-api files to the expected pnpm location
 * 3. Builds frontend and main process
 * 4. Runs electron-builder with npmRebuild disabled (uses existing native modules)
 *
 * Known Issues & Workarounds:
 * - pnpm's nested node_modules structure causes node-gyp path resolution failures
 * - winpty build scripts use relative paths that don't work on Windows
 * - We skip npm rebuild and rely on the native modules built during `pnpm install`
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const NODE_MODULES = path.join(ROOT_DIR, 'node_modules');

// Parse command line arguments
const arch = process.argv[2] || 'x64';
if (!['x64', 'arm64', 'both'].includes(arch)) {
  console.error('Invalid architecture. Use: x64, arm64, or both');
  process.exit(1);
}

console.log(`\n🔨 Building Crystal for Windows ${arch}\n`);

/**
 * Execute a command and print output
 */
function run(cmd, options = {}) {
  console.log(`\n> ${cmd}\n`);
  try {
    execSync(cmd, {
      stdio: 'inherit',
      cwd: ROOT_DIR,
      shell: true,
      ...options
    });
  } catch (error) {
    if (!options.ignoreError) {
      console.error(`Command failed: ${cmd}`);
      process.exit(1);
    }
  }
}

/**
 * Patch winpty.gyp to fix batch file path issues
 *
 * The issue: winpty.gyp runs batch files like:
 *   cmd /c "cd shared && GetCommitHash.bat"
 *
 * On Windows, batch files need explicit .\ prefix to run from current directory.
 * This patches it to:
 *   cmd /c "cd shared && .\GetCommitHash.bat"
 */
function patchWinptyGyp() {
  console.log('📝 Patching winpty.gyp for Windows compatibility...');

  const winptyGypPath = path.join(
    NODE_MODULES,
    '.pnpm',
    '@homebridge+node-pty-prebuilt-multiarch@0.12.0',
    'node_modules',
    '@homebridge',
    'node-pty-prebuilt-multiarch',
    'deps',
    'winpty',
    'src',
    'winpty.gyp'
  );

  if (!fs.existsSync(winptyGypPath)) {
    console.log('  ⚠️  winpty.gyp not found, skipping patch');
    return;
  }

  let content = fs.readFileSync(winptyGypPath, 'utf8');
  let patched = false;

  // Patch GetCommitHash.bat call
  if (content.includes('cd shared && GetCommitHash.bat')) {
    content = content.replace(
      'cd shared && GetCommitHash.bat',
      'cd shared && .\\\\GetCommitHash.bat'
    );
    patched = true;
  }

  // Patch UpdateGenVersion.bat call
  if (content.includes('cd shared && UpdateGenVersion.bat')) {
    content = content.replace(
      'cd shared && UpdateGenVersion.bat',
      'cd shared && .\\\\UpdateGenVersion.bat'
    );
    patched = true;
  }

  if (patched) {
    fs.writeFileSync(winptyGypPath, content);
    console.log('  ✅ Patched winpty.gyp');
  } else {
    console.log('  ℹ️  winpty.gyp already patched or different version');
  }
}

/**
 * Copy node-addon-api to the location pnpm/node-gyp expects
 *
 * The issue: pnpm's nested structure puts node-addon-api in a different
 * location than node-gyp expects when resolving relative paths.
 */
function copyNodeAddonApi() {
  console.log('📦 Setting up node-addon-api for pnpm compatibility...');

  const sourceDir = path.join(
    NODE_MODULES,
    '.pnpm',
    'node-addon-api@7.1.1',
    'node_modules',
    'node-addon-api'
  );

  const targetDir = path.join(
    NODE_MODULES,
    '.pnpm',
    '@homebridge+node-pty-prebuilt-multiarch@0.12.0',
    'node-addon-api@7.1.1',
    'node_modules',
    'node-addon-api'
  );

  if (!fs.existsSync(sourceDir)) {
    console.log('  ⚠️  Source node-addon-api not found, skipping');
    return;
  }

  // Create target directory structure
  fs.mkdirSync(targetDir, { recursive: true });

  // Copy all files
  const files = fs.readdirSync(sourceDir);
  for (const file of files) {
    const srcPath = path.join(sourceDir, file);
    const destPath = path.join(targetDir, file);

    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      fs.cpSync(srcPath, destPath, { recursive: true });
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }

  console.log('  ✅ Copied node-addon-api files');
}

/**
 * Download Electron-compatible prebuilt for better-sqlite3-multiple-ciphers
 *
 * The issue: When using `pnpm install --ignore-scripts` or when prebuild-install
 * runs without knowing about Electron, the wrong binary (Node.js ABI) gets installed.
 * This causes "is not a valid Win32 application" errors at runtime.
 *
 * This function runs prebuild-install with the correct Electron runtime and version.
 */
function downloadBetterSqlitePrebuilt() {
  console.log('📥 Downloading Electron prebuilt for better-sqlite3-multiple-ciphers...');

  // Find the better-sqlite3-multiple-ciphers package directory
  const betterSqlitePattern = path.join(
    NODE_MODULES,
    '.pnpm',
    'better-sqlite3-multiple-ciphers@*'
  );

  // Use glob to find the actual versioned directory
  const { globSync } = require('glob');
  const matches = globSync(betterSqlitePattern.replace(/\\/g, '/'));

  if (matches.length === 0) {
    console.log('  ⚠️  better-sqlite3-multiple-ciphers not found, skipping');
    return;
  }

  const betterSqliteDir = path.join(
    matches[0],
    'node_modules',
    'better-sqlite3-multiple-ciphers'
  );

  if (!fs.existsSync(betterSqliteDir)) {
    console.log('  ⚠️  better-sqlite3-multiple-ciphers directory not found, skipping');
    return;
  }

  // Get Electron version from package.json
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  const electronVersion = packageJson.devDependencies?.electron?.replace('^', '') || '37.6.0';

  // Determine architecture
  const targetArch = arch === 'both' ? 'x64' : arch;

  console.log(`  📦 Electron version: ${electronVersion}, arch: ${targetArch}`);

  try {
    execSync(
      `npx prebuild-install --runtime electron --target ${electronVersion} --arch ${targetArch} --verbose`,
      {
        cwd: betterSqliteDir,
        stdio: 'inherit',
        shell: true
      }
    );
    console.log('  ✅ Downloaded Electron prebuilt for better-sqlite3');
  } catch (error) {
    console.error('  ❌ Failed to download prebuilt, will try to use existing binary');
    console.error(`     Error: ${error.message}`);
  }
}

/**
 * Main build process
 */
async function build() {
  console.log('🔧 Step 1: Applying Windows compatibility patches...\n');
  patchWinptyGyp();
  copyNodeAddonApi();
  downloadBetterSqlitePrebuilt();

  console.log('\n🔧 Step 2: Building frontend...\n');
  run('pnpm run build:frontend');

  console.log('\n🔧 Step 3: Building main process...\n');
  run('pnpm run build:main');

  console.log('\n🔧 Step 4: Injecting build info...\n');
  run('pnpm run inject-build-info');

  console.log('\n🔧 Step 5: Generating notices...\n');
  run('pnpm run generate-notices');

  console.log('\n🔧 Step 6: Running electron-builder...\n');

  // npmRebuild=false is required when cross-compiling from non-Windows hosts (node-gyp can't cross-compile).
  // When building ON Windows, better-sqlite3-multiple-ciphers ships Electron prebuilds so rebuild will work,
  // but node-pty still needs native compilation. The flag is safe because pnpm install already built the
  // native modules for the host platform.
  const archFlag = arch === 'both' ? '' : `--${arch}`;
  run(`pnpm exec electron-builder --win ${archFlag} --publish never --config.npmRebuild=false`);

  console.log('\n✅ Build complete!\n');
  console.log('Output files are in: dist-electron/');

  // List output files
  const distDir = path.join(ROOT_DIR, 'dist-electron');
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir).filter(f => f.endsWith('.exe'));
    console.log('\nGenerated installers:');
    for (const file of files) {
      const stat = fs.statSync(path.join(distDir, file));
      const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);
      console.log(`  📦 ${file} (${sizeMB} MB)`);
    }
  }
}

// Run the build
build().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});
