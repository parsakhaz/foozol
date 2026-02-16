import type { HotkeyDefinition } from '../stores/hotkeyStore';

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
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  const parts = keys.split('+');
  const formatted = parts.map((part) => {
    switch (part.toLowerCase()) {
      case 'mod': return isMac ? '⌘' : 'Ctrl';
      case 'alt': return isMac ? '⌥' : 'Alt';
      case 'shift': return isMac ? '⇧' : 'Shift';
      case 'arrowleft': return '←';
      case 'arrowright': return '→';
      case 'arrowup': return '↑';
      case 'arrowdown': return '↓';
      default: return part.length === 1 ? part.toUpperCase() : part;
    }
  });
  return formatted.join(' + ');
}
