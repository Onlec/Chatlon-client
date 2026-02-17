import React, { createContext, useContext, useState, useEffect } from 'react';
import { log } from '../utils/debug';

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
  const [settings, setSettings] = useState(() => {
    // Load from localStorage
    try {
      const saved = localStorage.getItem('chatlon_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge met defaults (voor nieuwe settings die later toegevoegd worden)
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (e) {
      log('[Settings] Error loading settings:', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Save to localStorage whenever settings change
  useEffect(() => {
    try {
      localStorage.setItem('chatlon_settings', JSON.stringify(settings));
      log('[Settings] Saved settings:', settings);
    } catch (e) {
      log('[Settings] Error saving settings:', e);
    }
  }, [settings]);

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
        getSetting 
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export default SettingsContext;