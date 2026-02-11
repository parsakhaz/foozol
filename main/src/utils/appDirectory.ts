import { homedir } from 'os';
import { join } from 'path';
import { app } from 'electron';

let customAppDir: string | undefined;

/**
 * Sets a custom foozol directory path. This should be called early in the
 * application lifecycle, before any services are initialized.
 */
export function setAppDirectory(dir: string): void {
  customAppDir = dir;
}

/**
 * Determines if foozol is running from an installed application (DMG/Applications folder)
 * rather than a development build
 */
function isInstalledApp(): boolean {
  // Check if app is packaged (built for distribution)
  if (!app.isPackaged) {
    return false;
  }
  
  // On macOS, check if running from /Applications or a mounted DMG volume
  if (process.platform === 'darwin') {
    const appPath = app.getPath('exe');
    // Apps installed from DMG or in /Applications will have these paths
    const isInApplications = appPath.startsWith('/Applications/');
    const isInVolumes = appPath.startsWith('/Volumes/');
    const isInPrivateTmp = appPath.includes('/private/var/folders/'); // Temp mount for DMG
    
    return isInApplications || isInVolumes || isInPrivateTmp;
  }
  
  // For other platforms, being packaged is sufficient
  return true;
}

/**
 * Gets the foozol directory path. Returns the custom directory if set,
 * otherwise falls back to the environment variable FOOZOL_DIR,
 * and finally defaults to ~/.foozol
 */
export function getAppDirectory(): string {
  // 1. Check if custom directory was set programmatically
  if (customAppDir) {
    return customAppDir;
  }

  // 2. Check environment variable
  const envDir = process.env.FOOZOL_DIR;
  if (envDir) {
    return envDir;
  }

  // 3. If running as an installed app (from DMG, /Applications, etc), always use ~/.foozol
  if (isInstalledApp()) {
    console.log('[foozol] Running as installed app, using ~/.foozol');
    return join(homedir(), '.foozol');
  }

  // 4. If running inside foozol (detected by bundle identifier) in development, use development directory
  // This prevents development foozol from interfering with production foozol
  if (process.env.__CFBundleIdentifier === 'com.dcouple.foozol' && !app.isPackaged) {
    console.log('[foozol] Detected running inside foozol development, using ~/.foozol_dev for isolation');
    return join(homedir(), '.foozol_dev');
  }

  // 5. Default to ~/.foozol
  return join(homedir(), '.foozol');
}

/**
 * Gets a subdirectory path within the foozol directory
 */
export function getAppSubdirectory(...subPaths: string[]): string {
  return join(getAppDirectory(), ...subPaths);
}