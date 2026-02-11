# Windows Build Research: Native Module Issues

**Date:** February 2026
**Status:** ✅ RESOLVED
**Severity:** ~~High~~ Resolved

## Executive Summary

Crystal's Windows build had native module compilation issues that don't exist on Linux/macOS. These have been **fully resolved** as of February 11, 2026.

**Current Status (Feb 2026):**
- ✅ `better-sqlite3-multiple-ciphers` - FIXED via prebuild-install in build script
- ✅ `@lydell/node-pty` - FIXED by switching from `@homebridge/node-pty-prebuilt-multiarch`

**Result:** Windows build fully functional - app launches, database works, and **Terminal panels work**.

## The Problem

### What Works on Linux
- Native modules (`node-pty`, `better-sqlite3-multiple-ciphers`) compile successfully
- Prebuilt binaries exist for Linux x64/arm64
- electron-builder rebuilds modules without issues

### What Breaks on Windows
1. **winpty.gyp path issues**: Batch files need `.\` prefix on Windows
2. **pnpm + node-gyp incompatibility**: Relative path resolution fails with pnpm's nested structure
3. **No Windows prebuilts**: `@homebridge/node-pty-prebuilt-multiarch` only ships Linux prebuilds

## Native Modules Used

| Module | Purpose | Prebuilt Status |
|--------|---------|-----------------|
| `@lydell/node-pty` | Terminal emulation | ✅ Has Windows x64 prebuilts, works with Electron 37 |
| `better-sqlite3-multiple-ciphers` | SQLite database | ✅ Has Electron prebuilts for all platforms |

### @lydell/node-pty - SOLVED (Feb 11, 2026)

**Fix:** Switched from `@homebridge/node-pty-prebuilt-multiarch` to `@lydell/node-pty@1.2.0-beta.3`

```bash
pnpm remove @homebridge/node-pty-prebuilt-multiarch
pnpm add @lydell/node-pty
```

Key advantages of `@lydell/node-pty`:
- Has Windows x64 prebuilts via `@lydell/node-pty-win32-x64`
- Never calls node-gyp (completely avoids pnpm path resolution issues)
- Works with Electron 37.6.0 (ABI 136)
- 30 MB vs 60 MB footprint

### better-sqlite3-multiple-ciphers - SOLVED

**Fix applied in `scripts/build-win.js`:**
```javascript
// Downloads Electron-compatible prebuilt binary
execSync('npx prebuild-install --runtime electron --target 37.6.0 --arch x64 --verbose', {
  cwd: betterSqliteDir
});
```

This works because the package publishes prebuilts for modern Electron versions.

## Historical Context (For Reference)

### Why @homebridge/node-pty-prebuilt-multiarch Failed

The previous package had multiple issues on Windows:

1. **No Windows Prebuilts**: Only shipped Linux prebuilds despite claiming Windows support
2. **Electron Support Removed**: v0.14.1 dropped Electron support entirely
3. **pnpm + node-gyp Incompatibility**: When compilation was attempted, pnpm's nested `node_modules` caused path resolution failures

### Why @lydell/node-pty Works

- Ships platform-specific packages (`@lydell/node-pty-win32-x64`)
- Never calls node-gyp - prebuilts only
- Actively maintained with modern Electron support
- Smaller footprint (30 MB vs 60 MB)

## The Solution

**Implemented February 11, 2026**

The Windows build now works fully:

1. **`@lydell/node-pty`** provides Windows prebuilts that work with Electron 37
2. **`scripts/build-win.js`** downloads Electron prebuilt for better-sqlite3
3. Builds with `--config.npmRebuild=false` to avoid unnecessary rebuilds

**Result**:
- ✅ Database works (better-sqlite3 prebuilt downloaded)
- ✅ Terminal panels work (@lydell/node-pty has Windows prebuilts)
- ✅ App launches without errors

## Testing Checklist (Verified Feb 11, 2026)

- [x] App launches without crash
- [x] Database operations work (sessions persist)
- [x] Terminal panels initialize without errors
- [ ] Claude Code sessions can be started (requires Claude Code installed)
- [ ] Script execution works (user testing needed)

## Remaining Recommendations

### Medium-term
1. Set up Windows CI/CD pipeline
2. Create integration tests for Windows
3. Test on Windows ARM64 devices

### Long-term
1. Monitor `@lydell/node-pty` for updates
2. Consider contributing upstream if issues arise

## References

- [GitHub - lydell/node-pty](https://github.com/lydell/node-pty) - The solution
- [GitHub - microsoft/node-pty](https://github.com/microsoft/node-pty) - Official upstream
- [Electron Native Modules Documentation](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules)
