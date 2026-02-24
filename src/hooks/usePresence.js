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
  AUTO_AWAY_TIMEOUT,
  STATUS_OPTIONS
} from '../utils/presenceUtils';
import { log } from '../utils/debug';

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
export function usePresence(isLoggedIn, currentUser, isActive = true) {
  const [userStatus, setUserStatus] = useState('online');
  const [isManualStatus, setIsManualStatus] = useState(false);
  
  // Refs voor real-time access in callbacks
  const userStatusRef = useRef(userStatus);
  const isManualStatusRef = useRef(isManualStatus);
  const presenceIntervalRef = useRef(null);
  const autoAwayTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const cleanupInProgressRef = useRef(false);
  const autoAwayActiveRef = useRef(false);
  const heartbeatSeqRef = useRef(0);
  const sessionIdRef = useRef('');
  const tabIdRef = useRef('');

  if (!sessionIdRef.current) {
    sessionIdRef.current = `presence_session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
  if (!tabIdRef.current) {
    tabIdRef.current = sessionStorage.getItem('chatlon_tab_client_id') || '';
  }

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
    if (cleanupInProgressRef.current) return;
    if (!user.is || !currentUser) return;

    const now = Date.now();
    heartbeatSeqRef.current += 1;

    const presenceData = {
      lastSeen: now,
      lastActivity: lastActivityRef.current,
      status: status,
      username: currentUser,
      heartbeatAt: now,
      heartbeatSeq: heartbeatSeqRef.current,
      sessionId: sessionIdRef.current,
      tabId: tabIdRef.current,
      source: 'messenger'
    };

    gun.get('PRESENCE').get(currentUser).put(presenceData);
    log('[usePresence] Updated presence:', status);
  }, [currentUser]);

  /**
   * Set presence to offline in Gun database.
   */
  const setOfflinePresence = useCallback(() => {
    if (!user.is || !currentUser) return;

    const now = Date.now();
    heartbeatSeqRef.current += 1;

    gun.get('PRESENCE').get(currentUser).put({
      lastSeen: 0,
      status: 'offline',
      username: currentUser,
      heartbeatAt: now,
      heartbeatSeq: heartbeatSeqRef.current,
      sessionId: sessionIdRef.current,
      tabId: tabIdRef.current,
      source: 'messenger'
    });
    log('[usePresence] Set offline presence');
  }, [currentUser]);

  const stopHeartbeat = useCallback(() => {
    if (presenceIntervalRef.current) {
      clearInterval(presenceIntervalRef.current);
      presenceIntervalRef.current = null;
    }
  }, []);

  const clearAutoAwayTimeout = useCallback(() => {
    if (autoAwayTimeoutRef.current) {
      clearTimeout(autoAwayTimeoutRef.current);
      autoAwayTimeoutRef.current = null;
    }
  }, []);

  const scheduleAutoAwayTimeout = useCallback(() => {
    clearAutoAwayTimeout();
    autoAwayTimeoutRef.current = setTimeout(() => {
      if (isManualStatusRef.current) return;
      if (userStatusRef.current !== 'online') return;
      autoAwayActiveRef.current = true;
      setUserStatus('away');
      updatePresence('away');
      log('[usePresence] Auto-away triggered');
    }, AUTO_AWAY_TIMEOUT);
  }, [clearAutoAwayTimeout, updatePresence]);

  /**
   * Unified status transition path for manual and automatic updates.
   * Keeps local state and presence writes consistent.
   */
  const applyStatusTransition = useCallback((nextStatus, options = {}) => {
    const { manual = false, reason = 'unknown' } = options;
    if (reason === 'auto-away') {
      autoAwayActiveRef.current = true;
    } else if (reason === 'auto-return' || manual || nextStatus === 'online') {
      autoAwayActiveRef.current = false;
    }
    if (manual) {
      setIsManualStatus(true);
    } else if (nextStatus === 'online') {
      // 'Online' betekent terug naar automatische statusmodus.
      setIsManualStatus(false);
    }
    setUserStatus(nextStatus);
    updatePresence(nextStatus);
    if (manual || nextStatus !== 'online') {
      clearAutoAwayTimeout();
    } else {
      scheduleAutoAwayTimeout();
    }
    log('[usePresence] Status transition:', reason, '->', nextStatus);
  }, [clearAutoAwayTimeout, scheduleAutoAwayTimeout, updatePresence]);

  /**
   * Handle manual status change by user.
   * @param {string} newStatus - New status value
   */
  const handleStatusChange = useCallback((newStatus) => {
    const manual = newStatus !== 'online';
    applyStatusTransition(newStatus, { manual, reason: manual ? 'manual' : 'manual-online' });
    log('[usePresence] Manual status change:', newStatus);
  }, [applyStatusTransition]);

  /**
   * Update last activity timestamp.
   * Called on user interaction.
   */
  const updateActivity = useCallback(() => {
    if (!isActive) return;
    lastActivityRef.current = Date.now();

    // Als status auto-away was en user is actief, zet terug naar online
    // (alleen als geen manual status is ingesteld)
    if (!isManualStatusRef.current && autoAwayActiveRef.current) {
      applyStatusTransition('online', { manual: false, reason: 'auto-return' });
      return;
    }

    // Als de user op online staat (niet manual) maar extern als away werd afgeleid
    // op basis van oude lastActivity, push direct een presence refresh.
    // Zo hoeft recovery niet te wachten op de volgende heartbeat tick.
    if (!isManualStatusRef.current && userStatusRef.current === 'online') {
      updatePresence('online');
      scheduleAutoAwayTimeout();
    }
  }, [applyStatusTransition, isActive, scheduleAutoAwayTimeout, updatePresence]);

  /**
   * Cleanup function for logout/unmount.
   */
  const cleanup = useCallback(() => {
    if (cleanupInProgressRef.current) return;
    cleanupInProgressRef.current = true;
    autoAwayActiveRef.current = false;
    clearAutoAwayTimeout();
    stopHeartbeat();
    setOfflinePresence();
    log('[usePresence] Cleanup completed');
    cleanupInProgressRef.current = false;
  }, [clearAutoAwayTimeout, setOfflinePresence, stopHeartbeat]);

  // ============================================
  // EFFECTS
  // ============================================

  // Heartbeat effect - periodieke presence updates
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    if (!isActive) {
      clearAutoAwayTimeout();
      stopHeartbeat();
      setOfflinePresence();
      return;
    }

    log('[usePresence] Starting heartbeat for:', currentUser);

    // Initial presence update
    updatePresence(userStatusRef.current);
    if (!isManualStatusRef.current && userStatusRef.current === 'online') {
      scheduleAutoAwayTimeout();
    }

    // Start heartbeat interval
    presenceIntervalRef.current = setInterval(() => {
      updatePresence(userStatusRef.current);
    }, PRESENCE_HEARTBEAT_INTERVAL);

    return () => {
      clearAutoAwayTimeout();
      stopHeartbeat();
    };
  }, [isLoggedIn, currentUser, isActive, updatePresence, scheduleAutoAwayTimeout, clearAutoAwayTimeout, setOfflinePresence, stopHeartbeat]);

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
    if (!isLoggedIn || !isActive) return;

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];

    const handleActivity = () => {
      updateActivity();
    };

    // Throttle activity updates to max 1 per second
    let lastUpdate = 0;
    const throttledHandler = () => {
      // Instant recovery path: if auto-away is active, recover immediately.
      // This bypasses normal activity throttling for the first interaction.
      if (!isManualStatusRef.current && autoAwayActiveRef.current) {
        handleActivity();
        lastUpdate = Date.now();
        return;
      }

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
  }, [isLoggedIn, isActive, updateActivity]);

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

