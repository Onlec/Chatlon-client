import { useEffect, useRef, useCallback } from 'react';
import { gun } from '../gun';
import { log } from '../utils/debug';
import {
  SESSION_HEARTBEAT_MS,
  SESSION_EARLY_CLAIM_DELAYS_MS
} from '../utils/sessionConstants';

function getSessionTimestampFromTabId(tabId) {
  if (typeof tabId !== 'string') return 0;
  const parts = tabId.split('_');
  // Format: client_<clientTs>_<clientRand>_<sessionTs>_<sessionRand>
  const maybeTs = Number(parts[parts.length - 2]);
  return Number.isFinite(maybeTs) ? maybeTs : 0;
}

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

    const sessionStartMs = Date.now();
    const mySessionTs = Date.now();
    const tabId = `${tabClientId}_${mySessionTs}_${Math.random().toString(36).substr(2, 9)}`;
    log('[App] Starting session with tabId:', tabId);
    const activeTabUserNode = gun.get('ACTIVE_TAB').get(currentUser);

    const writeClaim = () => {
      activeTabUserNode.put({
        tabId,
        heartbeat: Date.now(),
        clientId: tabClientId,
        account: currentUser
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

      if (data && data.tabId && data.tabId !== tabId) {
        // Extra safety: alleen conflicten behandelen voor hetzelfde account.
        if (data.account && data.account !== currentUser) return;
        // Zelfde tab-client identity nooit als "andere sessie" behandelen.
        // Dit voorkomt false kicks bij snelle relogin in hetzelfde venster.
        if (data.clientId && data.clientId === tabClientId) return;

        const incomingHeartbeat = typeof data.heartbeat === 'number' ? data.heartbeat : 0;

        // Ongeldige/lege heartbeats nooit als conflict behandelen.
        if (incomingHeartbeat <= 0) return;

        // Stale events van eerdere sessies negeren, ook als ze later binnenkomen.
        if (incomingHeartbeat < sessionStartMs) {
          log('[App] Ignoring stale ACTIVE_TAB conflict:', data.tabId, incomingHeartbeat);
          return;
        }

        // Deterministische ownership:
        // nieuwste login-sessie wint, en bij gelijke timestamp wint hoogste tabId lexical.
        const incomingSessionTs = getSessionTimestampFromTabId(data.tabId);
        const isOlderSession = incomingSessionTs < mySessionTs;
        const isSameTsAndNotHigherTabId =
          incomingSessionTs === mySessionTs &&
          String(data.tabId) <= String(tabId);
        if (isOlderSession || isSameTsAndNotHigherTabId) {
          log('[App] Ignoring older ACTIVE_TAB session:', data.tabId);
          return;
        }

        log('[App] Detected other session, logging off. Their tabId:', data.tabId);
        clearInterval(heartbeatInterval);
        activeTabNode.off();
        if (onConflictRef.current) onConflictRef.current(data);
      }
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
            account: currentUser
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
