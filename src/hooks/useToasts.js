// src/hooks/useToasts.js
/**
 * Toast Notifications Hook
 * 
 * Beheert toast notificaties voor de applicatie.
 * Ondersteunt duplicate detection, auto-dismiss, en click handlers.
 */

import { useState, useRef, useCallback } from 'react';
import { log } from '../utils/debug';

/**
 * @typedef {Object} Toast
 * @property {string} id - Unieke toast ID
 * @property {string} from - Afzender naam
 * @property {string} message - Toast bericht
 * @property {string} avatar - Avatar URL
 * @property {string} type - Toast type ('message' | 'friendRequest' | 'nudge')
 * @property {string} [contactName] - Contact naam voor message toasts
 * @property {string} [requestId] - Request ID voor friend request toasts
 * @property {string} [sessionId] - Session ID voor message toasts
 * @property {string} [messageId] - Message ID voor message toasts
 */

/**
 * Hook voor toast notificatie management.
 * 
 * @param {Object} options - Configuratie opties
 * @param {string} [options.soundUrl='/nudge.mp3'] - URL voor notificatie geluid
 * @param {number} [options.maxToasts=5] - Maximum aantal gelijktijdige toasts
 * @returns {Object} Toast state en functies
 * 
 * @example
 * const { toasts, showToast, removeToast } = useToasts();
 * 
 * showToast({
 *   from: 'Alice',
 *   message: 'Hey!',
 *   avatar: 'https://...',
 *   type: 'message',
 *   contactName: 'Alice'
 * });
 */
export function useToasts(options = {}) {
  const {
    soundUrl = '/alert.mp3',
    maxToasts = 5
  } = options;

  const [toasts, setToasts] = useState([]);
  const shownToastsRef = useRef(new Set());

  /**
   * Genereert een unieke toast key voor duplicate detection.
   * @param {Object} toastData - Toast data
   * @returns {string} Unieke key
   */
  const generateToastKey = useCallback((toastData) => {
    if (toastData.type === 'message') {
      return `msg_${toastData.contactName}_${toastData.messageId || Date.now()}_${toastData.sessionId || ''}`;
    }
    if (toastData.type === 'friendRequest') {
      return `friendreq_${toastData.from}_${toastData.requestId || Date.now()}`;
    }
    if (toastData.type === 'nudge') {
      return `nudge_${toastData.from}_${Date.now()}`;
    }
    if (toastData.type === 'presence') {
      // Cooldown van 5 seconden per contact (voor debugging; later verhogen)
      const timeBucket = Math.floor(Date.now() / 5000);
      return `presence_${toastData.contactName}_${timeBucket}`;
    }
    return `toast_${Date.now()}_${Math.random()}`;
  }, []);

  /**
   * Controleert of een toast al getoond is.
   * @param {string} key - Toast key
   * @returns {boolean}
   */
  const isToastShown = useCallback((key) => {
    return shownToastsRef.current.has(key);
  }, []);

  /**
   * Markeert een toast als getoond.
   * @param {string} key - Toast key
   */
  const markToastShown = useCallback((key) => {
    shownToastsRef.current.add(key);
  }, []);

  /**
   * Speelt het notificatie geluid af.
   */
  const playSound = useCallback(() => {
    try {
      new Audio(soundUrl).play().catch(() => {
        // Silently fail - browser might block autoplay
      });
    } catch (e) {
      // Audio not supported
    }
  }, [soundUrl]);

  /**
   * Toont een nieuwe toast notificatie.
   * @param {Partial<Toast>} toastData - Toast data
   * @returns {string|null} Toast ID of null als duplicate
   */
  const showToast = useCallback((toastData) => {
    const toastKey = generateToastKey(toastData);

    // Duplicate check
    if (isToastShown(toastKey)) {
      log('[useToasts] Duplicate toast, skipping:', toastKey);
      return null;
    }

    // Mark as shown
    markToastShown(toastKey);

    // Generate unique ID
    const toastId = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Play sound
    playSound();

    // Add toast
    setToasts(prev => {
      // Enforce max toasts limit
      const newToasts = [...prev, { id: toastId, ...toastData }];
      if (newToasts.length > maxToasts) {
        return newToasts.slice(-maxToasts);
      }
      return newToasts;
    });

    log('[useToasts] Toast shown:', toastId, toastData.type);
    return toastId;
  }, [generateToastKey, isToastShown, markToastShown, playSound, maxToasts]);

  /**
   * Verwijdert een toast.
   * @param {string} toastId - Toast ID om te verwijderen
   */
  const removeToast = useCallback((toastId) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
  }, []);

  /**
   * Verwijdert alle toasts.
   */
  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  /**
   * Reset de shown toasts tracking.
   * Gebruik dit bij logout of session reset.
   */
  const resetShownToasts = useCallback(() => {
    shownToastsRef.current.clear();
  }, []);

  return {
    // State
    toasts,
    
    // Actions
    showToast,
    removeToast,
    clearAllToasts,
    
    // Utilities
    isToastShown,
    markToastShown,
    resetShownToasts,
    
    // Ref for direct access (useful for listeners)
    shownToastsRef
  };
}

export default useToasts;