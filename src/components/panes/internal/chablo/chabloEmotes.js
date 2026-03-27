export const CHABLO_EMOTE_TTL_MS = 2400;

export const CHABLO_EMOTE_REGISTRY = [
  {
    type: 'wave',
    label: 'WAVE',
    buttonLabel: 'Zwaai',
    color: '#8fd4ff'
  },
  {
    type: 'laugh',
    label: 'LOL',
    buttonLabel: 'Lach',
    color: '#ffd76c'
  },
  {
    type: 'shrug',
    label: 'MEH',
    buttonLabel: 'Schouders',
    color: '#f3b6ff'
  },
  {
    type: 'cheer',
    label: 'YEAH',
    buttonLabel: 'Cheer',
    color: '#8cf5c6'
  },
  {
    type: 'question',
    label: 'HMM?',
    buttonLabel: 'Vraag',
    color: '#f8f3b4'
  },
  {
    type: 'coffee',
    label: 'CAFE',
    buttonLabel: 'Koffie',
    color: '#d6b08a'
  }
];

const CHABLO_EMOTES_BY_TYPE = CHABLO_EMOTE_REGISTRY.reduce((next, entry) => {
  next[entry.type] = entry;
  return next;
}, {});

function normalizeTimestamp(value) {
  return Number(value) || 0;
}

export function getChabloEmote(type) {
  return CHABLO_EMOTES_BY_TYPE[String(type || '').toLowerCase()] || null;
}

export function normalizeChabloEmote(record, fallback = {}) {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const type = String(record.type || '').trim().toLowerCase();
  const config = getChabloEmote(type);
  if (!config) {
    return null;
  }

  const issuedAt = normalizeTimestamp(record.issuedAt || record.timestamp);
  const expiresAt = normalizeTimestamp(record.expiresAt) || (issuedAt ? issuedAt + CHABLO_EMOTE_TTL_MS : 0);
  if (!issuedAt || !expiresAt) {
    return null;
  }

  return {
    type,
    label: String(record.label || config.label),
    buttonLabel: config.buttonLabel,
    color: config.color,
    by: record.by || fallback.by || 'onbekend',
    roomId: record.roomId || fallback.roomId || null,
    issuedAt,
    expiresAt,
    targetUsername: record.targetUsername || null
  };
}

export function normalizeChabloEmoteEntries(emoteMap, roomId) {
  return Object.entries(emoteMap || {}).reduce((next, [username, value]) => {
    const normalized = normalizeChabloEmote(value, {
      by: username,
      roomId
    });
    if (normalized) {
      next[username] = normalized;
    }
    return next;
  }, {});
}

export function isChabloEmoteFresh(record, now = Date.now()) {
  return Boolean(record && normalizeTimestamp(record.expiresAt) > now);
}

export default CHABLO_EMOTE_REGISTRY;
