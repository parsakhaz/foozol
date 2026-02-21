import React from 'react';
import { Copy, ExternalLink, FolderOpen } from 'lucide-react';
import { TerminalPopover } from './TerminalPopover';

export interface SelectionPopoverProps {
  visible: boolean;
  x: number;
  y: number;
  text: string;
  workingDirectory?: string;
  onClose: () => void;
}

const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`[\]]+/;

// File path patterns - detect Unix paths, Windows paths, and relative paths with extensions
const FILE_PATH_PATTERNS = [
  /^[.~]?\/[\w\-./]+/, // Unix absolute or relative paths starting with / ./ ~/
  /^[A-Za-z]:[\\\/][\w\-.\\/]+/, // Windows absolute paths C:\ or C:/
  /^[\w\-./]+\.[a-z]{1,10}(:\d+)?$/i, // Relative paths with extension like foo.ts or foo.ts:42
];

function isFilePath(text: string): boolean {
  const trimmed = text.trim();
  return FILE_PATH_PATTERNS.some(pattern => pattern.test(trimmed));
}

function resolveFilePath(text: string, workingDirectory?: string): string {
  const trimmed = text.trim();
  // Remove line:col suffix if present
  const pathOnly = trimmed.replace(/:\d+(:\d+)?$/, '');

  // If it's an absolute path, return as-is
  if (pathOnly.startsWith('/') || /^[A-Za-z]:/.test(pathOnly)) {
    return pathOnly;
  }

  // Resolve relative to working directory
  if (workingDirectory) {
    const resolved = `${workingDirectory}/${pathOnly}`.replace(/\/+/g, '/');
    const isWindows = navigator.platform.toLowerCase().includes('win');
    return isWindows ? resolved.replace(/\//g, '\\') : resolved;
  }

  return pathOnly;
}

export const SelectionPopover: React.FC<SelectionPopoverProps> = ({
  visible,
  x,
  y,
  text,
  workingDirectory,
  onClose,
}) => {
  const trimmedText = text.trim();
  const isUrl = URL_PATTERN.test(trimmedText);
  const isFile = !isUrl && isFilePath(trimmedText);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      onClose();
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleOpenUrl = () => {
    if (isUrl) {
      window.electronAPI.openExternal(trimmedText);
      onClose();
    }
  };

  const handleShowInExplorer = async () => {
    if (isFile) {
      const resolvedPath = resolveFilePath(trimmedText, workingDirectory);
      try {
        await window.electronAPI.invoke('app:showItemInFolder', resolvedPath);
      } catch (error) {
        console.error('Failed to show in explorer:', error);
      }
      onClose();
    }
  };

  return (
    <TerminalPopover visible={visible} x={x} y={y} onClose={onClose}>
      <button
        onClick={handleCopy}
        className="w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-interactive/10 hover:text-text-primary flex items-center gap-2 transition-colors"
      >
        <Copy className="w-4 h-4" />
        <span>Copy</span>
      </button>
      {isUrl && (
        <button
          onClick={handleOpenUrl}
          className="w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-interactive/10 hover:text-text-primary flex items-center gap-2 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Open URL</span>
        </button>
      )}
      {isFile && (
        <button
          onClick={handleShowInExplorer}
          className="w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-interactive/10 hover:text-text-primary flex items-center gap-2 transition-colors"
        >
          <FolderOpen className="w-4 h-4" />
          <span>Show in Explorer</span>
        </button>
      )}
    </TerminalPopover>
  );
};
