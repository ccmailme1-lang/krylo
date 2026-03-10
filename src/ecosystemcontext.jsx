// ecosystemcontext.jsx
// WO-227 — Extracted from app.jsx to fix Vite HMR export violation
// Location: src/ecosystemcontext.jsx
import { createContext, useContext } from 'react';

export const ecosystemcontext = createContext();
export function useecosystem() { return useContext(ecosystemcontext); }
