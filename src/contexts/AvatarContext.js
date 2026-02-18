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
  const listenersRef = useRef(new Set());

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
    });
  }, []);

  const getAvatar = useCallback((username) => {
    if (!username) return fallbackAvatar('unknown');
    subscribeAvatar(username);
    return avatarCache[username] || fallbackAvatar(username);
  }, [avatarCache, subscribeAvatar]);

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
    <AvatarContext.Provider value={{ getAvatar, setMyAvatar, clearMyAvatar, presets: PRESET_AVATARS }}>
      {children}
    </AvatarContext.Provider>
  );
}

export default AvatarContext;
