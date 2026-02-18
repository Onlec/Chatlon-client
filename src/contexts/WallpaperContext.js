import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { gun, user } from '../gun';

const WallpaperContext = createContext();

export function useWallpaper() {
  const context = useContext(WallpaperContext);
  if (!context) throw new Error('useWallpaper must be used within WallpaperProvider');
  return context;
}

const PRESET_WALLPAPERS = [
  'background.jpg'
];

const DEFAULT_WALLPAPER = '/bg/background.jpg';

export function WallpaperProvider({ children }) {
  const [wallpaper, setWallpaper] = useState(DEFAULT_WALLPAPER);
  const [wallpaperType, setWallpaperType] = useState('preset');
  const [listening, setListening] = useState(false);

  // Luister naar Gun PROFILES voor wallpaper data van ingelogde user
  useEffect(() => {
    if (!user.is || listening) return;
    const username = user.is.alias;
    if (!username) return;

    setListening(true);
    gun.get('PROFILES').get(username).on((profileData) => {
      if (!profileData) return;

      if (profileData.wallpaperType === 'upload' && profileData.wallpaper) {
        setWallpaper(profileData.wallpaper);
        setWallpaperType('upload');
      } else if (profileData.wallpaperType === 'preset' && profileData.wallpaper) {
        setWallpaper(`/bg/${profileData.wallpaper}`);
        setWallpaperType('preset');
      } else if (profileData.wallpaperType === 'color' && profileData.wallpaper) {
        setWallpaper(profileData.wallpaper);
        setWallpaperType('color');
      }
      // Geen wallpaper data → default blijft staan
    });
  }, [listening]);

  const setMyWallpaper = useCallback((value, type) => {
    if (!user.is) return;
    const username = user.is.alias;

    gun.get('PROFILES').get(username).put({
      wallpaper: value,
      wallpaperType: type,
      updatedAt: Date.now()
    });

    if (type === 'preset') {
      setWallpaper(`/bg/${value}`);
    } else {
      setWallpaper(value);
    }
    setWallpaperType(type);
  }, []);

  const resetWallpaper = useCallback(() => {
    if (!user.is) return;
    const username = user.is.alias;

    gun.get('PROFILES').get(username).put({
      wallpaper: 'background.jpg',
      wallpaperType: 'preset',
      updatedAt: Date.now()
    });

    setWallpaper(DEFAULT_WALLPAPER);
    setWallpaperType('preset');
  }, []);

  const getWallpaperStyle = useCallback(() => {
    if (wallpaperType === 'color') {
      return { background: wallpaper };
    }
    return {
      backgroundImage: `url(${wallpaper})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center center',
      backgroundRepeat: 'no-repeat'
    };
  }, [wallpaper, wallpaperType]);

  return (
    <WallpaperContext.Provider value={{
      wallpaper,
      wallpaperType,
      presets: PRESET_WALLPAPERS,
      setMyWallpaper,
      resetWallpaper,
      getWallpaperStyle
    }}>
      {children}
    </WallpaperContext.Provider>
  );
}

export default WallpaperContext;
