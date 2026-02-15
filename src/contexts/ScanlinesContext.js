import React, { createContext, useContext, useState, useEffect } from 'react';

const ScanlinesContext = createContext();

export function useScanlinesPreference() {
  const context = useContext(ScanlinesContext);
  if (!context) {
    throw new Error('useScanlinesPreference must be used within ScanlinesProvider');
  }
  return context;
}

export function ScanlinesProvider({ children }) {
  const [scanlinesEnabled, setScanlinesEnabled] = useState(() => {
    // Load from localStorage
    const saved = localStorage.getItem('chatlon_scanlines');
    return saved !== null ? saved === 'true' : true; // Default: true
  });

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('chatlon_scanlines', scanlinesEnabled.toString());
  }, [scanlinesEnabled]);

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
    <ScanlinesContext.Provider value={{ scanlinesEnabled, toggleScanlines }}>
      {children}
    </ScanlinesContext.Provider>
  );
}