import { useEffect, useRef, useState } from 'react';
import { gun } from '../../../gun';
import { getContactPairId } from '../../../utils/chatUtils';
import { createListenerManager } from '../../../utils/gunListenerManager';

const ACTIVE_SESSION_KEY = 'activeSession';

export function useConversationSession({ currentUser, contactName }) {
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const listenersRef = useRef(createListenerManager());
  const currentSessionIdRef = useRef(null);

  useEffect(() => {
    currentSessionIdRef.current = null;
    setCurrentSessionId(null);
  }, [currentUser, contactName]);

  useEffect(() => {
    if (!currentUser || !contactName) return undefined;

    const pairId = getContactPairId(currentUser, contactName);
    const sessionNode = gun.get('ACTIVE_SESSIONS').get(pairId);
    const sessionIdNode = sessionNode.get('sessionId');

    sessionIdNode.on((incomingSessionId) => {
      const normalizedSessionId = typeof incomingSessionId === 'string'
        ? incomingSessionId.trim()
        : '';

      if (!normalizedSessionId) {
        const newSessionId = `CHAT_${pairId}_${Date.now()}`;
        sessionNode.put({ sessionId: newSessionId, lastActivity: Date.now() });
        return;
      }

      if (normalizedSessionId === currentSessionIdRef.current) return;

      currentSessionIdRef.current = normalizedSessionId;
      setCurrentSessionId(normalizedSessionId);
    });

    listenersRef.current.add(ACTIVE_SESSION_KEY, sessionIdNode);

    return () => {
      listenersRef.current.cleanup();
    };
  }, [currentUser, contactName]);

  return {
    currentSessionId
  };
}

export default useConversationSession;

