import type { ILink, ILinkProvider } from '@xterm/xterm';
import type { LinkProviderConfig } from './types';

/**
 * Creates a file link provider that detects file paths in terminal output.
 * Supports Unix paths, Windows paths, and paths with line:column numbers.
 */
export function createFileLinkProvider(config: LinkProviderConfig): ILinkProvider {
  // Regex patterns for different file path formats
  const UNIX_PATH = /(?:^|[\s"'`])([.~]?\/[\w\-./]+(?::\d+(?::\d+)?)?)/g;
  const WIN_QUOTED = /"([A-Za-z]:\\[^"]+)"/g; // Require quotes for paths with spaces
  const WIN_SIMPLE = /([A-Za-z]:\\[\w\-.\\/]+(?::\d+(?::\d+)?)?)/g;
  const RELATIVE_WITH_LINE = /(?:^|[\s"'`])([\w\-./]+\.[a-z]+:\d+(?::\d+)?)/g;

  /**
   * Parse line and column numbers from file path
   * Example: "file.ts:42:10" -> { path: "file.ts", line: 42, col: 10 }
   */
  function parseFilePath(match: string): { path: string; line?: number; col?: number } {
    const lineMatch = match.match(/:(\d+)(?::(\d+))?$/);
    if (lineMatch) {
      return {
        path: match.slice(0, match.indexOf(':' + lineMatch[1])),
        line: parseInt(lineMatch[1], 10),
        col: lineMatch[2] ? parseInt(lineMatch[2], 10) : undefined,
      };
    }
    return { path: match };
  }

  /**
   * Resolve relative paths against working directory
   */
  function resolvePath(filePath: string): string {
    // Absolute paths - return as-is
    if (filePath.startsWith('/') || /^[A-Za-z]:/.test(filePath)) {
      return filePath;
    }
    // Resolve relative to working directory
    const resolved = `${config.workingDirectory}/${filePath}`.replace(/\/+/g, '/');
    // Handle Windows path separators - only convert on Windows
    const isWindows = navigator.platform.toLowerCase().includes('win');
    return isWindows ? resolved.replace(/\//g, '\\') : resolved;
  }

  return {
    provideLinks(lineNumber: number, callback: (links: ILink[] | undefined) => void) {
      const line = config.terminal.buffer.active.getLine(lineNumber);
      if (!line) {
        callback(undefined);
        return;
      }

      const text = line.translateToString();
      const links: ILink[] = [];

      // Apply all patterns and collect matches
      const patterns = [UNIX_PATH, WIN_QUOTED, WIN_SIMPLE, RELATIVE_WITH_LINE];
      for (const regex of patterns) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
          const rawPath = match[1] || match[0];
          const { path, line: fileLine } = parseFilePath(rawPath);
          const resolvedPath = resolvePath(path);

          // Detect platform for modifier key hint
          const isMac = navigator.platform.toUpperCase().includes('MAC');
          const modifierKey = isMac ? 'Cmd' : 'Ctrl';

          links.push({
            range: {
              start: { x: match.index + 1, y: lineNumber + 1 },
              end: { x: match.index + match[0].length + 1, y: lineNumber + 1 },
            },
            text: rawPath,
            activate: (event: MouseEvent) => {
              // Only activate on Ctrl/Cmd+Click
              if (isMac ? event.metaKey : event.ctrlKey) {
                config.onShowFilePopover(event, resolvedPath, fileLine);
              }
            },
            hover: (event: MouseEvent) => {
              config.onShowTooltip(event, resolvedPath, `${modifierKey}+Click to open`);
            },
            leave: () => {
              config.onHideTooltip();
            },
          });
        }
      }

      callback(links.length > 0 ? links : undefined);
    },
  };
}
