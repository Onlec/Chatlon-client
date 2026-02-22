import { useEffect, useRef, useCallback } from 'react';
import { gun } from '../gun';
import { log } from '../utils/debug';
import { shouldYieldToIncomingSession } from '../utils/sessionOwnership';
import {
  SESSION_HEARTBEAT_MS,
  SESSION_EARLY_CLAIM_DELAYS_MS
} from '../utils/sessionConstants';

export function useActiveTabSessionGuard({
  isLoggedIn,
  currentUser,
  tabClientId,
  onConflict
}) {
  const isLoggedInRef = useRef(isLoggedIn);
  const isSessionClosingRef = useRef(false);
  const sessionKickAlertShownRef = useRef(false);
  const onConflictRef = useRef(onConflict);

  useEffect(() => {
    isLoggedInRef.current = isLoggedIn;
  }, [isLoggedIn]);

  useEffect(() => {
    onConflictRef.current = onConflict;
  }, [onConflict]);

  const beginSessionClose = useCallback(() => {
    if (isSessionClosingRef.current) return false;
    isSessionClosingRef.current = true;
    return true;
  }, []);

  const resetSessionState = useCallback(() => {
    isSessionClosingRef.current = false;
    sessionKickAlertShownRef.current = false;
  }, []);

  const consumeSessionKickAlert = useCallback(() => {
    if (sessionKickAlertShownRef.current) return false;
    sessionKickAlertShownRef.current = true;
    return true;
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !currentUser || !tabClientId) return;

    const sessionStartedAt = Date.now();
    const tabId = `${tabClientId}_${sessionStartedAt}_${Math.random().toString(36).substr(2, 9)}`;
    log('[App] Starting session with tabId:', tabId);
    const activeTabUserNode = gun.get('ACTIVE_TAB').get(currentUser);

    const writeClaim = () => {
      activeTabUserNode.put({
        tabId,
        heartbeat: Date.now(),
        clientId: tabClientId,
        account: currentUser,
        sessionStartedAt
      });
    };

    // Claim sessie
    writeClaim();

    // Extra snelle claim-sync bij opstart om korte overlap tussen twee snelle logins te verkleinen.
    const earlyClaimTimers = SESSION_EARLY_CLAIM_DELAYS_MS.map((delayMs) =>
      setTimeout(() => {
        if (isLoggedInRef.current && !isSessionClosingRef.current) {
          writeClaim();
        }
      }, delayMs)
    );

    // Heartbeat is fallback wanneer een realtime update gemist wordt.
    const heartbeatInterval = setInterval(() => {
      writeClaim();
    }, SESSION_HEARTBEAT_MS);

    // Luister of een andere tab ons verdringt
    const activeTabNode = gun.get('ACTIVE_TAB').get(currentUser);
    activeTabNode.on((data) => {
      if (isLoggedInRef.current === false) return;
      if (isSessionClosingRef.current) return;

      const shouldYield = shouldYieldToIncomingSession({
        incoming: data,
        currentUser,
        localTabClientId: tabClientId,
        sessionStartMs: sessionStartedAt,
        myTabId: tabId
      });
      if (!shouldYield) return;

      log('[App] Detected other session, logging off. Their tabId:', data?.tabId);
      clearInterval(heartbeatInterval);
      activeTabNode.off();
      if (onConflictRef.current) onConflictRef.current(data);
    });

    return () => {
      clearInterval(heartbeatInterval);
      // Invariant: startup claim bursts must never survive an unmount/login handover.
      earlyClaimTimers.forEach((timer) => clearTimeout(timer));
      // Invariant: een oudere/sluitende tab mag nooit een nieuwere eigenaar nullen.
      // Daarom clearen we alleen als deze tab nog steeds owner is.
      activeTabUserNode.once((latest) => {
        if (!latest || latest.tabId === tabId) {
          activeTabUserNode.put({
            tabId: null,
            heartbeat: 0,
            clientId: tabClientId,
            account: currentUser,
            sessionStartedAt: 0
          });
        }
      });
      activeTabNode.off();
    };
  }, [isLoggedIn, currentUser, tabClientId]);

  return {
    beginSessionClose,
    resetSessionState,
    consumeSessionKickAlert
  };
}

export default useActiveTabSessionGuard;
