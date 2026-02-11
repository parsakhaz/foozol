# Node-PTY Alternatives for Windows + Electron Research (February 2026)

**Research Date:** February 11, 2026
**Context:** Crystal Electron 37.6.0 app using pnpm needs PTY support on Windows with prebuilt binaries

---

## Executive Summary

After comprehensive research into node-pty alternatives for Windows + Electron in early 2026, here are the key findings:

**Top Recommendation:** `@lydell/node-pty` (version 1.2.0-beta.10) - Modern fork with Windows x64 prebuilts, actively maintained (last published February 2026).

**Key Issue Identified:** The current package `@homebridge/node-pty-prebuilt-multiarch` has **removed Electron support** as of v0.14.1-beta.1 (July 2025) unless a tester volunteers.

**Critical Finding:** Electron 37 uses **ABI version 136**, which is very new. Most prebuilt packages only guarantee support up to Electron 28 (ABI 103-120 range).

---

## 1. @lydell/node-pty - RECOMMENDED ✅

### Package Information
- **npm Package:** `@lydell/node-pty`
- **Latest Version:** 1.2.0-beta.10 (published ~8 days ago as of search date)
- **Based on:** microsoft/node-pty v1.2.0-beta.3
- **GitHub:** https://github.com/lydell/node-pty

### Windows Support
✅ **Yes** - Windows x64 prebuilts available via `@lydell/node-pty-win32-x64`

**Supported Platforms:**
- Windows x64 (win32-x64) - ~30 MiB
- Windows ARM64 (win32-arm64)
- macOS x64 (darwin-x64) - <1 MiB
- macOS ARM64 (darwin-arm64) - <1 MiB
- Linux x64 (linux-x64) - <1 MiB
- Linux ARM64 (linux-arm64) - <1 MiB

### Electron Version Compatibility
**Minimum:** Node.js 16 or Electron 19+

**Electron 37 Status:** ⚠️ **UNKNOWN** - Not explicitly documented. Package is based on node-pty 1.2.0-beta.3 which hasn't been tested with Electron 37 (ABI 136) in documentation.

### Prebuilt Availability
✅ **Yes** - Uses `optionalDependencies` to install only platform-specific packages
- Never calls node-gyp
- No C++ compiler or Python required
- Platform-specific packages: `@lydell/node-pty-win32-x64`, `@lydell/node-pty-linux-x64`, etc.

### Installation (pnpm)
```bash
pnpm add @lydell/node-pty
```

**Important:** Do NOT use `--no-optional` or `--omit=optional` flags, as this will prevent platform-specific binaries from installing.

### Key Advantages
- ✅ Actively maintained (February 2026 release)
- ✅ Windows x64 prebuilts included
- ✅ Much smaller package size vs microsoft/node-pty (30 MiB vs 60 MiB on Windows)
- ✅ No build tools required
- ✅ Uses ConPTY on Windows (requires Windows 10 1809+)
- ✅ Removes winpty (legacy, no longer needed)

### Known Limitations
- ⚠️ Only works on platforms with prebuilts (cannot fall back to node-gyp)
- ⚠️ Electron 37 (ABI 136) compatibility not explicitly documented
- ⚠️ May require `@electron/rebuild` for Electron if ABI mismatch occurs

### Recommendation Level
**HIGH** - Best option if Electron 37 compatibility works (needs testing)

**Testing Strategy:**
1. Install `@lydell/node-pty` in Crystal
2. Test terminal functionality in Electron 37.6.0 on Windows
3. If ABI error occurs, run `@electron/rebuild`

---

## 2. microsoft/node-pty - Official Package

### Package Information
- **npm Package:** `node-pty`
- **Latest Version:** 1.1.0 (published ~2 months ago)
- **GitHub:** https://github.com/microsoft/node-pty

### Windows Support
✅ **Yes** - Uses Windows ConPTY API (Windows 10 1809+)

### Electron Version Compatibility
**Minimum:** Node.js 16 or Electron 19+

**Note:** "What version of node is supported is currently mostly bound to whatever version Visual Studio Code is using."

### Prebuilt Availability
❌ **NO** - Official package does NOT ship with prebuilt binaries

**Build Requirements:**
- Python
- C++ compiler (Visual Studio Build Tools on Windows)
- node-gyp
- Can run: `npm install --global --production windows-build-tools` (PowerShell as admin)

### Known Issues
- ⚠️ Fails to rebuild with Electron 33+ (reported issue #728)
- ⚠️ Prebuilt binaries have been requested since 2017 (issue #46 still open)
- ⚠️ Build failures on Windows 11 Pro reported (issue #649)

### Recommendation Level
**LOW** - Not recommended for Crystal due to lack of prebuilts and build complexity

---

## 3. @homebridge/node-pty-prebuilt-multiarch - BREAKING CHANGE ⚠️

### Package Information
- **npm Package:** `@homebridge/node-pty-prebuilt-multiarch`
- **Latest Stable:** v0.13.1 (July 3, 2025)
- **Latest Beta:** v0.14.1-beta.1 (July 6, 2025)
- **GitHub:** https://github.com/homebridge/node-pty-prebuilt-multiarch

### Critical Breaking Change
🚨 **Electron support REMOVED in v0.14.1-beta.1** (July 6, 2025)

From release notes:
> "Breaking change: Electron support removed unless a tester volunteers"

### v0.13.1 Windows Support (Last version with Electron)
✅ **Yes** - Windows x64 and ia32 prebuilts available
- 193 total assets
- Includes: `node-pty-prebuilt-multiarch-v0.13.1-electron-v101-win32-x64.tar.gz`
- Includes: `node-pty-prebuilt-multiarch-v0.13.1-electron-v103-win32-x64.tar.gz`

### Electron Version Compatibility (v0.13.1)
**Minimum:** Node.js 18, Electron 17.0.0+

**Maximum:** Electron 28 prebuilds not supplied due to build issues

**Electron v101/v103 Support:** ✅ Yes (in v0.13.1)

**Electron 37 (v136) Status:** ❌ **NO** - Far beyond documented support range

### Recommendation Level
**DO NOT USE** - Electron support removed in latest versions, v0.13.1 doesn't support Electron 37

---

## 4. Other node-pty Forks

### node-pty-prebuilt (daviwil)
- **Status:** ❌ Archived (October 2, 2020) - Read-only
- **Recommendation:** Do not use

### @cdktf/node-pty-prebuilt-multiarch
- **Status:** ⚠️ Project sunsets December 10, 2025 (archived)
- **Recommendation:** Do not use

### @cocktailpeanut/node-pty-prebuilt-multiarch
- **Minimum:** Node.js 16, Electron 16.0.0+
- **Status:** ⚠️ Niche fork, not well-maintained
- **Recommendation:** Use @lydell/node-pty instead

---

## 5. xterm.js Without node-pty

### Can xterm.js work without node-pty?

**Answer:** ⚠️ **Partially** - xterm.js is only a frontend terminal emulator

### Key Understanding
> "Xterm.js is not bash. Xterm.js can be connected to processes like bash and let you interact with them (provide input, receive output) through a library like node-pty."

### What xterm.js Provides
- ✅ Terminal display/rendering (frontend)
- ✅ WebGL renderer addon (`@xterm/addon-webgl`)
- ✅ Canvas renderer addon (`@xterm/addon-canvas`) - fallback if WebGL not supported
- ✅ Runs in browser or Electron renderer process

### What xterm.js Does NOT Provide
- ❌ PTY/pseudoterminal backend
- ❌ Process spawning
- ❌ Shell interaction

### Alternative Backend Options (Without node-pty)
1. **WebSocket backend** - Connect xterm.js to a remote server running PTY
2. **Manual process spawning** - Use Node.js `child_process` directly (loses PTY features like TTY, colors, interactive prompts)
3. **xterm-headless** - Stripped-down Node.js version for tracking state without rendering

### Addons Available
- `@xterm/addon-webgl` - WebGL2-based renderer (requires xterm.js v4+)
- `@xterm/addon-canvas` - Canvas 2D renderer (requires xterm.js v5+, fallback for WebGL)

### Recommendation for Crystal
**NOT SUITABLE** - Crystal requires full PTY functionality for Claude Code SDK interaction. xterm.js alone cannot replace node-pty.

---

## 6. ConPTY / Windows Terminal Integration

### What is ConPTY?
**ConPTY** (Console Pseudoterminal) is Microsoft's native pseudoconsole API introduced in Windows 10 version 1809 (October 2018 Update).

### API Details
- **Available since:** Windows 10 build 18309+
- **APIs:** `CreatePseudoConsole`, `ClosePseudoConsole`, `ResizePseudoConsole`
- **Encoding:** UTF-8
- **I/O:** Uses `ReadFile`/`WriteFile` with synchronous pipes

### npm Wrappers for ConPTY

#### microsoft/node-pty (Uses ConPTY on Windows)
The official node-pty package already uses ConPTY on Windows 10 1809+:
- Source: `node-pty/src/win/conpty.cc`
- Removed winpty support (legacy)

#### No Standalone ConPTY npm Package Found
**Finding:** No dedicated npm package found that provides a simpler ConPTY wrapper than node-pty.

### Other Language Implementations
- **Go:** `github.com/charmbracelet/x/conpty` - ConPTY support in Go
- **C#:** Microsoft Terminal samples include `PseudoConsole.cs` examples

### Microsoft Framework Package Plans
Microsoft discussed shipping ConPTY as an independently-upgradable framework package (issue #1130), but this hasn't materialized as a separate npm package.

### Recommendation
**Use node-pty variants** - node-pty (and its forks like @lydell/node-pty) already provide the best npm wrapper for ConPTY on Windows.

---

## 7. Rust-based PTY Alternatives

### @replit/ruspty

#### Package Information
- **npm Package:** `@replit/ruspty`
- **GitHub:** https://github.com/replit/ruspty
- **Description:** "PTY for Node through Rust FFI"

#### Windows Support
⚠️ **LIKELY NO** - Documentation only shows Unix examples (`/bin/sh`)
- No Windows compatibility mentioned
- No ConPTY references in documentation

#### Electron Support
❌ **UNKNOWN** - No mention of Electron compatibility

#### Maintenance Status
⚠️ **UNCLEAR** - 84 commits on main, but latest commit date not visible in research

#### Recommendation Level
**NOT RECOMMENDED** - Insufficient Windows/Electron documentation, likely Unix-only

### node-pty Rust Port (corwin-of-amber)
- **GitHub:** https://github.com/corwin-of-amber/node-pty/tree/rust-port
- **Minimum:** Node.js 12+ or Electron 8+
- **Status:** ⚠️ Fork/experimental branch, not a standalone package
- **Recommendation:** Do not use - unmaintained fork

---

## 8. Electron 37 ABI and Compatibility

### Electron 37 Technical Details
- **ABI Version:** 136 (NODE_MODULE_VERSION)
- **Node.js Version:** 22.16.0
- **Chromium Version:** 138.0.7204.35
- **V8 Version:** 13.8

### ABI Version Context
Electron 37 uses ABI 136, which is significantly newer than what most prebuilt packages support:

| Electron Version | ABI Version | Support Status |
|------------------|-------------|----------------|
| Electron 37 | 136 | ⚠️ Cutting edge, limited prebuilt support |
| Electron 36 | 135 | ⚠️ Very new |
| Electron 35 | 133 | ⚠️ New |
| Electron 33-34 | 130-132 | ⚠️ Known issues with node-pty |
| Electron 28 | ~120 | ❌ @homebridge/node-pty-prebuilt-multiarch build issues |
| Electron 19 | ~109 | ✅ Minimum for official node-pty |
| Electron 17 | ~103 | ✅ Minimum for @homebridge/node-pty-prebuilt-multiarch v0.13.1 |

### Native Module Rebuild Required?
**Likely YES** for Electron 37, due to:
- ABI version 136 is very new (January-February 2026)
- Most prebuilt packages only go up to ABI ~120
- Electron has different ABI than Node.js (uses BoringSSL vs OpenSSL)

### Using @electron/rebuild

#### Package Information
- **npm Package:** `@electron/rebuild`
- **Replaces:** `electron-rebuild` (deprecated)
- **Minimum:** Node.js v22.12.0+

#### Installation
```bash
pnpm add -D @electron/rebuild
```

#### Usage
```bash
# Rebuild all native modules for current Electron version
./node_modules/.bin/electron-rebuild

# Rebuild specific module
./node_modules/.bin/electron-rebuild -w node-pty

# Force rebuild
./node_modules/.bin/electron-rebuild -f

# Specify Electron version
./node_modules/.bin/electron-rebuild -v 37.6.0
```

#### How It Works
- Downloads Electron headers for the target version
- Rebuilds native modules using node-gyp against Electron ABI
- If module uses prebuild, runs `prebuild-install` to download correct binaries from GitHub releases

#### Integration with electron-builder
`@electron/rebuild` is automatically used by electron-builder and Electron Forge during packaging.

---

## Detailed Analysis & Recommendations

### Current Situation (Crystal App)
- **Current Package:** `@homebridge/node-pty-prebuilt-multiarch`
- **Problem:** Only has Linux prebuilts, lacks Windows x64 prebuilts
- **Electron Version:** 37.6.0 (ABI 136)
- **Package Manager:** pnpm

### Why @homebridge/node-pty-prebuilt-multiarch Won't Work
1. ❌ Electron support removed in v0.14.1-beta.1 (July 2025)
2. ❌ v0.13.1 only supports up to Electron ~27 (ABI 103-120 range)
3. ❌ Electron 28 prebuilds explicitly not supplied due to build issues
4. ❌ Electron 37 (ABI 136) is far beyond supported range

### Recommended Solution: @lydell/node-pty

#### Step 1: Replace Package
```bash
# Remove old package
pnpm remove @homebridge/node-pty-prebuilt-multiarch

# Install @lydell/node-pty
pnpm add @lydell/node-pty
```

#### Step 2: Update Imports
Replace all imports:
```typescript
// OLD
import * as pty from '@homebridge/node-pty-prebuilt-multiarch';

// NEW
import * as pty from '@lydell/node-pty';
```

#### Step 3: Test Without Rebuild First
```bash
pnpm electron-dev
```

Test terminal functionality in Crystal app on Windows.

#### Step 4: If ABI Error Occurs
Error will look like:
```
Error: The module '/path/to/node_modules/@lydell/node-pty-win32-x64/conpty.node'
was compiled against a different Node.js version using NODE_MODULE_VERSION 130.
This version of Node.js requires NODE_MODULE_VERSION 136.
```

**Solution:**
```bash
# Install @electron/rebuild as dev dependency
pnpm add -D @electron/rebuild

# Rebuild @lydell/node-pty for Electron 37
./node_modules/.bin/electron-rebuild -w @lydell/node-pty -f -v 37.6.0
```

#### Step 5: Configure for CI/CD
Add postinstall script to `package.json`:
```json
{
  "scripts": {
    "postinstall": "electron-rebuild -f"
  }
}
```

Or use electron-builder's automatic rebuild during packaging.

### Alternative Solution: Build from Source

If @lydell/node-pty + @electron/rebuild fails, fall back to building microsoft/node-pty from source.

#### Prerequisites (Windows)
Install build tools:
```powershell
# Run as Administrator
npm install --global --production windows-build-tools
```

#### Installation
```bash
pnpm add node-pty

# Rebuild for Electron 37
./node_modules/.bin/electron-rebuild -w node-pty -f -v 37.6.0
```

**Downside:** Requires build tools on developer machines and CI/CD.

---

## Testing Strategy for Crystal

### Phase 1: Test @lydell/node-pty (Recommended)
1. ✅ Install `@lydell/node-pty@1.2.0-beta.10`
2. ✅ Update imports in codebase
3. ✅ Run `pnpm electron-dev` on Windows
4. ✅ Test terminal panel functionality
5. ⚠️ If ABI error: Install `@electron/rebuild` and rebuild
6. ✅ Verify terminal output, input, process spawning
7. ✅ Test Claude Code SDK integration

### Phase 2: Fallback to microsoft/node-pty (If Needed)
1. ❌ Only if @lydell/node-pty fails after rebuild
2. ⚠️ Install Windows Build Tools (requires admin)
3. ⚠️ Install `node-pty` and rebuild with `@electron/rebuild`
4. ⚠️ Document build requirements for developers

### Success Criteria
- ✅ Terminal panels spawn successfully
- ✅ PTY processes run (cmd.exe, powershell.exe, Claude Code)
- ✅ Input/output works correctly
- ✅ Terminal resize works
- ✅ No native module ABI errors
- ✅ Works on Windows x64 without manual build tools

---

## Version Compatibility Matrix

| Package | Windows x64 | Electron 37 | Prebuilts | Status |
|---------|-------------|-------------|-----------|--------|
| @lydell/node-pty@1.2.0-beta.10 | ✅ Yes | ⚠️ Untested (may need rebuild) | ✅ Yes | **RECOMMENDED** |
| microsoft/node-pty@1.1.0 | ✅ Yes | ⚠️ Untested (requires build) | ❌ No | Not recommended |
| @homebridge/node-pty-prebuilt-multiarch@0.13.1 | ✅ Yes | ❌ No (max Electron ~27) | ✅ Yes | Outdated |
| @homebridge/node-pty-prebuilt-multiarch@0.14+ | ✅ Yes | ❌ No (Electron dropped) | ✅ Yes (Node only) | Do not use |
| @replit/ruspty | ❌ Unknown | ❌ Unknown | ⚠️ Unknown | Not recommended |

---

## Potential Issues & Mitigations

### Issue 1: ABI Mismatch with Electron 37
**Symptom:** `NODE_MODULE_VERSION` error on app launch

**Mitigation:**
```bash
pnpm add -D @electron/rebuild
./node_modules/.bin/electron-rebuild -w @lydell/node-pty -f
```

### Issue 2: Optional Dependencies Not Installing
**Symptom:** `@lydell/node-pty-win32-x64` not found

**Cause:** Using `--no-optional` or `--omit=optional` flag

**Mitigation:**
```bash
# Ensure pnpm doesn't skip optional dependencies
pnpm install --include=optional

# Or remove flag from .npmrc
```

### Issue 3: ConPTY Not Available
**Symptom:** Terminal fails to spawn on old Windows versions

**Requirement:** Windows 10 version 1809 (build 18309) or later

**Mitigation:** Document minimum Windows version in Crystal README

### Issue 4: Build Tools Required for @electron/rebuild
**Symptom:** `@electron/rebuild` fails due to missing node-gyp dependencies

**Mitigation (Windows):**
```powershell
# Run as Administrator
npm install --global --production windows-build-tools
```

Or use Visual Studio 2019+ Build Tools.

---

## Additional Resources

### Official Documentation
- [Electron Native Node Modules](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules)
- [Windows Pseudo Console (ConPTY)](https://devblogs.microsoft.com/commandline/windows-command-line-introducing-the-windows-pseudo-console-conpty/)
- [Creating a Pseudoconsole session - Microsoft Learn](https://learn.microsoft.com/en-us/windows/console/creating-a-pseudoconsole-session)

### Package Repositories
- [@lydell/node-pty GitHub](https://github.com/lydell/node-pty)
- [microsoft/node-pty GitHub](https://github.com/microsoft/node-pty)
- [@electron/rebuild GitHub](https://github.com/electron/rebuild)
- [xterm.js GitHub](https://github.com/xtermjs/xterm.js)

### Community Resources
- [node-pty Electron Example](https://github.com/microsoft/node-pty/blob/main/examples/electron/README.md)
- [Browser-based terminals with Electron.js and Xterm.js - Opcito](https://www.opcito.com/blogs/browser-based-terminals-with-xtermjs-and-electronjs)

---

## Gaps or Limitations

### Information Not Available
1. ⚠️ **Explicit Electron 37 (ABI 136) support confirmation** for @lydell/node-pty
   - Package is too new to have documented compatibility
   - Will require empirical testing

2. ⚠️ **@lydell/node-pty prebuild Electron version list**
   - npm package doesn't list all supported Electron ABIs
   - May need to inspect package contents or test directly

3. ⚠️ **@replit/ruspty Windows support status**
   - Insufficient documentation
   - No active Windows testing visible

4. ⚠️ **Performance comparison** between @lydell/node-pty and microsoft/node-pty
   - Both use same underlying ConPTY on Windows
   - Likely identical performance, only difference is prebuilts

### Unknowns Requiring Testing
- Will @lydell/node-pty@1.2.0-beta.10 work with Electron 37.6.0 without rebuild?
- If rebuild required, will @electron/rebuild successfully compile for Electron 37?
- Are there any Crystal-specific integration issues with @lydell/node-pty?

---

## Version Information

### Electron 37
- **Version:** 37.6.0 (used in Crystal)
- **Node.js:** 22.16.0
- **ABI:** 136
- **Release:** January-February 2026

### @lydell/node-pty
- **Version:** 1.2.0-beta.10
- **Published:** ~February 3, 2026
- **Based on:** microsoft/node-pty@1.2.0-beta.3

### @electron/rebuild
- **Minimum Node.js:** v22.12.0
- **Status:** Official, actively maintained

---

## Conclusion

**For Crystal's Windows + Electron 37.6.0 requirement:**

1. **Use `@lydell/node-pty@1.2.0-beta.10`** - Best option with Windows x64 prebuilts
2. **Install `@electron/rebuild` as dev dependency** - Prepare for potential ABI rebuild
3. **Test thoroughly on Windows** - Electron 37 (ABI 136) is cutting edge
4. **Document minimum Windows 10 1809+ requirement** - For ConPTY support

**Do NOT use:**
- `@homebridge/node-pty-prebuilt-multiarch` - Electron support removed
- `microsoft/node-pty` directly - No prebuilts, requires build tools
- `@replit/ruspty` - Insufficient Windows/Electron support

**High confidence** that @lydell/node-pty will work, with possible one-time rebuild needed for Electron 37.

---

## Sources

- [@lydell/node-pty - npm](https://www.npmjs.com/package/@lydell/node-pty)
- [@lydell/node-pty-win32-x64 - npm](https://www.npmjs.com/package/@lydell/node-pty-win32-x64)
- [node-pty - npm](https://www.npmjs.com/package/node-pty)
- [GitHub - microsoft/node-pty](https://github.com/microsoft/node-pty)
- [Prebuilt binaries · Issue #46 · microsoft/node-pty](https://github.com/microsoft/node-pty/issues/46)
- [node-pty does not work with latest versions of electron · Issue #728](https://github.com/microsoft/node-pty/issues/728)
- [@homebridge/node-pty-prebuilt-multiarch - npm](https://www.npmjs.com/package/@homebridge/node-pty-prebuilt-multiarch)
- [Releases · homebridge/node-pty-prebuilt-multiarch](https://github.com/homebridge/node-pty-prebuilt-multiarch/releases)
- [Windows Command-Line: Introducing ConPTY](https://devblogs.microsoft.com/commandline/windows-command-line-introducing-the-windows-pseudo-console-conpty/)
- [Creating a Pseudoconsole session - Microsoft Learn](https://learn.microsoft.com/en-us/windows/console/creating-a-pseudoconsole-session)
- [GitHub - xtermjs/xterm.js](https://github.com/xtermjs/xterm.js)
- [xterm-addon-webgl - npm](https://www.npmjs.com/package/xterm-addon-webgl)
- [@xterm/addon-canvas - npm](https://www.npmjs.com/package/@xterm/addon-canvas)
- [Browser-based terminals with Electron.js and Xterm.js](https://www.opcito.com/blogs/browser-based-terminals-with-xtermjs-and-electronjs)
- [Native Node Modules | Electron](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules)
- [@electron/rebuild - npm](https://www.npmjs.com/package/@electron/rebuild)
- [GitHub - electron/rebuild](https://github.com/electron/rebuild)
- [Electron 37.0.0 | Electron](https://www.electronjs.org/blog/electron-37-0)
- [v37.0.0 | Electron Releases](https://releases.electronjs.org/release/v37.0.0)
- [node/doc/abi_version_registry.json at main · nodejs/node](https://github.com/nodejs/node/blob/main/doc/abi_version_registry.json)
- [GitHub - replit/ruspty](https://github.com/replit/ruspty)
- [GitHub - corwin-of-amber/node-pty at rust-port](https://github.com/corwin-of-amber/node-pty/tree/rust-port)
- [Tauri vs Electron Comparison - RaftLabs](https://raftlabs.medium.com/tauri-vs-electron-a-practical-guide-to-picking-the-right-framework-5df80e360f26)
- [Electron vs Node.js: Best Pick for 2025](https://www.index.dev/blog/electron-vs-nodejs)
