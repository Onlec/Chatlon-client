import { normalizeIncomingMessage } from './conversationState';

export const NUDGE_SHAKE_DURATION_MS = 600;
export const TYPING_STALE_MS = 4000;
export const TYPING_CLEAR_MS = 3000;

export function startConversationStreams({
  gun,
  currentSessionId,
  contactName,
  boundaryRef,
  streamGenerationRef,
  lastProcessedNudgeRef,
  shakeTimeoutRef,
  typingTimeoutRef,
  playSoundRef,
  onMessage,
  onShakeChange,
  onTypingChange,
  decryptMessage,
  currentUserAliasRef
}) {
  if (!currentSessionId) return null;

  const streamGeneration = streamGenerationRef.current + 1;
  streamGenerationRef.current = streamGeneration;

  const chatNode = gun.get(currentSessionId);
  const nudgeNode = gun.get(`NUDGE_${currentSessionId}`);
  const typingNode = gun.get(`TYPING_${currentSessionId}`);

  const chatSubscription = chatNode.map().on(async (data, id) => {
    const normalizedBaseMessage = normalizeIncomingMessage(data, id, {
      fallbackTimeRef: Date.now()
    });
    if (!normalizedBaseMessage) return;
    const boundary = boundaryRef.current;

    if (normalizedBaseMessage.type === 'nudge') {
      if (streamGenerationRef.current !== streamGeneration) return;
      onMessage({
        ...normalizedBaseMessage,
        content: '',
        isLegacy: normalizedBaseMessage.timeRef < boundary
      });
      return;
    }

    // Game system messages — not encrypted, pass through directly
    if (['gameinvite', 'gameaccept', 'gamedecline'].includes(normalizedBaseMessage.type)) {
      if (streamGenerationRef.current !== streamGeneration) return;
      onMessage({
        ...normalizedBaseMessage,
        isLegacy: normalizedBaseMessage.timeRef < boundary
      });
      return;
    }

    if (!normalizedBaseMessage.content || normalizedBaseMessage.content === '__nudge__') return;
    if (streamGenerationRef.current !== streamGeneration) return;

    const currentUserAlias = typeof currentUserAliasRef?.current === 'string'
      ? currentUserAliasRef.current
      : '';

    const decryptContact = normalizedBaseMessage.sender === currentUserAlias
      ? contactName
      : normalizedBaseMessage.sender;

    const decryptedContent = await decryptMessage(normalizedBaseMessage.content, decryptContact);

    if (streamGenerationRef.current !== streamGeneration) return;
    onMessage({
      ...normalizedBaseMessage,
      content: decryptedContent,
      isLegacy: normalizedBaseMessage.timeRef < boundary
    });
  });

  const nudgeSubscription = nudgeNode.on((data) => {
    if (streamGenerationRef.current !== streamGeneration) return;
    if (data?.time > lastProcessedNudgeRef.current && data.from === contactName) {
      lastProcessedNudgeRef.current = data.time;
      playSoundRef.current?.('nudge');
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
      onShakeChange(true);
      shakeTimeoutRef.current = setTimeout(() => {
        if (streamGenerationRef.current !== streamGeneration) return;
        onShakeChange(false);
        shakeTimeoutRef.current = null;
      }, NUDGE_SHAKE_DURATION_MS);
    }
  });

  const typingSubscription = typingNode.on((data) => {
    if (streamGenerationRef.current !== streamGeneration) return;
    if (data && data.isTyping && data.user === contactName) {
      const now = Date.now();
      if (now - data.timestamp < TYPING_STALE_MS) {
        onTypingChange(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          if (streamGenerationRef.current !== streamGeneration) return;
          onTypingChange(false);
          typingTimeoutRef.current = null;
        }, TYPING_CLEAR_MS);
      }
    } else if (data && !data.isTyping && data.user === contactName) {
      onTypingChange(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  });

  return () => {
    streamGenerationRef.current += 1;
    if (chatSubscription && typeof chatSubscription.off === 'function') {
      chatSubscription.off();
    }
    if (nudgeSubscription && typeof nudgeSubscription.off === 'function') {
      nudgeSubscription.off();
    }
    if (typingSubscription && typeof typingSubscription.off === 'function') {
      typingSubscription.off();
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (shakeTimeoutRef.current) {
      clearTimeout(shakeTimeoutRef.current);
      shakeTimeoutRef.current = null;
    }
  };
}

export default startConversationStreams;
