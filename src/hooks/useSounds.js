import { useEffect, useRef } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { log } from '../utils/debug';

/**
 * Sound files - Base64 encoded short sound effects
 * (MSN Messenger style sounds)
 */
const SOUNDS = {
  // MSN Messenger authentic sounds (deze URLs kan je vervangen met je eigen)
  message: '/sounds/message.mp3',
  nudge: '/sounds/nudge.mp3',
  typing: '/sounds/typing.mp3',
  login: '/sounds/login.mp3',
  logoff: '/sounds/logoff.mp3',
  error: '/sounds/error.mp3',
};

/**
 * Hook voor sound management
 * Checkt settings en speelt sounds af
 */
export function useSounds() {
  const { settings } = useSettings();
  const audioRefs = useRef({});

  // Pre-load audio elements
  useEffect(() => {
    Object.entries(SOUNDS).forEach(([name, src]) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audioRefs.current[name] = audio;
    });

    return () => {
      // Cleanup
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  /**
   * Play a sound if settings allow it
   */
  const playSound = (soundName) => {
    // Check if system sounds are enabled
    if (!settings.systemSounds) {
      log('[Sound] System sounds disabled');
      return;
    }

    // Check specific sound settings
    if (soundName === 'nudge' && !settings.nudgeSound) {
      log('[Sound] Nudge sound disabled');
      return;
    }

    if (soundName === 'typing' && !settings.typingSound) {
      log('[Sound] Typing sound disabled');
      return;
    }

    // Play the sound
    const audio = audioRefs.current[soundName];
    if (audio) {
      audio.currentTime = 0; // Reset to start
      audio.play().catch(err => {
        log('[Sound] Error playing sound:', err);
      });
    }
  };

  /**
   * Play a sound and return a Promise that resolves when it ends.
   * Resolves immediately if sounds are disabled or the file fails to load.
   */
  const playSoundAsync = (soundName) => {
    return new Promise((resolve) => {
      if (!settings.systemSounds) { resolve(); return; }

      const audio = audioRefs.current[soundName];
      if (!audio) { resolve(); return; }

      audio.currentTime = 0;
      audio.addEventListener('ended', resolve, { once: true });
      audio.addEventListener('error', resolve, { once: true });
      audio.play().catch(() => resolve());
    });
  };

  return {
    playSound,
    playSoundAsync
  };
}

export default useSounds;