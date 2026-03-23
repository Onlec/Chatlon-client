import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { readUserPrefOnce, writeUserPref, PREF_KEYS } from '../utils/userPrefsGun';

const BezelContext = createContext();

export function useBezel() {
  const context = useContext(BezelContext);
  if (!context) {
    throw new Error('useBezel must be used within BezelProvider');
  }
  return context;
}

export function BezelProvider({ children }) {
  const [storageUserKey, setStorageUserKey] = useState('guest');
  const hydratingRef = useRef({ bezelEnabled: false, crtCurve: false, crtScanlines: false });
  const loadedKeyRef = useRef('guest');

  const [bezelEnabled, setBezelEnabled] = useState(false);
  const [crtCurve, setCrtCurve] = useState(true);
  const [crtScanlines, setCrtScanlines] = useState(true);

  useEffect(() => {
    let cancelled = false;
    hydratingRef.current = { bezelEnabled: true, crtCurve: true, crtScanlines: true };
    loadedKeyRef.current = storageUserKey || 'guest';
    (async () => {
      try {
        const [en, curve, scanlines] = await Promise.all([
          readUserPrefOnce(storageUserKey, PREF_KEYS.BEZEL_ENABLED, false),
          readUserPrefOnce(storageUserKey, PREF_KEYS.CRT_CURVE, true),
          readUserPrefOnce(storageUserKey, PREF_KEYS.CRT_SCANLINES, true),
        ]);
        if (!cancelled) {
          setBezelEnabled(Boolean(en));
          setCrtCurve(Boolean(curve));
          setCrtScanlines(Boolean(scanlines));
        }
      } catch {
        // keep defaults
      } finally {
        if (!cancelled) {
          hydratingRef.current = { bezelEnabled: false, crtCurve: false, crtScanlines: false };
        }
      }
    })();
    return () => { cancelled = true; };
  }, [storageUserKey]);

  useEffect(() => {
    if (hydratingRef.current.bezelEnabled) return;
    void writeUserPref(storageUserKey || 'guest', PREF_KEYS.BEZEL_ENABLED, Boolean(bezelEnabled));
  }, [bezelEnabled, storageUserKey]);

  useEffect(() => {
    if (hydratingRef.current.crtCurve) return;
    void writeUserPref(storageUserKey || 'guest', PREF_KEYS.CRT_CURVE, Boolean(crtCurve));
  }, [crtCurve, storageUserKey]);

  useEffect(() => {
    if (hydratingRef.current.crtScanlines) return;
    void writeUserPref(storageUserKey || 'guest', PREF_KEYS.CRT_SCANLINES, Boolean(crtScanlines));
  }, [crtScanlines, storageUserKey]);

  const bezel = { bezelEnabled, crtCurve, crtScanlines };

  const updateBezel = (key, value) => {
    if (key === 'bezelEnabled') setBezelEnabled(value);
    else if (key === 'crtCurve') setCrtCurve(value);
    else if (key === 'crtScanlines') setCrtScanlines(value);
  };

  return (
    <BezelContext.Provider value={{ bezel, updateBezel, setStorageUserKey }}>
      {children}
    </BezelContext.Provider>
  );
}

export default BezelContext;
