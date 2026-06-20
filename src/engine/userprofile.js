// WO-1812 — User Profile Layer
const STORAGE_KEY = 'krylo_user_profile';

export const DEFAULT_PROFILE = {
  defaultLens:                'GENERAL',
  signalSensitivityThreshold: 70,
  signalWindow:               '72H',
  autoAdvance:                true,
  metadata: {
    createdAt: null,
    updatedAt: null,
  },
};

export function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE, metadata: { createdAt: Date.now(), updatedAt: Date.now() } };
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROFILE, metadata: { createdAt: Date.now(), updatedAt: Date.now() } };
  }
}

export function saveProfile(updates) {
  const current = loadProfile();
  const next = {
    ...current,
    ...updates,
    metadata: { ...current.metadata, updatedAt: Date.now() },
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota exceeded — profile is best-effort
  }
  return next;
}

export function resetProfile() {
  localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_PROFILE, metadata: { createdAt: Date.now(), updatedAt: Date.now() } };
}
