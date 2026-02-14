// src/hooks/useSuperpeer.js
/**
 * Superpeer Hook
 * 
 * Promoveert stabiele, langdurig-online clients tot "superpeers"
 * die actief Gun data doorgeven aan andere browsers.
 * 
 * Selectiecriteria:
 * - Online > 10 minuten
 * - Desktop browser (niet mobiel)
 * - Automatisch opt-in (geen user actie nodig)
 * 
 * Andere clients ontdekken superpeers via Gun en voegen
 * ze toe als extra peers voor redundantie.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { gun } from '../gun';
import { log } from '../utils/debug';

const SUPERPEER_QUALIFY_TIME = 1 * 60 * 1000;  // 10 minuten
const SUPERPEER_HEARTBEAT_INTERVAL = 15000;       // 15s
const SUPERPEER_TIMEOUT = 30000;                   // 30s stale threshold
const MAX_SUPERPEER_CONNECTIONS = 5;               // Max peers om te verbinden

/**
 * Detecteer of dit een desktop browser is.
 */
function isDesktopBrowser() {
  const ua = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  return !isMobile;
}

/**
 * @param {boolean} isLoggedIn
 * @param {string} currentUser
 */
export function useSuperpeer(isLoggedIn, currentUser) {
  const [isSuperpeer, setIsSuperpeer] = useState(false);
  const [connectedSuperpeers, setConnectedSuperpeers] = useState(0);

  const loginTimeRef = useRef(null);
  const heartbeatRef = useRef(null);
  const qualifyTimerRef = useRef(null);
  const discoveredPeersRef = useRef(new Set());

  // ============================================
  // SUPERPEER REGISTRATIE
  // ============================================

  const registerAsSuperpeer = useCallback(() => {
    if (!currentUser) return;

    log('[Superpeer] Registering as superpeer:', currentUser);
    setIsSuperpeer(true);

    const now = Date.now();
    gun.get('SUPERPEERS').get(currentUser).put({
      available: true,
      since: now,
      heartbeat: now,
      isDesktop: true,
      username: currentUser
    });

    // Start heartbeat
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      gun.get('SUPERPEERS').get(currentUser).put({
        available: true,
        since: loginTimeRef.current,
        heartbeat: Date.now(),
        isDesktop: true,
        username: currentUser
      });
    }, SUPERPEER_HEARTBEAT_INTERVAL);
  }, [currentUser]);

  const unregisterAsSuperpeer = useCallback(() => {
    if (!currentUser) return;

    log('[Superpeer] Unregistering as superpeer:', currentUser);
    setIsSuperpeer(false);

    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    gun.get('SUPERPEERS').get(currentUser).put({
      available: false,
      heartbeat: 0,
      username: currentUser
    });
  }, [currentUser]);

  // ============================================
  // SUPERPEER DISCOVERY
  // ============================================

  const discoverSuperpeers = useCallback(() => {
    if (!currentUser) return;

    log('[Superpeer] Discovering available superpeers...');

    gun.get('SUPERPEERS').map().on((data, username) => {
      if (!data || !data.available || username === currentUser) return;
      if (!data.heartbeat || (Date.now() - data.heartbeat > SUPERPEER_TIMEOUT)) return;

      // Al verbonden?
      if (discoveredPeersRef.current.has(username)) return;
      if (discoveredPeersRef.current.size >= MAX_SUPERPEER_CONNECTIONS) return;

      discoveredPeersRef.current.add(username);
      setConnectedSuperpeers(discoveredPeersRef.current.size);
      log('[Superpeer] Discovered active superpeer:', username);
    });
  }, [currentUser]);

  // Cleanup stale superpeers uit discovery lijst
  useEffect(() => {
    if (!isLoggedIn) return;

    const cleanupInterval = setInterval(() => {
      const toRemove = [];

      discoveredPeersRef.current.forEach(username => {
        gun.get('SUPERPEERS').get(username).once((data) => {
          if (!data || !data.available || !data.heartbeat || (Date.now() - data.heartbeat > SUPERPEER_TIMEOUT)) {
            toRemove.push(username);
          }
        });
      });

      // Wacht kort op Gun .once() callbacks
      setTimeout(() => {
        if (toRemove.length > 0) {
          toRemove.forEach(u => discoveredPeersRef.current.delete(u));
          setConnectedSuperpeers(discoveredPeersRef.current.size);
          log('[Superpeer] Removed stale superpeers:', toRemove);
        }
      }, 1000);
    }, SUPERPEER_TIMEOUT);

    return () => clearInterval(cleanupInterval);
  }, [isLoggedIn]);

  // ============================================
  // QUALIFICATION & LIFECYCLE
  // ============================================

  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    loginTimeRef.current = Date.now();

    // Start discovery direct
    discoverSuperpeers();

    // Kwalificeer als superpeer na 10 minuten
    if (isDesktopBrowser()) {
      log('[Superpeer] Desktop detected, qualifying in', SUPERPEER_QUALIFY_TIME / 1000, 'seconds');

      qualifyTimerRef.current = setTimeout(() => {
        log('[Superpeer] Qualification time reached');
        registerAsSuperpeer();
      }, SUPERPEER_QUALIFY_TIME);
    } else {
      log('[Superpeer] Mobile detected, not qualifying as superpeer');
    }

    return () => {
      if (qualifyTimerRef.current) {
        clearTimeout(qualifyTimerRef.current);
        qualifyTimerRef.current = null;
      }
      unregisterAsSuperpeer();
    };
  }, [isLoggedIn, currentUser]);

  // Cleanup bij page close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentUser && isSuperpeer) {
        gun.get('SUPERPEERS').get(currentUser).put({
          available: false,
          heartbeat: 0,
          username: currentUser
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentUser, isSuperpeer]);

  return {
    isSuperpeer,
    connectedSuperpeers
  };
}

export default useSuperpeer;