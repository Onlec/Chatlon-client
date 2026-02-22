import { useEffect, useRef } from 'react';
import { gun } from '../../../gun';
import { createListenerManager } from '../../../utils/gunListenerManager';
import { decryptMessage } from '../../../utils/encryption';
import { normalizeIncomingMessage } from './conversationState';

const CHAT_LISTENER_KEY = 'chat';
const NUDGE_LISTENER_KEY = 'nudge';
const TYPING_LISTENER_KEY = 'typing';

export function useConversationStream({
  currentSessionId,
  currentUser,
  contactName,
  lastNotificationTime,
  windowOpenTimeRef,
  lastProcessedNudgeRef,
  onIncomingMessage,
  onNudge,
  onTypingStateChange
}) {
  const listenersRef = useRef(createListenerManager());
  const boundaryTimeRef = useRef(0);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    boundaryTimeRef.current = lastNotificationTime
      ? (lastNotificationTime - 2000)
      : (windowOpenTimeRef.current - 1000);
  }, [lastNotificationTime, windowOpenTimeRef]);

  useEffect(() => {
    if (!currentSessionId || !currentUser || !contactName) return undefined;

    const chatNode = gun.get(currentSessionId);
    const nudgeNode = gun.get(`NUDGE_${currentSessionId}`);
    const typingNode = gun.get(`TYPING_${currentSessionId}`);

    chatNode.map().on(async (rawMessage, messageId) => {
      const normalized = normalizeIncomingMessage(rawMessage, messageId, {
        fallbackTimeRef: Date.now()
      });
      if (!normalized) return;

      const isLegacy = normalized.timeRef < boundaryTimeRef.current;
      if (normalized.type === 'nudge') {
        onIncomingMessage({
          ...normalized,
          content: '',
          isLegacy
        });
        return;
      }

      if (!normalized.content || normalized.content === '__nudge__') return;

      const decryptContact = normalized.sender === currentUser
        ? contactName
        : normalized.sender;

      let decryptedContent = '[Versleuteld bericht]';
      try {
        const decrypted = await decryptMessage(normalized.content, decryptContact);
        if (typeof decrypted === 'string') {
          decryptedContent = decrypted;
        } else if (decrypted === null || decrypted === undefined) {
          decryptedContent = '[Versleuteld bericht]';
        } else {
          decryptedContent = String(decrypted);
        }
      } catch {
        decryptedContent = '[Versleuteld bericht]';
      }

      const decryptedMessage = normalizeIncomingMessage(
        { ...normalized, content: decryptedContent },
        messageId,
        { fallbackTimeRef: normalized.timeRef }
      );
      if (!decryptedMessage) return;

      onIncomingMessage({
        ...decryptedMessage,
        isLegacy
      });
    });

    nudgeNode.on((data) => {
      const nudgeTime = Number(data?.time) || 0;
      if (!nudgeTime || data?.from !== contactName) return;
      if (nudgeTime <= lastProcessedNudgeRef.current) return;

      lastProcessedNudgeRef.current = nudgeTime;
      onNudge();
    });

    typingNode.on((data) => {
      if (data && data.user === contactName && data.isTyping) {
        const now = Date.now();
        if (now - Number(data.timestamp || 0) < 4000) {
          onTypingStateChange(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            onTypingStateChange(false);
          }, 3000);
        }
        return;
      }

      if (data && data.user === contactName && !data.isTyping) {
        onTypingStateChange(false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    });

    listenersRef.current.add(CHAT_LISTENER_KEY, chatNode);
    listenersRef.current.add(NUDGE_LISTENER_KEY, nudgeNode);
    listenersRef.current.add(TYPING_LISTENER_KEY, typingNode);

    return () => {
      listenersRef.current.cleanup();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      onTypingStateChange(false);
    };
  }, [
    contactName,
    currentSessionId,
    currentUser,
    lastProcessedNudgeRef,
    onIncomingMessage,
    onNudge,
    onTypingStateChange
  ]);
}

export default useConversationStream;

