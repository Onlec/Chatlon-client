import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { log } from '../utils/debug';
import { readUserPrefOnce, writeUserPref, PREF_KEYS } from '../utils/userPrefsGun';
import { DEFAULT_LUNA_CUSTOM_THEME, normalizeCustomLunaTheme } from '../utils/lunaCustomTheme';

const SettingsContext = createContext();
const OS_STORAGE_KEY = 'chatlon_os';
const DEFAULT_APPEARANCE_VARIANT = 'dx';
const APPEARANCE_SETTING_KEYS = new Set(['fontSize', 'colorScheme', 'customLunaTheme']);

export const DEFAULT_APPEARANCE_SETTINGS = {
  fontSize: 'normaal',
  colorScheme: 'blauw',
  customLunaTheme: DEFAULT_LUNA_CUSTOM_THEME,
};

export const DEFAULT_SHARED_SETTINGS = {
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

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}

export const DEFAULT_SETTINGS = {
  ...DEFAULT_APPEARANCE_SETTINGS,
  ...DEFAULT_SHARED_SETTINGS,
  appearanceByOS: {
    dx: { ...DEFAULT_APPEARANCE_SETTINGS },
    liger: { ...DEFAULT_APPEARANCE_SETTINGS },
  },
};

function normalizeAppearanceVariant(nextVariant) {
  return nextVariant === 'liger' ? 'liger' : DEFAULT_APPEARANCE_VARIANT;
}

function getInitialAppearanceVariant() {
  if (typeof window === 'undefined') {
    return DEFAULT_APPEARANCE_VARIANT;
  }
  return normalizeAppearanceVariant(window.localStorage?.getItem(OS_STORAGE_KEY));
}

function normalizeAppearanceSettings(nextAppearance) {
  const normalizedAppearance =
    nextAppearance && typeof nextAppearance === 'object' ? nextAppearance : {};

  return {
    ...DEFAULT_APPEARANCE_SETTINGS,
    ...normalizedAppearance,
    customLunaTheme: normalizeCustomLunaTheme(normalizedAppearance.customLunaTheme),
  };
}

function normalizeAppearanceByOS(nextSettings) {
  const normalizedSettings =
    nextSettings && typeof nextSettings === 'object' ? nextSettings : {};
  const legacyAppearance = normalizeAppearanceSettings(normalizedSettings);
  const rawAppearanceByOS =
    normalizedSettings.appearanceByOS && typeof normalizedSettings.appearanceByOS === 'object'
      ? normalizedSettings.appearanceByOS
      : {};

  return {
    dx: normalizeAppearanceSettings(rawAppearanceByOS.dx ?? legacyAppearance),
    liger: normalizeAppearanceSettings(rawAppearanceByOS.liger ?? legacyAppearance),
  };
}

function getAppearanceForVariant(settings, appearanceVariant) {
  const normalizedVariant = normalizeAppearanceVariant(appearanceVariant);
  return normalizeAppearanceSettings(settings?.appearanceByOS?.[normalizedVariant]);
}

function createResolvedSettings(settings, appearanceVariant) {
  const appearanceSettings = getAppearanceForVariant(settings, appearanceVariant);
  return {
    ...settings,
    ...appearanceSettings,
  };
}

function createPersistedSettings(settings, appearanceVariant) {
  const appearanceSettings = getAppearanceForVariant(settings, appearanceVariant);
  return {
    ...settings,
    ...appearanceSettings,
  };
}

export function normalizeSettings(nextSettings) {
  const normalizedSettings =
    nextSettings && typeof nextSettings === 'object' ? nextSettings : {};

  return {
    ...DEFAULT_SHARED_SETTINGS,
    ...normalizedSettings,
    appearanceByOS: normalizeAppearanceByOS(normalizedSettings),
  };
}

export function SettingsProvider({ children }) {
  const [storageUserKey, setStorageUserKey] = useState('guest');
  const [appearanceVariant, setAppearanceVariant] = useState(getInitialAppearanceVariant);
  const hydratingRef = useRef(false);
  const loadedKeyRef = useRef('guest');
  const [settingsState, setSettingsState] = useState(() => normalizeSettings(DEFAULT_SETTINGS));
  const settings = useMemo(
    () => createResolvedSettings(settingsState, appearanceVariant),
    [settingsState, appearanceVariant]
  );

  useEffect(() => {
    let cancelled = false;
    hydratingRef.current = true;
    loadedKeyRef.current = storageUserKey || 'guest';
    (async () => {
      try {
        const loaded = await readUserPrefOnce(storageUserKey, PREF_KEYS.SETTINGS, null);
        if (cancelled) return;
        setSettingsState(normalizeSettings(loaded));
      } catch (e) {
        log('[Settings] Error loading user prefs settings:', e);
        if (!cancelled) {
          setSettingsState(normalizeSettings(DEFAULT_SETTINGS));
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
    const persistedSettings = createPersistedSettings(settingsState, appearanceVariant);
    writeUserPref(storageUserKey, PREF_KEYS.SETTINGS, persistedSettings)
      .then(() => {
        log('[Settings] Saved settings:', persistedSettings);
      })
      .catch((e) => {
        log('[Settings] Error saving settings:', e);
      });
  }, [settingsState, storageUserKey, appearanceVariant]);

  // Update single setting
  const updateSetting = (key, value) => {
    setSettingsState((prev) => {
      if (APPEARANCE_SETTING_KEYS.has(key)) {
        const nextAppearance = normalizeAppearanceSettings({
          ...getAppearanceForVariant(prev, appearanceVariant),
          [key]: value,
        });
        return normalizeSettings({
          ...prev,
          appearanceByOS: {
            ...prev.appearanceByOS,
            [normalizeAppearanceVariant(appearanceVariant)]: nextAppearance,
          },
        });
      }
      return normalizeSettings({ ...prev, [key]: value });
    });
  };

  // Update multiple settings at once
  const updateSettings = (updates) => {
    setSettingsState((prev) => {
      const nextUpdates = updates && typeof updates === 'object' ? updates : {};
      const appearanceUpdates = Object.fromEntries(
        Object.entries(nextUpdates).filter(([key]) => APPEARANCE_SETTING_KEYS.has(key))
      );
      const sharedUpdates = Object.fromEntries(
        Object.entries(nextUpdates).filter(([key]) => !APPEARANCE_SETTING_KEYS.has(key))
      );

      const nextSettings = {
        ...prev,
        ...sharedUpdates,
      };

      if (Object.keys(appearanceUpdates).length > 0) {
        nextSettings.appearanceByOS = {
          ...prev.appearanceByOS,
          [normalizeAppearanceVariant(appearanceVariant)]: normalizeAppearanceSettings({
            ...getAppearanceForVariant(prev, appearanceVariant),
            ...appearanceUpdates,
          }),
        };
      }

      return normalizeSettings(nextSettings);
    });
  };

  // Reset to defaults
  const resetSettings = () => {
    setSettingsState((prev) => normalizeSettings({
      ...DEFAULT_SHARED_SETTINGS,
      appearanceByOS: {
        ...normalizeSettings(prev).appearanceByOS,
        [normalizeAppearanceVariant(appearanceVariant)]: normalizeAppearanceSettings(DEFAULT_APPEARANCE_SETTINGS),
      },
    }));
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
        setStorageUserKey,
        appearanceVariant,
        setAppearanceVariant
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export default SettingsContext;
