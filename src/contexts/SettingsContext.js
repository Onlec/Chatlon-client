import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { log } from '../utils/debug';
import { readUserPrefOnce, writeUserPref, PREF_KEYS } from '../utils/userPrefsGun';

const SettingsContext = createContext();

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}

// Default settings
const DEFAULT_SETTINGS = {
  // Uiterlijk
  fontSize: 'normaal',
  colorScheme: 'blauw',
  
  // Geluid
  systemSounds: true,
  toastNotifications: true,
  nudgeSound: true,
  typingSound: true,
  
  // Netwerk
  autoReconnect: true,
  superpeerEnabled: false,
  
  // Chat
  saveHistory: false, // MSN-authentic: geen history
  showTyping: true,
  emoticons: true,
  
  // Geavanceerd
  debugMode: false,
};

export function SettingsProvider({ children }) {
  const [storageUserKey, setStorageUserKey] = useState('guest');
  const hydratingRef = useRef(false);
  const loadedKeyRef = useRef('guest');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    hydratingRef.current = true;
    loadedKeyRef.current = storageUserKey || 'guest';
    (async () => {
      try {
        const loaded = await readUserPrefOnce(storageUserKey, PREF_KEYS.SETTINGS, DEFAULT_SETTINGS);
        if (cancelled) return;
        setSettings({ ...DEFAULT_SETTINGS, ...(loaded || {}) });
      } catch (e) {
        log('[Settings] Error loading user prefs settings:', e);
        if (!cancelled) {
          setSettings(DEFAULT_SETTINGS);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageUserKey]);

  // Save to Gun USER_PREFS whenever settings change
  useEffect(() => {
    const resolvedKey = storageUserKey || 'guest';
    if (hydratingRef.current) {
      if (loadedKeyRef.current === resolvedKey) {
        hydratingRef.current = false;
      }
      return;
    }
    void writeUserPref(storageUserKey, PREF_KEYS.SETTINGS, settings)
      .then(() => {
        log('[Settings] Saved settings:', settings);
      })
      .catch((e) => {
        log('[Settings] Error saving settings:', e);
      });
  }, [settings, storageUserKey]);

  // Update single setting
    const updateSetting = (key, value) => {
    console.log('[SettingsContext] Updating:', key, value);
    setSettings(prev => {
        const newSettings = { ...prev, [key]: value };
        console.log('[SettingsContext] New settings:', newSettings);
        return newSettings;
    });
    };

  // Update multiple settings at once
  const updateSettings = (updates) => {
    setSettings(prev => ({
      ...prev,
      ...updates
    }));
  };

  // Reset to defaults
  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    log('[Settings] Reset to defaults');
  };

  // Get single setting
  const getSetting = (key) => {
    return settings[key];
  };

  return (
    <SettingsContext.Provider 
      value={{ 
        settings, 
        updateSetting, 
        updateSettings,
        resetSettings,
        getSetting,
        setStorageUserKey
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export default SettingsContext;
