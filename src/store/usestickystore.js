// usestickystore.js — KRYL-1051 Sticky-Tape. Free-drop user annotations on the canvas.
// User content ONLY — never system intelligence. Persists to sessionStorage; rides the
// premium export via getStickies(). Free-drop by default; a note may OPTIONALLY be attached to a
// cone (note.coneDomain = §17 domain) — it then shows only when that cone is selected. Attachment
// is a durable semantic tag, not a screen-position pin (per Founder 2026-07-17, supersedes 07-16).

import { create } from 'zustand';

const KEY = 'krylo_stickies_v1';
const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) ?? []; } catch { return []; } };
const save = (arr) => { try { sessionStorage.setItem(KEY, JSON.stringify(arr)); } catch {} };

export const useStickyStore = create((set, get) => ({
  tapeMode: false,                       // dispenser armed → next canvas click drops a note
  stickies: load(),
  lastDeleted: null,                     // last removed note, for Cmd/Ctrl+Z undo

  toggleTapeMode: ()   => set(s => ({ tapeMode: !s.tapeMode })),
  setTapeMode:    (v)  => set({ tapeMode: !!v }),

  addSticky: (x, y) => {
    const s = { id: 'sticky-' + Date.now(), x, y, text: '', ts: Date.now() }; // opens full (industry standard)
    const next = [...get().stickies, s];
    save(next); set({ stickies: next });
    return s.id;
  },
  updateSticky: (id, patch) => {
    const next = get().stickies.map(s => s.id === id ? { ...s, ...patch } : s);
    save(next); set({ stickies: next });
  },
  removeSticky: (id) => {
    const cur = get().stickies;
    const victim = cur.find(s => s.id === id);
    const next = cur.filter(s => s.id !== id);
    save(next); set({ stickies: next, lastDeleted: victim });
  },
  restoreLast: () => {                    // Cmd/Ctrl+Z undo of the last delete
    const v = get().lastDeleted;
    if (!v) return;
    const next = [...get().stickies, v];
    save(next); set({ stickies: next, lastDeleted: null });
  },
  clearStickies: () => { save([]); set({ stickies: [] }); },
}));

// For the premium export path — returns the user's saved stickies.
export const getStickies = () => useStickyStore.getState().stickies;
