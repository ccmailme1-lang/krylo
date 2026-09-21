// useprofilestore.js — KRYL-1029 (light). Preset test accounts + who's currently testing.
// No passwords — each tester picks their account so their session data stays tagged to them for
// analysis. Persists to localStorage, so a tester stays signed in across reloads.

import { create } from 'zustand';

const KEY = 'krylo_active_tester_v1';

// Preset test accounts. `id` is the code the guest actually types in (profilepicker.jsx does an
// exact match against it) — 2026-09-21: switched from sequential t01-t15 to random 8-char codes
// (crypto.randomBytes, alphabet excludes 0/O/1/I/L for readability) specifically so one guest
// entering their own code can never guess or enumerate another guest's. `name` is
// internal-only (never shown to the guest) — map it to a real participant on your own side,
// never in this file. active:false = OFF (code won't work) until activated case-by-case — flip
// active:true for an account when you hand it out.
export const TEST_PROFILES = Object.freeze([
  { id: 'xs', name: 'Founder', active: true }, // always on — never locks the Founder out
  { id: 'FHFFBAJS', name: 'Participant 01', active: true },
  { id: 'V37JVA8X', name: 'Participant 02', active: false },
  { id: 'VE38DB6K', name: 'Participant 03', active: false },
  { id: 'AB5W9SMJ', name: 'Participant 04', active: false },
  { id: '9T9EDANY', name: 'Participant 05', active: false },
  { id: 'YPH2V6AN', name: 'Participant 06', active: false },
  { id: 'XU2N3PMW', name: 'Participant 07', active: false },
  { id: 'ACRQS3S6', name: 'Participant 08', active: false },
  { id: '3CKMEVY8', name: 'Participant 09', active: false },
  { id: '3GUV4E5G', name: 'Participant 10', active: false },
  { id: '65GAYP2R', name: 'Participant 11', active: false },
  { id: 'BU3YDBXP', name: 'Participant 12', active: false },
  { id: 'DU25FCZN', name: 'Participant 13', active: false },
  { id: '5V6UYTFV', name: 'Participant 14', active: false },
  { id: 'QGATMS3M', name: 'Participant 15', active: false },
  { id: 'DA6N626T', name: 'Participant 16', active: false },
  { id: '93P39JJR', name: 'Participant 17', active: false },
  { id: 'ZB2CBQUY', name: 'Participant 18', active: false },
  { id: '7YYS89VX', name: 'Participant 19', active: false },
  { id: '963VBCJZ', name: 'Participant 20', active: false },
  { id: '3ZEQAREA', name: 'Participant 21', active: false },
  { id: 'B4NUHRQA', name: 'Participant 22', active: false },
  { id: '9QAZ9NME', name: 'Participant 23', active: false },
  { id: '764E2BUS', name: 'Participant 24', active: false },
  { id: '8JA534QP', name: 'Participant 25', active: false },
  { id: 'HAZSAZXV', name: 'Participant 26', active: false },
  { id: 'Q5VUHCS7', name: 'Participant 27', active: false },
  { id: '3DT7N8SE', name: 'Participant 28', active: false },
  { id: 'C5DX7DF7', name: 'Participant 29', active: false },
  { id: 'XM352P7Y', name: 'Participant 30', active: false },
  { id: 'D5V6UW97', name: 'Participant 31', active: false },
  { id: 'EEQR4SU6', name: 'Participant 32', active: false },
  { id: 'X3J4V96W', name: 'Participant 33', active: false },
  { id: '5ACVVZGB', name: 'Participant 34', active: false },
  { id: 'ANX3862K', name: 'Participant 35', active: false },
  { id: 'QRU4HECZ', name: 'Participant 36', active: false },
  { id: 'N6259D8N', name: 'Participant 37', active: false },
  { id: 'PFWHWFQQ', name: 'Participant 38', active: false },
  { id: 'TZ596FGX', name: 'Participant 39', active: false },
  { id: '6HTAXX5Z', name: 'Participant 40', active: false },
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
