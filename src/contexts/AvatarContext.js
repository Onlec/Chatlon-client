import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { gun, user } from '../gun';

const AvatarContext = createContext();

export function useAvatar() {
  const context = useContext(AvatarContext);
  if (!context) throw new Error('useAvatar must be used within AvatarProvider');
  return context;
}

const PRESET_AVATARS = ['cat.jpg', 'egg.jpg', 'crab.jpg', 'blocks.jpg', 'pug.jpg'];

// Deterministische fallback op basis van username (altijd dezelfde preset per user)
const fallbackAvatar = (username) => {
  let hash = 0;
  for (let i = 0; i < (username || '').length; i++) {
    hash = ((hash << 5) - hash) + username.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PRESET_AVATARS.length;
  return `/avatars/${PRESET_AVATARS[index]}`;
};

export function AvatarProvider({ children }) {
  const [avatarCache, setAvatarCache] = useState({});
  const [displayNameCache, setDisplayNameCache] = useState({});
  const displayNameCacheRef = useRef({}); // altijd up-to-date, ook in stale Gun callbacks
  const listenersRef = useRef(new Set());
  const pendingSubscriptionsRef = useRef(new Set());

  const subscribeAvatar = useCallback((username) => {
    if (!username || listenersRef.current.has(username)) return;
    listenersRef.current.add(username);

    gun.get('PROFILES').get(username).on((profileData) => {
      if (!profileData) return;

      let resolvedUrl;
      if (profileData.avatarType === 'upload' && profileData.avatar) {
        resolvedUrl = profileData.avatar;
      } else if (profileData.avatarType === 'preset' && profileData.avatar) {
        resolvedUrl = `/avatars/${profileData.avatar}`;
      } else {
        resolvedUrl = fallbackAvatar(username);
      }

      setAvatarCache(prev => {
        if (prev[username] === resolvedUrl) return prev;
        return { ...prev, [username]: resolvedUrl };
      });

      // Display name uitlezen uit hetzelfde PROFILES node
      const newDisplayName = profileData.displayName || '';
      setDisplayNameCache(prev => {
        if (prev[username] === newDisplayName) return prev;
        const next = { ...prev, [username]: newDisplayName };
        displayNameCacheRef.current = next; // ref direct bijwerken
        return next;
      });
    });
  }, []);

  // Voorkomt setState-in-render waarschuwingen wanneer getAvatar/getDisplayName
  // tijdens render worden aangeroepen en Gun direct een callback geeft.
  const scheduleProfileSubscription = useCallback((username) => {
    if (!username || listenersRef.current.has(username) || pendingSubscriptionsRef.current.has(username)) return;
    pendingSubscriptionsRef.current.add(username);
    setTimeout(() => {
      pendingSubscriptionsRef.current.delete(username);
      subscribeAvatar(username);
    }, 0);
  }, [subscribeAvatar]);

  const getAvatar = useCallback((username) => {
    if (!username) return fallbackAvatar('unknown');
    scheduleProfileSubscription(username);
    return avatarCache[username] || fallbackAvatar(username);
  }, [avatarCache, scheduleProfileSubscription]);

  const setMyAvatar = useCallback((avatarValue, avatarType) => {
    if (!user.is) return;
    const username = user.is.alias;

    gun.get('PROFILES').get(username).put({
      avatar: avatarValue,
      avatarType: avatarType,
      updatedAt: Date.now()
    });

    const resolved = avatarType === 'preset'
      ? `/avatars/${avatarValue}`
      : avatarValue;
    setAvatarCache(prev => ({ ...prev, [username]: resolved }));
  }, []);

  const getDisplayName = useCallback((username) => {
    if (!username) return '';
    scheduleProfileSubscription(username); // start Gun listener als nog niet actief
    return displayNameCacheRef.current[username] || displayNameCache[username] || username;
  }, [displayNameCache, scheduleProfileSubscription]);

  // Versie die wacht tot de naam geladen is (voor toasts die direct na verbinding komen)
  const getDisplayNameAsync = useCallback((username, timeout = 1500) => {
    if (!username) return Promise.resolve('');
    // Als de naam al in de cache zit, direct teruggeven
    if (displayNameCacheRef.current[username]) {
      return Promise.resolve(displayNameCacheRef.current[username]);
    }
    scheduleProfileSubscription(username);
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const name = displayNameCacheRef.current[username];
        if (name) return resolve(name);
        if (Date.now() - start > timeout) return resolve(username); // fallback naar email
        setTimeout(check, 100);
      };
      check();
    });
  }, [scheduleProfileSubscription]);

  const setMyDisplayName = useCallback((displayName) => {
    if (!user.is) return;
    const truncated = String(displayName).slice(0, 30);
    const username = user.is.alias;
    gun.get('PROFILES').get(username).put({
      displayName: truncated,
      updatedAt: Date.now()
    });
    setDisplayNameCache(prev => ({ ...prev, [username]: truncated }));
  }, []);

  const clearMyAvatar = useCallback(() => {
    if (!user.is) return;
    const username = user.is.alias;
    const randomPreset = PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)];
    gun.get('PROFILES').get(username).put({
      avatar: randomPreset,
      avatarType: 'preset',
      updatedAt: Date.now()
    });
    setAvatarCache(prev => ({ ...prev, [username]: `/avatars/${randomPreset}` }));
  }, []);

  return (
    <AvatarContext.Provider value={{ getAvatar, setMyAvatar, clearMyAvatar, getDisplayName, getDisplayNameAsync, setMyDisplayName, presets: PRESET_AVATARS }}>
      {children}
    </AvatarContext.Provider>
  );
}

export default AvatarContext;
