import { create } from 'zustand';

export interface HotkeyDefinition {
  /** Unique identifier, e.g. 'open-prompt-history' */
  id: string;
  /** Human-readable description for help/command palette */
  label: string;
  /** Key combination string, e.g. 'mod+p', 'mod+shift+n', 'mod+alt+ArrowLeft' */
  keys: string;
  /** Grouping for help dialog display */
  category: 'navigation' | 'session' | 'tabs' | 'view' | 'debug';
  /** The function to execute */
  action: () => void;
  /** Only register in development mode? */
  devOnly?: boolean;
  /** Is this hotkey currently enabled? Checked on every keypress. */
  enabled?: () => boolean;
}

interface HotkeyStore {
  hotkeys: Map<string, HotkeyDefinition>;
  register: (def: HotkeyDefinition) => void;
  unregister: (id: string) => void;
  getAll: () => HotkeyDefinition[];
  getByCategory: (category: HotkeyDefinition['category']) => HotkeyDefinition[];
  search: (query: string) => HotkeyDefinition[];
}

// --- Key matching logic (module-level, not in store) ---

// Canonical modifier order — MUST be identical in both normalize functions
const MODIFIER_ORDER = ['mod', 'alt', 'shift'] as const;

function normalizeKeyEvent(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push('mod');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  // parts is already in canonical order because we push in that order
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  parts.push(key);
  return parts.join('+');
}

function normalizeHotkeyString(keys: string): string {
  const parts = keys.split('+');
  const modifiers: string[] = [];
  let key = '';
  for (const part of parts) {
    const lower = part.toLowerCase();
    if ((MODIFIER_ORDER as readonly string[]).includes(lower)) {
      modifiers.push(lower);
    } else {
      key = part.length === 1 ? part.toLowerCase() : part;
    }
  }
  modifiers.sort(
    (a, b) =>
      (MODIFIER_ORDER as readonly string[]).indexOf(a) -
      (MODIFIER_ORDER as readonly string[]).indexOf(b)
  );
  return [...modifiers, key].join('+');
}

let listenerAttached = false;
let lookupIndex: Map<string, string> = new Map(); // normalized keys → hotkey id

function handleKeyDown(e: KeyboardEvent) {
  const target = e.target as HTMLElement;
  const isInput =
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable;

  const pressed = normalizeKeyEvent(e);
  const hotkeyId = lookupIndex.get(pressed);
  if (!hotkeyId) return;

  const store = useHotkeyStore.getState();
  const def = store.hotkeys.get(hotkeyId);
  if (!def) return;

  // Skip if typing in input and shortcut doesn't use mod key
  if (isInput && !pressed.includes('mod')) return;

  // Check devOnly
  if (def.devOnly && process.env.NODE_ENV !== 'development') return;

  // Check enabled
  if (def.enabled && !def.enabled()) return;

  e.preventDefault();
  def.action();
}

function rebuildIndex(hotkeys: Map<string, HotkeyDefinition>) {
  lookupIndex = new Map();
  for (const [id, def] of hotkeys) {
    const normalized = normalizeHotkeyString(def.keys);
    if (process.env.NODE_ENV === 'development' && lookupIndex.has(normalized)) {
      const existingId = lookupIndex.get(normalized);
      console.warn(
        `[hotkeyStore] Conflict: "${def.keys}" registered by "${id}" overwrites "${existingId}"`
      );
    }
    lookupIndex.set(normalized, id);
  }
}

function attachListener() {
  if (!listenerAttached) {
    window.addEventListener('keydown', handleKeyDown);
    listenerAttached = true;
  }
}

function detachListener() {
  if (listenerAttached) {
    window.removeEventListener('keydown', handleKeyDown);
    listenerAttached = false;
  }
}

export const useHotkeyStore = create<HotkeyStore>((set, get) => ({
  hotkeys: new Map(),

  register: (def) => {
    set((state) => {
      const next = new Map(state.hotkeys);
      next.set(def.id, def);
      rebuildIndex(next);
      attachListener();
      return { hotkeys: next };
    });
  },

  unregister: (id) => {
    set((state) => {
      const next = new Map(state.hotkeys);
      next.delete(id);
      rebuildIndex(next);
      if (next.size === 0) detachListener();
      return { hotkeys: next };
    });
  },

  getAll: () => {
    const state = get();
    return Array.from(state.hotkeys.values()).filter(
      (def) => !def.devOnly || process.env.NODE_ENV === 'development'
    );
  },

  getByCategory: (category) => {
    return get()
      .getAll()
      .filter((def) => def.category === category);
  },

  search: (query) => {
    const lower = query.toLowerCase();
    return get()
      .getAll()
      .filter(
        (def) =>
          def.label.toLowerCase().includes(lower) ||
          def.keys.toLowerCase().includes(lower) ||
          def.id.toLowerCase().includes(lower)
      );
  },
}));
