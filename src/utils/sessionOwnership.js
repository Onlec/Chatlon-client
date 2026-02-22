import { ACTIVE_TAB_FRESH_MS } from './sessionConstants';

export function getSessionTimestampFromTabId(tabId) {
  if (typeof tabId !== 'string') return 0;
  const parts = tabId.split('_');
  // Format: client_<clientTs>_<clientRand>_<sessionTs>_<sessionRand>
  const maybeTs = Number(parts[parts.length - 2]);
  return Number.isFinite(maybeTs) ? maybeTs : 0;
}

export function getSessionStartedAt(activeTabData) {
  const explicit = Number(activeTabData?.sessionStartedAt);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return getSessionTimestampFromTabId(activeTabData?.tabId);
}

export function isForeignActiveSession(
  activeTabData,
  localTabClientId,
  nowMs = Date.now(),
  freshMs = ACTIVE_TAB_FRESH_MS
) {
  if (!activeTabData) return false;

  const heartbeat = Number(activeTabData.heartbeat);
  if (!Number.isFinite(heartbeat) || heartbeat <= 0) return false;
  if (nowMs - heartbeat >= freshMs) return false;
  if (localTabClientId && activeTabData.clientId === localTabClientId) return false;

  return true;
}

export function shouldYieldToIncomingSession({
  incoming,
  currentUser,
  localTabClientId,
  sessionStartMs,
  myTabId
}) {
  if (!incoming || !myTabId) return false;
  if (!incoming.tabId || incoming.tabId === myTabId) return false;
  if (incoming.account && currentUser && incoming.account !== currentUser) return false;
  if (localTabClientId && incoming.clientId === localTabClientId) return false;

  const incomingHeartbeat = Number(incoming.heartbeat);
  if (!Number.isFinite(incomingHeartbeat) || incomingHeartbeat <= 0) return false;
  if (incomingHeartbeat < sessionStartMs) return false;

  const incomingSessionStartMs = getSessionStartedAt(incoming);
  const mySessionStartMs = Number(sessionStartMs) || 0;

  if (incomingSessionStartMs > mySessionStartMs) return true;
  if (incomingSessionStartMs < mySessionStartMs) return false;

  // Deterministische tie-break op gelijk startmoment.
  return String(incoming.tabId) > String(myTabId);
}
