import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { readUserPrefOnce, writeUserPref, PREF_KEYS } from '../utils/userPrefsGun';

const ScanlinesContext = createContext();

export function useScanlinesPreference() {
  const context = useContext(ScanlinesContext);
  if (!context) {
    throw new Error('useScanlinesPreference must be used within ScanlinesProvider');
  }
  return context;
}

export function ScanlinesProvider({ children }) {
  const [storageUserKey, setStorageUserKey] = useState('guest');
  const hydratingRef = useRef(false);
  const loadedKeyRef = useRef('guest');

  const [scanlinesEnabled, setScanlinesEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    hydratingRef.current = true;
    loadedKeyRef.current = storageUserKey || 'guest';
    (async () => {
      try {
        const value = await readUserPrefOnce(storageUserKey, PREF_KEYS.SCANLINES, true);
        if (!cancelled) {
          setScanlinesEnabled(Boolean(value));
        }
      } catch {
        if (!cancelled) {
          setScanlinesEnabled(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageUserKey]);

  // Save to localStorage when changed
  useEffect(() => {
    const resolvedKey = storageUserKey || 'guest';
    if (hydratingRef.current) {
      if (loadedKeyRef.current === resolvedKey) {
        hydratingRef.current = false;
      }
      return;
    }
    void writeUserPref(resolvedKey, PREF_KEYS.SCANLINES, Boolean(scanlinesEnabled));
  }, [scanlinesEnabled, storageUserKey]);

  // Global keyboard listener for 'S' toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 's' || e.key === 'S') {
        setScanlinesEnabled(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleScanlines = () => {
    setScanlinesEnabled(prev => !prev);
  };

  return (
    <ScanlinesContext.Provider value={{ scanlinesEnabled, toggleScanlines, setStorageUserKey }}>
      {children}
    </ScanlinesContext.Provider>
  );
}
