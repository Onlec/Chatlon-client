export function createInitialConversationState() {
  return { messages: [], messageMap: {} };
}

const toNumericTimeRef = (value, fallback) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
};

export function normalizeIncomingMessage(rawMessage, id, options = {}) {
  if (!rawMessage || typeof rawMessage !== 'object') return null;

  const normalizedId = typeof id === 'string' || typeof id === 'number' ? String(id) : '';
  if (!normalizedId || normalizedId === '_' || normalizedId === '#') return null;

  const sender = typeof rawMessage.sender === 'string' ? rawMessage.sender.trim() : '';
  if (!sender) return null;

  const fallbackTimeRef = toNumericTimeRef(options.fallbackTimeRef, Date.now());
  const timeRef = toNumericTimeRef(rawMessage.timeRef, fallbackTimeRef);

  return {
    ...rawMessage,
    id: normalizedId,
    sender,
    timeRef
  };
}

function sortMessages(messageMap) {
  return Object.values(messageMap).sort((left, right) => {
    const delta = Number(left.timeRef || 0) - Number(right.timeRef || 0);
    if (delta !== 0) return delta;
    return String(left.id).localeCompare(String(right.id));
  });
}

export function conversationReducer(state, action) {
  if (!action || typeof action !== 'object') return state;

  switch (action.type) {
    case 'RESET':
      return createInitialConversationState();
    case 'UPSERT_MESSAGE': {
      const message = normalizeIncomingMessage(action.payload, action.payload?.id, {
        fallbackTimeRef: Date.now()
      });
      if (!message || state.messageMap[message.id]) return state;

      const messageMap = { ...state.messageMap, [message.id]: message };
      return {
        messageMap,
        messages: sortMessages(messageMap)
      };
    }
    default:
      return state;
  }
}
