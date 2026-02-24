import { useCallback, useEffect, useRef, useState } from 'react';
import { gun, user } from '../gun';
import { log } from '../utils/debug';
import { getPresenceEligibility } from '../utils/contactModel';
import {
  PRESENCE_ONLINE_GRACE_MS,
  PRESENCE_OFFLINE_GRACE_MS,
  PRESENCE_MIN_DWELL_MS,
  computePresenceState,
  shouldEmitOnlineTransition,
  isStaleTransition
} from '../utils/presencePolicy';

export function usePresenceCoordinator({
  isLoggedIn,
  currentUser,
  onContactOnline,
  priorityContacts = [],
  isMessengerActive = true
}) {
  const [contactPresence, setContactPresence] = useState({});
  const [presenceMetaByUser, setPresenceMetaByUser] = useState({});
  const prevPresenceRef = useRef({});
  const presenceListenersRef = useRef(new Map());
  const contactsMapNodeRef = useRef(null);
  const priorityContactsRef = useRef(new Set());
  const attachQueueRef = useRef([]);
  const attachQueueSetRef = useRef(new Set());
  const attachTimerRef = useRef(null);
  const attachListenerFnRef = useRef(null);
  const eligibleContactsRef = useRef(new Set());
  const onContactOnlineRef = useRef(onContactOnline);
  const policyConfigRef = useRef({
    onlineGraceMs: PRESENCE_ONLINE_GRACE_MS,
    offlineGraceMs: PRESENCE_OFFLINE_GRACE_MS,
    minDwellMs: PRESENCE_MIN_DWELL_MS
  });
  const metricsRef = useRef({
    attached: 0,
    detached: 0,
    queued: 0,
    immediateAttached: 0,
    transitionsEmitted: 0,
    transitionsSuppressed: 0,
    staleSkipped: 0
  });

  useEffect(() => {
    onContactOnlineRef.current = onContactOnline;
  }, [onContactOnline]);

  useEffect(() => {
    priorityContactsRef.current = new Set((priorityContacts || []).filter(Boolean));
    const attachNow = attachListenerFnRef.current;
    if (!attachNow) return;
    priorityContactsRef.current.forEach((username) => {
      if (!eligibleContactsRef.current.has(username)) return;
      if (presenceListenersRef.current.has(username)) return;
      attachNow(username);
    });
  }, [priorityContacts]);

  const detachPresenceListener = useCallback((username) => {
    const existing = presenceListenersRef.current.get(username);
    if (!existing) return;
    if (existing.off) existing.off();
    presenceListenersRef.current.delete(username);
    metricsRef.current.detached += 1;
    delete prevPresenceRef.current[username];
    setContactPresence((prev) => {
      if (!(username in prev)) return prev;
      const next = { ...prev };
      delete next[username];
      return next;
    });
    setPresenceMetaByUser((prev) => {
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
    if (attachTimerRef.current) {
      clearTimeout(attachTimerRef.current);
      attachTimerRef.current = null;
    }
    attachQueueRef.current = [];
    attachQueueSetRef.current.clear();
    eligibleContactsRef.current.clear();
    attachListenerFnRef.current = null;
    prevPresenceRef.current = {};
    setPresenceMetaByUser({});

    log('[PresenceMonitor][metrics] cleanup snapshot', { ...metricsRef.current });
  }, []);

  const resetPresenceState = useCallback(() => {
    cleanupPresenceListeners();
    setContactPresence({});
  }, [cleanupPresenceListeners]);

  const hasPresenceListener = useCallback((username) => {
    return presenceListenersRef.current.has(username);
  }, []);

  const getPresenceHealth = useCallback((username) => {
    return presenceMetaByUser[username] || null;
  }, [presenceMetaByUser]);

  useEffect(() => {
    if (!isLoggedIn || !currentUser || !isMessengerActive) {
      cleanupPresenceListeners();
      setContactPresence({});
      return;
    }

    log('[PresenceMonitor] Start voor:', currentUser);
    const prevPresence = prevPresenceRef.current;
    const contactListeners = presenceListenersRef.current;
    const attachQueue = attachQueueRef.current;
    const attachQueueSet = attachQueueSetRef.current;
    const eligibleContacts = eligibleContactsRef.current;

    const attachPresenceListener = (username) => {
      if (!username) return;
      if (!eligibleContacts.has(username)) return;
      if (contactListeners.has(username)) return;

      log('[PresenceMonitor] Listener op voor contact:', username);
      metricsRef.current.attached += 1;
      const node = gun.get('PRESENCE').get(username);
      node.on((presenceData) => {
        const now = Date.now();
        const policyConfig = policyConfigRef.current;
        const nextComputedBase = computePresenceState(presenceData, now);
        const hasExplicitOfflineSignal = (
          presenceData?.status === 'appear-offline'
          || presenceData?.status === 'offline'
          || Number(presenceData?.lastSeen) === 0
        );

        if (!(username in prevPresence)) {
          if (presenceData) {
            prevPresence[username] = {
              lastSeen: presenceData.lastSeen || 0,
              statusValue: nextComputedBase.value,
              presenceStatusValue: nextComputedBase.statusValue,
              lastHeartbeatAt: Number(nextComputedBase.heartbeatAt || 0),
              lastHeartbeatSeq: Number(nextComputedBase.heartbeatSeq || 0),
              lastSessionId: nextComputedBase.sessionId || '',
              offlineGraceStartAt: 0,
              onlineGraceStartAt: 0,
              computed: {
                ...nextComputedBase,
                transitionedAt: now
              }
            };
            setContactPresence((prev) => ({ ...prev, [username]: { ...presenceData } }));
            setPresenceMetaByUser((prev) => ({
              ...prev,
              [username]: prevPresence[username]
            }));
          } else {
            prevPresence[username] = null;
          }
          return;
        }
        if (!presenceData) return;

        const prevSnapshot = prevPresence[username] || {};
        const prevComputed = prevSnapshot.computed || {
          value: prevSnapshot.statusValue || 'offline',
          observedAt: now,
          transitionedAt: 0
        };
        const prevHeartbeatAt = Number(prevSnapshot.lastHeartbeatAt || prevComputed.heartbeatAt || 0);
        const prevHeartbeatSeq = Number(prevSnapshot.lastHeartbeatSeq || prevComputed.heartbeatSeq || 0);
        const prevSessionId = prevSnapshot.lastSessionId || prevComputed.sessionId || '';
        const nextHeartbeatAt = Number(nextComputedBase.heartbeatAt || 0);
        const nextHeartbeatSeq = Number(nextComputedBase.heartbeatSeq || 0);
        const nextSessionId = nextComputedBase.sessionId || '';

        const isOlderHeartbeat =
          nextHeartbeatAt > 0
          && prevHeartbeatAt > 0
          && nextHeartbeatAt < prevHeartbeatAt;
        const isSameHeartbeatOlderSeq =
          nextHeartbeatAt > 0
          && prevHeartbeatAt > 0
          && nextHeartbeatAt === prevHeartbeatAt
          && prevSessionId
          && nextSessionId
          && prevSessionId === nextSessionId
          && nextHeartbeatSeq <= prevHeartbeatSeq;
        const isSessionRollback =
          nextHeartbeatAt > 0
          && prevHeartbeatAt > 0
          && nextHeartbeatAt === prevHeartbeatAt
          && prevSessionId
          && nextSessionId
          && prevSessionId !== nextSessionId
          && nextHeartbeatSeq <= prevHeartbeatSeq;

        if (isOlderHeartbeat || isSameHeartbeatOlderSeq || isSessionRollback) {
          metricsRef.current.staleSkipped += 1;
          log('[PresenceMonitor] Suppressed stale/out-of-order update for:', username, {
            prevHeartbeatAt,
            prevHeartbeatSeq,
            prevSessionId,
            nextHeartbeatAt,
            nextHeartbeatSeq,
            nextSessionId
          });
          return;
        }

        if (
          prevComputed.value === 'online'
          && nextComputedBase.value === 'offline'
          && !hasExplicitOfflineSignal
          && policyConfig.offlineGraceMs > 0
        ) {
          const graceStart = Number(prevSnapshot.offlineGraceStartAt) || now;
          if ((now - graceStart) < policyConfig.offlineGraceMs) {
            metricsRef.current.transitionsSuppressed += 1;
            prevPresence[username] = {
              ...prevSnapshot,
              offlineGraceStartAt: graceStart,
              onlineGraceStartAt: 0,
              statusValue: 'online',
              presenceStatusValue: nextComputedBase.statusValue,
              lastHeartbeatAt: nextHeartbeatAt,
              lastHeartbeatSeq: nextHeartbeatSeq,
              lastSessionId: nextSessionId,
              computed: {
                ...prevComputed,
                observedAt: now,
                value: 'unstable'
              }
            };
            setPresenceMetaByUser((prev) => ({
              ...prev,
              [username]: prevPresence[username]
            }));
            setContactPresence((prev) => ({ ...prev, [username]: { ...presenceData } }));
            return;
          }
        }

        if (
          prevComputed.value === 'offline'
          && nextComputedBase.value === 'online'
          && policyConfig.onlineGraceMs > 0
        ) {
          const graceStart = Number(prevSnapshot.onlineGraceStartAt) || now;
          if ((now - graceStart) < policyConfig.onlineGraceMs) {
            metricsRef.current.transitionsSuppressed += 1;
            prevPresence[username] = {
              ...prevSnapshot,
              onlineGraceStartAt: graceStart,
              offlineGraceStartAt: 0,
              statusValue: 'offline',
              presenceStatusValue: nextComputedBase.statusValue,
              lastHeartbeatAt: nextHeartbeatAt,
              lastHeartbeatSeq: nextHeartbeatSeq,
              lastSessionId: nextSessionId,
              computed: {
                ...prevComputed,
                observedAt: now,
                value: 'unstable'
              }
            };
            setPresenceMetaByUser((prev) => ({
              ...prev,
              [username]: prevPresence[username]
            }));
            setContactPresence((prev) => ({ ...prev, [username]: { ...presenceData } }));
            return;
          }
        }

        const nextComputed = {
          ...nextComputedBase,
          transitionedAt: now
        };
        const prevStableStatus = prevSnapshot.statusValue || prevComputed.value || 'offline';
        const prevComputedForTransition = {
          ...prevComputed,
          value: prevStableStatus,
          statusValue: prevSnapshot.presenceStatusValue || prevComputed.statusValue || prevStableStatus
        };

        if (
          isStaleTransition(prevComputedForTransition, nextComputed, policyConfig.minDwellMs)
          && !(hasExplicitOfflineSignal && nextComputedBase.value === 'offline')
          && !shouldEmitOnlineTransition(prevComputedForTransition, nextComputed)
        ) {
          metricsRef.current.staleSkipped += 1;
          metricsRef.current.transitionsSuppressed += 1;
          prevPresence[username] = {
            ...prevSnapshot,
            presenceStatusValue: nextComputedBase.statusValue,
            lastHeartbeatAt: nextHeartbeatAt,
            lastHeartbeatSeq: nextHeartbeatSeq,
            lastSessionId: nextSessionId,
            computed: {
              ...prevComputed,
              observedAt: now,
              value: 'unstable'
            }
          };
          setPresenceMetaByUser((prev) => ({
            ...prev,
            [username]: prevPresence[username]
          }));
          setContactPresence((prev) => ({ ...prev, [username]: { ...presenceData } }));
          return;
        }

        const prevStatusValue = prevStableStatus;
        const nextStatusValue = nextComputedBase.value;
        if (prevStatusValue === nextStatusValue) {
          metricsRef.current.transitionsSuppressed += 1;
          prevPresence[username] = {
            ...prevSnapshot,
            offlineGraceStartAt: 0,
            onlineGraceStartAt: 0,
            statusValue: nextStatusValue,
            presenceStatusValue: nextComputedBase.statusValue,
            lastHeartbeatAt: nextHeartbeatAt,
            lastHeartbeatSeq: nextHeartbeatSeq,
            lastSessionId: nextSessionId,
            computed: {
              ...nextComputedBase,
              transitionedAt: Number(prevComputed.transitionedAt) || now
            }
          };
          setPresenceMetaByUser((prev) => ({
            ...prev,
            [username]: prevPresence[username]
          }));
          setContactPresence((prev) => ({ ...prev, [username]: { ...presenceData } }));
          return;
        }

        log('[PresenceMonitor]', username, '| prev:', prevStatusValue, '-> new:', nextStatusValue);

        if (shouldEmitOnlineTransition(prevComputedForTransition, nextComputed)) {
          log('[PresenceMonitor] ONLINE TRANSITIE voor:', username);
          metricsRef.current.transitionsEmitted += 1;
          if (onContactOnlineRef.current) onContactOnlineRef.current(username);
        }

        prevPresence[username] = {
          ...prevSnapshot,
          lastSeen: presenceData.lastSeen || 0,
          statusValue: nextStatusValue,
          presenceStatusValue: nextComputedBase.statusValue,
          lastHeartbeatAt: nextHeartbeatAt,
          lastHeartbeatSeq: nextHeartbeatSeq,
          lastSessionId: nextSessionId,
          offlineGraceStartAt: 0,
          onlineGraceStartAt: 0,
          computed: nextComputed
        };
        setPresenceMetaByUser((prev) => ({
          ...prev,
          [username]: prevPresence[username]
        }));
        setContactPresence((prev) => ({ ...prev, [username]: { ...presenceData } }));
      });
      contactListeners.set(username, node);
    };
    attachListenerFnRef.current = attachPresenceListener;

    const processAttachQueue = () => {
      attachTimerRef.current = null;
      let processed = 0;
      while (attachQueue.length > 0 && processed < 20) {
        const username = attachQueue.shift();
        attachQueueSet.delete(username);
        if (!username) continue;
        attachPresenceListener(username);
        processed += 1;
      }
      if (attachQueue.length > 0) {
        attachTimerRef.current = setTimeout(processAttachQueue, 50);
      }
    };

    const enqueueAttach = (username, priority = false) => {
      if (!username) return;
      if (!eligibleContacts.has(username)) return;
      if (contactListeners.has(username)) return;
      if (priority) {
        metricsRef.current.immediateAttached += 1;
        attachPresenceListener(username);
        return;
      }
      if (attachQueueSet.has(username)) return;
      attachQueueSet.add(username);
      attachQueue.push(username);
      metricsRef.current.queued += 1;
      if (!attachTimerRef.current) {
        attachTimerRef.current = setTimeout(processAttachQueue, 25);
      }
    };

    const contactsMapNode = user.get('contacts').map();
    contactsMapNodeRef.current = contactsMapNode;

    contactsMapNode.on((contactData, key) => {
      const { username, eligible: isEligible } = getPresenceEligibility(contactData, key);

      if (!isEligible) {
        if (username) {
          eligibleContacts.delete(username);
          if (attachQueueSet.has(username)) {
            attachQueueSet.delete(username);
            const idx = attachQueue.indexOf(username);
            if (idx >= 0) attachQueue.splice(idx, 1);
          }
          detachPresenceListener(username);
        }
        return;
      }

      eligibleContacts.add(username);
      const isPriority = priorityContactsRef.current.has(username);
      enqueueAttach(username, isPriority);
    });

    return () => {
      cleanupPresenceListeners();
    };
  }, [isLoggedIn, currentUser, isMessengerActive, detachPresenceListener, cleanupPresenceListeners]);

  return {
    contactPresence,
    presenceMetaByUser,
    resetPresenceState,
    cleanupPresenceListeners,
    hasPresenceListener,
    getPresenceHealth
  };
}

export default usePresenceCoordinator;
