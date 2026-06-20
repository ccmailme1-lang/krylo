// WO-1813 — Project Registry
import { loadProfile } from './userprofile.js';

const STORAGE_KEY = 'krylo_projects';
const MAX_PROJECTS = 50;

export const BAYS = [1, 2, 3];

export function listProjects() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getProjectsByBay(bay) {
  return listProjects().filter(p => p.bay === bay);
}

export function isBayOccupied(bay) {
  return listProjects().some(p => p.bay === bay);
}

export function saveProject(name, sessionState = {}, bay = 1) {
  const projects = listProjects();
  const profile  = loadProfile();
  const existing = projects.find(p => p.name === name.trim());
  const id       = existing?.id ?? crypto.randomUUID();
  const project  = {
    id,
    name:      name.trim() || 'Untitled Project',
    bay:       bay,
    folder:    sessionState.folder    ?? existing?.folder ?? 'My Sessions',
    lens:      sessionState.lens      ?? profile.defaultLens ?? 'GENERAL',
    domain:    sessionState.domain    ?? null,
    situation: sessionState.situation ?? null,
    floor:     sessionState.floor     ?? null,
    horizon:   sessionState.horizon   ?? null,
    query:     sessionState.query     ?? '',
    createdAt: existing?.createdAt    ?? Date.now(),
    updatedAt: Date.now(),
  };
  const next = [project, ...projects].slice(0, MAX_PROJECTS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota exceeded
  }
  return project;
}

export function deleteProject(id) {
  const next = listProjects().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getProject(id) {
  return listProjects().find(p => p.id === id) ?? null;
}
