import type { HotkeyDefinition } from '../stores/hotkeyStore';
import { isMac } from './platformUtils';

/** Canonical display order for hotkey categories */
export const CATEGORY_ORDER: HotkeyDefinition['category'][] = [
  'navigation',
  'session',
  'tabs',
  'view',
  'debug',
];

export const CATEGORY_LABELS: Record<HotkeyDefinition['category'], string> = {
  navigation: 'Navigation',
  session: 'Projects',
  tabs: 'Tabs',
  view: 'View',
  debug: 'Debug',
};

export function formatKeyDisplay(keys: string): string {
  const isMacPlatform = isMac();
  const parts = keys.split('+');
  const formatted = parts.map((part) => {
    switch (part.toLowerCase()) {
      case 'mod': return isMacPlatform ? '⌘' : 'Ctrl';
      case 'alt': return isMacPlatform ? '⌥' : 'Alt';
      case 'shift': return isMacPlatform ? '⇧' : 'Shift';
      case 'arrowleft': return '←';
      case 'arrowright': return '→';
      case 'arrowup': return '↑';
      case 'arrowdown': return '↓';
      default: return part.length === 1 ? part.toUpperCase() : part;
    }
  });
  return formatted.join(' + ');
}
