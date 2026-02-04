// src/hooks/usePresence.js
/**
 * Presence Management Hook
 * 
 * Beheert de online/offline status van de huidige gebruiker.
 * Ondersteunt heartbeat updates, auto-away detection, en manual status changes.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { gun, user } from '../gun';
import {
  PRESENCE_HEARTBEAT_INTERVAL,
  PRESENCE_TIMEOUT,
  AUTO_AWAY_TIMEOUT,
  STATUS_OPTIONS
} from '../utils/presenceUtils';

/**
 * Hook voor presence/status management.
 * 
 * @param {boolean} isLoggedIn - Of de gebruiker is ingelogd
 * @param {string} currentUser - Huidige username
 * @returns {Object} Presence state en functies
 * 
 * @example
 * const { userStatus, handleStatusChange, cleanup } = usePresence(isLoggedIn, currentUser);
 */
export function usePresence(isLoggedIn, currentUser) {
  const [userStatus, setUserStatus] = useState('online');
  const [isManualStatus, setIsManualStatus] = useState(false);
  
  // Refs voor real-time access in callbacks
  const userStatusRef = useRef(userStatus);
  const isManualStatusRef = useRef(isManualStatus);
  const presenceIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Sync refs met state
  useEffect(() => {
    userStatusRef.current = userStatus;
  }, [userStatus]);

  useEffect(() => {
    isManualStatusRef.current = isManualStatus;
  }, [isManualStatus]);

  /**
   * Update presence in Gun database.
   * @param {string} status - Status value
   */
  const updatePresence = useCallback((status) => {
    if (!user.is || !currentUser) return;

    const presenceData = {
      lastSeen: Date.now(),
      lastActivity: lastActivityRef.current,
      status: status,
      username: currentUser
    };

    gun.get('PRESENCE').get(currentUser).put(presenceData);
    console.log('[usePresence] Updated presence:', status);
  }, [currentUser]);

  /**
   * Set presence to offline in Gun database.
   */
  const setOfflinePresence = useCallback(() => {
    if (!user.is || !currentUser) return;

    gun.get('PRESENCE').get(currentUser).put({
      lastSeen: 0,
      status: 'offline',
      username: currentUser
    });
    console.log('[usePresence] Set offline presence');
  }, [currentUser]);

  /**
   * Handle manual status change by user.
   * @param {string} newStatus - New status value
   */
  const handleStatusChange = useCallback((newStatus) => {
    setIsManualStatus(true);
    setUserStatus(newStatus);
    updatePresence(newStatus);
    console.log('[usePresence] Manual status change:', newStatus);
  }, [updatePresence]);

  /**
   * Update last activity timestamp.
   * Called on user interaction.
   */
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Als status auto-away was en user is actief, zet terug naar online
    // (alleen als geen manual status is ingesteld)
    if (!isManualStatusRef.current && userStatusRef.current === 'away') {
      setUserStatus('online');
      updatePresence('online');
    }
  }, [updatePresence]);

  /**
   * Check for auto-away status.
   * Called periodically by heartbeat.
   */
  const checkAutoAway = useCallback(() => {
    // Skip als manual status is ingesteld
    if (isManualStatusRef.current) return;

    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;

    if (timeSinceActivity > AUTO_AWAY_TIMEOUT && userStatusRef.current === 'online') {
      setUserStatus('away');
      updatePresence('away');
      console.log('[usePresence] Auto-away triggered');
    }
  }, [updatePresence]);

  /**
   * Cleanup function for logout/unmount.
   */
  const cleanup = useCallback(() => {
    setOfflinePresence();
    if (presenceIntervalRef.current) {
      clearInterval(presenceIntervalRef.current);
      presenceIntervalRef.current = null;
    }
    console.log('[usePresence] Cleanup completed');
  }, [setOfflinePresence]);

  // ============================================
  // EFFECTS
  // ============================================

  // Heartbeat effect - periodieke presence updates
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    console.log('[usePresence] Starting heartbeat for:', currentUser);

    // Initial presence update
    updatePresence(userStatusRef.current);

    // Start heartbeat interval
    presenceIntervalRef.current = setInterval(() => {
      updatePresence(userStatusRef.current);
      checkAutoAway();
    }, PRESENCE_HEARTBEAT_INTERVAL);

    return () => {
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = null;
      }
    };
  }, [isLoggedIn, currentUser, updatePresence, checkAutoAway]);

  // beforeunload effect - set offline bij page close
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    const handleBeforeUnload = () => {
      setOfflinePresence();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isLoggedIn, currentUser, setOfflinePresence]);

  // Activity detection effect - track user interactions
  useEffect(() => {
    if (!isLoggedIn) return;

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];

    const handleActivity = () => {
      updateActivity();
    };

    // Throttle activity updates to max 1 per second
    let lastUpdate = 0;
    const throttledHandler = () => {
      const now = Date.now();
      if (now - lastUpdate > 1000) {
        lastUpdate = now;
        handleActivity();
      }
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, throttledHandler, { passive: true });
    });

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, throttledHandler);
      });
    };
  }, [isLoggedIn, updateActivity]);

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    userStatus,
    isManualStatus,
    
    // Actions
    handleStatusChange,
    updateActivity,
    cleanup,
    
    // Utilities
    updatePresence,
    setOfflinePresence,
    
    // Constants (re-export for convenience)
    STATUS_OPTIONS
  };
}

export default usePresence;