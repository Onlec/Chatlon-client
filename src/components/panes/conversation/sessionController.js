import { getContactPairId } from '../../../utils/chatUtils';

export const SESSION_CREATE_DELAY_MS = 800;

export function startSessionBootstrap({
  gun,
  sender,
  contactName,
  sessionGenerationRef,
  sessionInitAttemptedRef,
  sessionCreateTimeoutRef,
  currentSessionIdRef,
  onSessionResolved,
  onResetForContact
}) {
  if (!sender || !contactName) return null;

  const sessionGeneration = sessionGenerationRef.current + 1;
  sessionGenerationRef.current = sessionGeneration;

  const pairId = getContactPairId(sender, contactName);
  const sessionRef = gun.get('ACTIVE_SESSIONS').get(pairId);
  const sessionIdNode = sessionRef.get('sessionId');

  sessionInitAttemptedRef.current = false;
  currentSessionIdRef.current = null;

  if (typeof onResetForContact === 'function') {
    onResetForContact();
  }

  const applySessionId = (id) => {
    if (sessionGenerationRef.current !== sessionGeneration) return;
    const normalizedId = typeof id === 'string' && id.trim() ? id : null;

    if (normalizedId) {
      if (sessionCreateTimeoutRef.current) {
        clearTimeout(sessionCreateTimeoutRef.current);
        sessionCreateTimeoutRef.current = null;
      }
      sessionInitAttemptedRef.current = true;
      currentSessionIdRef.current = normalizedId;
      if (typeof onSessionResolved === 'function') {
        onSessionResolved(normalizedId);
      }
      return;
    }

    if (sessionInitAttemptedRef.current || sessionCreateTimeoutRef.current) return;
    sessionInitAttemptedRef.current = true;

    // Invariants:
    // 1) transient empty session values must not cause duplicate creates;
    // 2) only the current generation may create/claim session state;
    // 3) delayed create must be cancel-safe on unmount/contact switch.
    sessionCreateTimeoutRef.current = setTimeout(() => {
      sessionCreateTimeoutRef.current = null;
      if (sessionGenerationRef.current !== sessionGeneration) return;
      if (currentSessionIdRef.current) return;

      // Confirm with a fresh read before creating a new session ID.
      sessionIdNode.once((latestId) => {
        if (sessionGenerationRef.current !== sessionGeneration) return;
        const normalizedLatestId = typeof latestId === 'string' && latestId.trim()
          ? latestId.trim()
          : null;

        if (normalizedLatestId) {
          currentSessionIdRef.current = normalizedLatestId;
          if (typeof onSessionResolved === 'function') {
            onSessionResolved(normalizedLatestId);
          }
          return;
        }

        const newId = `CHAT_${pairId}_${Date.now()}`;
        currentSessionIdRef.current = newId;
        if (typeof onSessionResolved === 'function') {
          onSessionResolved(newId);
        }
        sessionRef.put({ sessionId: newId, lastActivity: Date.now() });
      });
    }, SESSION_CREATE_DELAY_MS);
  };

  const sessionSubscription = sessionIdNode.on(applySessionId);
  // Ensure first-load initialization for brand new pairs where `.on` can lag.
  sessionIdNode.once(applySessionId);

  return () => {
    sessionGenerationRef.current += 1;
    if (sessionSubscription && typeof sessionSubscription.off === 'function') {
      sessionSubscription.off();
    }
    sessionInitAttemptedRef.current = false;
    if (sessionCreateTimeoutRef.current) {
      clearTimeout(sessionCreateTimeoutRef.current);
      sessionCreateTimeoutRef.current = null;
    }
  };
}

export default startSessionBootstrap;
