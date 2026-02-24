import { useCallback, useEffect, useRef, useState } from 'react';
import { gun, user } from '../gun';
import { log } from '../utils/debug';
import { getPresenceStatus } from '../utils/presenceUtils';
import { getPresenceEligibility } from '../utils/contactModel';

export function usePresenceCoordinator({
  isLoggedIn,
  currentUser,
  onContactOnline
}) {
  const [contactPresence, setContactPresence] = useState({});
  const prevPresenceRef = useRef({});
  const presenceListenersRef = useRef(new Map());
  const contactsMapNodeRef = useRef(null);
  const onContactOnlineRef = useRef(onContactOnline);

  useEffect(() => {
    onContactOnlineRef.current = onContactOnline;
  }, [onContactOnline]);

  const detachPresenceListener = useCallback((username) => {
    const existing = presenceListenersRef.current.get(username);
    if (!existing) return;
    if (existing.off) existing.off();
    presenceListenersRef.current.delete(username);
    delete prevPresenceRef.current[username];
    setContactPresence((prev) => {
      if (!(username in prev)) return prev;
      const next = { ...prev };
      delete next[username];
      return next;
    });
    log('[PresenceMonitor] Listener verwijderd voor contact:', username);
  }, []);

  const cleanupPresenceListeners = useCallback(() => {
    const contactsMapNode = contactsMapNodeRef.current;
    if (contactsMapNode && contactsMapNode.off) contactsMapNode.off();
    contactsMapNodeRef.current = null;

    presenceListenersRef.current.forEach((node) => {
      if (node?.off) node.off();
    });
    presenceListenersRef.current.clear();
    prevPresenceRef.current = {};
  }, []);

  const resetPresenceState = useCallback(() => {
    cleanupPresenceListeners();
    setContactPresence({});
  }, [cleanupPresenceListeners]);

  const hasPresenceListener = useCallback((username) => {
    return presenceListenersRef.current.has(username);
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    log('[PresenceMonitor] Start voor:', currentUser);
    const prevPresence = prevPresenceRef.current;
    const contactListeners = presenceListenersRef.current;

    const contactsMapNode = user.get('contacts').map();
    contactsMapNodeRef.current = contactsMapNode;

    contactsMapNode.on((contactData, key) => {
      const { username, eligible: isEligible } = getPresenceEligibility(contactData, key);

      if (!isEligible) {
        if (username) detachPresenceListener(username);
        return;
      }

      if (contactListeners.has(username)) return;

      log('[PresenceMonitor] Listener op voor contact:', username);
      const node = gun.get('PRESENCE').get(username);
      node.on((presenceData) => {
        if (!(username in prevPresence)) {
          if (presenceData) {
            prevPresence[username] = {
              lastSeen: presenceData.lastSeen || 0,
              statusValue: getPresenceStatus(presenceData).value
            };
            setContactPresence((prev) => ({ ...prev, [username]: { ...presenceData } }));
          } else {
            prevPresence[username] = null;
          }
          return;
        }
        if (!presenceData) return;

        const newStatus = getPresenceStatus(presenceData);
        const prevStatusValue = prevPresence[username]?.statusValue ?? 'offline';
        if (prevStatusValue === newStatus.value) return;

        log('[PresenceMonitor]', username, '| prev:', prevStatusValue, '-> new:', newStatus.value);

        if (prevStatusValue === 'offline' && newStatus.value !== 'offline') {
          log('[PresenceMonitor] ONLINE TRANSITIE voor:', username);
          if (onContactOnlineRef.current) onContactOnlineRef.current(username);
        }

        prevPresence[username] = {
          lastSeen: presenceData.lastSeen || 0,
          statusValue: newStatus.value
        };
        setContactPresence((prev) => ({ ...prev, [username]: { ...presenceData } }));
      });
      contactListeners.set(username, node);
    });

    return () => {
      cleanupPresenceListeners();
    };
  }, [isLoggedIn, currentUser, detachPresenceListener, cleanupPresenceListeners]);

  return {
    contactPresence,
    resetPresenceState,
    cleanupPresenceListeners,
    hasPresenceListener
  };
}

export default usePresenceCoordinator;
