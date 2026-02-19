#!/usr/bin/env node
/**
 * smart-dev.js - Intelligent development server launcher for foozol
 *
 * Features:
 * - Auto-detects git worktrees vs main repo
 * - Assigns unique ports per worktree (no conflicts)
 * - Checks for port availability
 * - Works on Windows, macOS, and Linux
 * - Handles dependency and build state detection
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const crypto = require('crypto');

// Configuration
const BASE_PORT = 4500;
const PORT_RANGE = 1000;

// Colors for console output (works on Windows too)
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(type, message) {
  const prefix = {
    info: `${colors.blue}[INFO]${colors.reset}`,
    ok: `${colors.green}[OK]${colors.reset}`,
    warn: `${colors.yellow}[WARN]${colors.reset}`,
    error: `${colors.red}[ERROR]${colors.reset}`,
  };
  console.log(`${prefix[type] || ''} ${message}`);
}

//------------------------------------------------------------------------------
// Git Worktree Detection
//------------------------------------------------------------------------------

function findGitRoot(dir) {
  const gitPath = path.join(dir, '.git');

  if (fs.existsSync(gitPath)) {
    return dir;
  }

  const parent = path.dirname(dir);
  if (parent === dir) {
    return null; // Reached filesystem root
  }

  return findGitRoot(parent);
}

function getWorktreeInfo(projectRoot) {
  const gitPath = path.join(projectRoot, '.git');

  if (!fs.existsSync(gitPath)) {
    return { isWorktree: false, name: 'unknown', mainRepo: projectRoot };
  }

  const stat = fs.statSync(gitPath);

  if (stat.isFile()) {
    // This is a worktree - .git is a file pointing to the main repo
    const content = fs.readFileSync(gitPath, 'utf8').trim();
    const match = content.match(/gitdir:\s*(.+)/);

    if (match) {
      // Extract main repo path from: gitdir: /path/to/main/.git/worktrees/name
      const gitDir = match[1];
      const mainRepo = gitDir.replace(/[/\\]\.git[/\\]worktrees[/\\].+$/, '');
      const name = path.basename(projectRoot);

      return { isWorktree: true, name, mainRepo };
    }
  }

  // Regular repo (not a worktree)
  return { isWorktree: false, name: 'main', mainRepo: projectRoot };
}

//------------------------------------------------------------------------------
// Port Management
//------------------------------------------------------------------------------

function calculatePort(dirPath) {
  // Create a hash of the directory path
  const hash = crypto.createHash('md5').update(dirPath).digest('hex');
  // Convert first 8 hex chars to number and mod by range
  const hashNum = parseInt(hash.substring(0, 8), 16);
  const portOffset = hashNum % PORT_RANGE;

  return BASE_PORT + portOffset;
}

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false); // Port in use
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true); // Port available
    });

    server.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(startPort) {
  let port = startPort;
  const maxAttempts = 100;

  for (let i = 0; i < maxAttempts; i++) {
    if (await checkPort(port)) {
      return port;
    }
    port++;
  }

  throw new Error(`Could not find available port after ${maxAttempts} attempts`);
}

//------------------------------------------------------------------------------
// Build Detection
//------------------------------------------------------------------------------

function needsMainBuild(projectRoot) {
  const distIndex = path.join(projectRoot, 'main', 'dist', 'main', 'src', 'index.js');

  if (!fs.existsSync(distIndex)) {
    return true;
  }

  // Check if any source file is newer than the build
  const srcDir = path.join(projectRoot, 'main', 'src');
  if (!fs.existsSync(srcDir)) {
    return false;
  }

  const distStat = fs.statSync(distIndex);
  const distTime = distStat.mtimeMs;

  function checkNewer(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (checkNewer(fullPath)) return true;
      } else if (entry.name.endsWith('.ts')) {
        const srcStat = fs.statSync(fullPath);
        if (srcStat.mtimeMs > distTime) {
          return true;
        }
      }
    }
    return false;
  }

  return checkNewer(srcDir);
}

function needsInstall(projectRoot) {
  const nodeModules = path.join(projectRoot, 'node_modules');

  if (!fs.existsSync(nodeModules)) {
    return true;
  }

  const packageJson = path.join(projectRoot, 'package.json');
  const lockFile = path.join(projectRoot, 'pnpm-lock.yaml');

  if (!fs.existsSync(packageJson)) {
    return false;
  }

  const nodeModulesTime = fs.statSync(nodeModules).mtimeMs;
  const packageJsonTime = fs.statSync(packageJson).mtimeMs;

  if (packageJsonTime > nodeModulesTime) {
    return true;
  }

  if (fs.existsSync(lockFile)) {
    const lockTime = fs.statSync(lockFile).mtimeMs;
    if (lockTime > nodeModulesTime) {
      return true;
    }
  }

  return false;
}

//------------------------------------------------------------------------------
// Process Runner
//------------------------------------------------------------------------------

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options,
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

function runConcurrently(projectRoot, port) {
  const isWindows = process.platform === 'win32';
  const npx = isWindows ? 'npx.cmd' : 'npx';
  const pnpm = isWindows ? 'pnpm.cmd' : 'pnpm';
  const electron = isWindows ? 'electron.cmd' : 'electron';

  // Build the concurrently command
  const commands = [
    `"${pnpm} run --filter main dev"`,
    `"${pnpm} run --filter frontend dev -- --port ${port}"`,
    `"${npx} wait-on http://localhost:${port} && ${electron} ."`,
  ];

  const args = [
    'concurrently',
    '--names', 'main,frontend,electron',
    '--prefix-colors', 'cyan,magenta,yellow',
    '--kill-others',
    ...commands,
  ];

  const proc = spawn(npx, args, {
    stdio: 'inherit',
    shell: true,
    cwd: projectRoot,
    env: {
      ...process.env,
      VITE_DEV_SERVER_PORT: String(port),
    },
  });

  proc.on('error', (err) => {
    log('error', `Failed to start: ${err.message}`);
    process.exit(1);
  });

  // Track if we're already cleaning up to prevent double-cleanup
  let isCleaningUp = false;

  function cleanup(signal) {
    if (isCleaningUp) return;
    isCleaningUp = true;

    console.log(''); // New line after ^C
    log('info', 'Shutting down...');

    if (isWindows) {
      // Windows: Use taskkill to kill the process tree
      try {
        execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
      } catch (e) {
        // Process may already be dead, that's fine
      }
    } else {
      // Unix: Send SIGTERM to process group
      try {
        process.kill(-proc.pid, 'SIGTERM');
      } catch (e) {
        // Try killing just the process
        proc.kill('SIGTERM');
      }
    }

    // Force exit after timeout if processes don't terminate
    setTimeout(() => {
      log('warn', 'Force killing remaining processes...');
      if (isWindows) {
        try {
          execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
        } catch (e) {
          // Ignore
        }
      } else {
        try {
          process.kill(-proc.pid, 'SIGKILL');
        } catch (e) {
          proc.kill('SIGKILL');
        }
      }
      process.exit(0);
    }, 3000);
  }

  // Handle Ctrl+C (works on Windows via 'SIGINT' event in Node)
  process.on('SIGINT', () => cleanup('SIGINT'));
  process.on('SIGTERM', () => cleanup('SIGTERM'));

  // Windows: Handle console close event
  if (isWindows) {
    process.on('SIGHUP', () => cleanup('SIGHUP'));
  }

  // Clean exit when child process ends
  proc.on('close', (code) => {
    if (!isCleaningUp) {
      process.exit(code || 0);
    }
  });
}

//------------------------------------------------------------------------------
// Main
//------------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let forcePort = null;
  let skipBuild = false;
  let forceBuild = false;
  let setupMode = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      forcePort = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--no-build') {
      skipBuild = true;
    } else if (args[i] === '--build') {
      forceBuild = true;
    } else if (args[i] === '--setup') {
      setupMode = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
foozol smart-dev - Intelligent development server

Usage: node scripts/smart-dev.js [options]

Options:
  --port PORT    Override the auto-generated port
  --build        Force rebuild main process
  --no-build     Skip main process build
  --setup        Run initial setup (install + build)
  --help         Show this help

The script automatically:
  - Detects if running from a worktree
  - Assigns a unique port per worktree
  - Builds main process if needed
  - Starts the Electron dev environment
`);
      process.exit(0);
    }
  }

  // Find project root
  const cwd = process.cwd();
  const projectRoot = findGitRoot(cwd);

  if (!projectRoot) {
    log('error', 'Not in a git repository');
    process.exit(1);
  }

  // Get worktree info
  const worktreeInfo = getWorktreeInfo(projectRoot);

  // Calculate port
  let port = forcePort || calculatePort(projectRoot);

  console.log('');
  log('info', `Project: ${path.basename(projectRoot)}`);
  log('info', `Type: ${worktreeInfo.isWorktree ? `worktree (${worktreeInfo.name})` : 'main repo'}`);
  log('info', `Calculated port: ${port}`);

  if (worktreeInfo.isWorktree) {
    log('info', `Main repo: ${worktreeInfo.mainRepo}`);
  }
  console.log('');

  // Setup mode
  if (setupMode) {
    log('info', 'Running setup...');

    try {
      log('info', 'Installing dependencies...');
      await runCommand('pnpm', ['install'], { cwd: projectRoot });

      log('info', 'Rebuilding native modules...');
      await runCommand('pnpm', ['run', 'electron:rebuild'], { cwd: projectRoot });

      log('info', 'Building main process...');
      await runCommand('pnpm', ['run', 'build:main'], { cwd: projectRoot });

      log('ok', 'Setup complete!');
    } catch (err) {
      log('error', `Setup failed: ${err.message}`);
      process.exit(1);
    }
    return;
  }

  // Check dependencies
  if (needsInstall(projectRoot)) {
    log('warn', 'Dependencies may be outdated, running pnpm install...');
    try {
      await runCommand('pnpm', ['install'], { cwd: projectRoot });
    } catch (err) {
      log('error', `Failed to install dependencies: ${err.message}`);
      process.exit(1);
    }
  }

  // Check if build is needed
  if (!skipBuild && (forceBuild || needsMainBuild(projectRoot))) {
    log('info', 'Building main process...');
    try {
      await runCommand('pnpm', ['run', 'build:main'], { cwd: projectRoot });
    } catch (err) {
      log('error', `Build failed: ${err.message}`);
      process.exit(1);
    }
  }

  // Check port availability
  const portAvailable = await checkPort(port);

  if (!portAvailable) {
    log('warn', `Port ${port} is in use`);

    // Try to find next available port
    try {
      const newPort = await findAvailablePort(port + 1);
      log('info', `Using port ${newPort} instead`);
      port = newPort;
    } catch (err) {
      log('error', 'Could not find available port');
      process.exit(1);
    }
  }

  // Start the dev servers
  console.log('');
  log('ok', 'Starting foozol development server...');
  console.log(`  ${colors.cyan}Worktree:${colors.reset} ${worktreeInfo.name}`);
  console.log(`  ${colors.cyan}Port:${colors.reset} ${port}`);
  console.log(`  ${colors.cyan}URL:${colors.reset} http://localhost:${port}`);
  console.log('');

  runConcurrently(projectRoot, port);
}

main().catch((err) => {
  log('error', err.message);
  process.exit(1);
});
