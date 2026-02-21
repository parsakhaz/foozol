#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/release.js <version>');
  console.error('Example: node scripts/release.js 0.1.0');
  process.exit(1);
}

// Strip leading 'v' if present
const cleanVersion = version.replace(/^v/, '');

// Validate semver format
if (!/^\d+\.\d+\.\d+/.test(cleanVersion)) {
  console.error(`Invalid version format: ${cleanVersion}`);
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

console.log(`Releasing v${cleanVersion} (was ${pkg.version})...`);

// Update version
pkg.version = cleanVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// Commit, tag, push
execSync('git add package.json', { cwd: rootDir, stdio: 'inherit' });
try {
  execSync(`git commit -m "release: v${cleanVersion}"`, { cwd: rootDir, stdio: 'inherit' });
} catch {
  console.log('No version change to commit, continuing with tag...');
}
execSync(`git tag v${cleanVersion}`, { cwd: rootDir, stdio: 'inherit' });
execSync('git push origin HEAD', { cwd: rootDir, stdio: 'inherit' });
execSync(`git push origin v${cleanVersion}`, { cwd: rootDir, stdio: 'inherit' });

console.log(`\nRelease v${cleanVersion} triggered!`);
console.log('Watch progress at: https://github.com/parsakhaz/foozol/actions');
