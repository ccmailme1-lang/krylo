// useprofilestore.js — KRYL-1029 (light). Preset test accounts + who's currently testing.
// No passwords — each tester picks their account so their session data stays tagged to them for
// analysis. Persists to localStorage, so a tester stays signed in across reloads.

import { create } from 'zustand';

const KEY = 'krylo_active_tester_v1';

// Preset test accounts. Rename to your real testers. active:false = OFF (code won't work) until
// activated case-by-case — flip active:true for an account when you hand it out.
export const TEST_PROFILES = Object.freeze([
  { id: 't01', name: 'Tester 01', active: false },
  { id: 't02', name: 'Tester 02', active: false },
  { id: 't03', name: 'Tester 03', active: false },
  { id: 't04', name: 'Tester 04', active: false },
  { id: 't05', name: 'Tester 05', active: false },
  { id: 't06', name: 'Tester 06', active: false },
  { id: 't07', name: 'Tester 07', active: false },
  { id: 't08', name: 'Tester 08', active: false },
  { id: 't09', name: 'Tester 09', active: false },
  { id: 't10', name: 'Tester 10', active: false },
  { id: 't11', name: 'Tester 11', active: false },
  { id: 't12', name: 'Tester 12', active: false },
  { id: 't13', name: 'Tester 13', active: false },
  { id: 't14', name: 'Tester 14', active: false },
  { id: 't15', name: 'Tester 15', active: false },
]);

const load = () => { try { return localStorage.getItem(KEY) || null; } catch { return null; } };

export const useProfileStore = create((set) => ({
  activeId: load(),
  setActive: (id) => { try { localStorage.setItem(KEY, id); } catch {} set({ activeId: id }); },
  clear:     ()   => { try { localStorage.removeItem(KEY); } catch {} set({ activeId: null }); },
}));

// For non-React capture points (session tagging) — the current tester's id / name.
export const getActiveProfile = () => useProfileStore.getState().activeId;
export const activeProfileName = () => {
  const id = getActiveProfile();
  return TEST_PROFILES.find(p => p.id === id)?.name ?? null;
};
