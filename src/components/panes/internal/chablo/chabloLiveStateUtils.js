import {
  createSafeDictionary,
  safeDictionaryEntries,
  toSafeDictionaryKey
} from './chabloSafeStore';

export const STALE_POSITION_MS = 30000;
export const HOTSPOT_PRESENCE_STALE_MS = 15000;
export const ROOM_ACTIVITY_LIMIT = 8;
export const WHISPER_TYPING_ACTIVE_MS = 2400;
export const CHABLO_SPEECH_TTL_MS = 4400;

export function sanitizeGunNode(node) {
  if (!node || typeof node !== 'object') {
    return createSafeDictionary();
  }

  const next = createSafeDictionary();
  Object.keys(node).forEach((key) => {
    if (key === '_' || key === '#') {
      return;
    }
    const safeKey = toSafeDictionaryKey(key);
    if (safeKey) {
      next[safeKey] = node[key];
    }
  });
  return next;
}

export function isPositionFresh(position) {
  return Boolean(position && (Date.now() - (Number(position.lastSeen) || 0) <= STALE_POSITION_MS));
}

export function normalizeFriendEntries(friendMap) {
  return safeDictionaryEntries(friendMap)
    .filter(([, value]) => value && typeof value === 'object')
    .map(([username, value]) => ({
      username,
      status: value.status || 'pending',
      since: Number(value.since) || 0,
      metIn: value.metIn || null,
      initiator: value.initiator || null
    }))
    .sort((left, right) => left.username.localeCompare(right.username));
}

export function normalizeRoomMessages(messageMap) {
  return safeDictionaryEntries(messageMap)
    .filter(([, value]) => value && typeof value === 'object')
    .map(([id, value]) => ({
      id,
      from: value.van || 'onbekend',
      text: value.tekst || '',
      timestamp: Number(value.timestamp) || 0
    }))
    .sort((left, right) => left.timestamp - right.timestamp);
}

export function normalizeHotspotPresenceEntries(presenceMap, currentUser) {
  return safeDictionaryEntries(presenceMap)
    .filter(([username, value]) => (
      username !== currentUser
      && value
      && typeof value === 'object'
      && typeof value.hotspotId === 'string'
      && value.hotspotId
      && (Date.now() - (Number(value.lastSeen) || 0) <= HOTSPOT_PRESENCE_STALE_MS)
    ))
    .map(([username, value]) => ({
      username,
      hotspotId: value.hotspotId,
      hotspotLabel: value.hotspotLabel || value.hotspotId,
      lastSeen: Number(value.lastSeen) || 0
    }))
    .sort((left, right) => (
      left.hotspotId.localeCompare(right.hotspotId)
      || left.username.localeCompare(right.username)
    ));
}

export function normalizeRoomActivityEntries(activityMap) {
  return safeDictionaryEntries(activityMap)
    .filter(([, value]) => value && typeof value === 'object')
    .map(([id, value]) => ({
      id,
      by: value.by || 'onbekend',
      room: value.room || null,
      hotspotId: value.hotspotId || null,
      hotspotLabel: value.hotspotLabel || value.hotspotId || 'hotspot',
      actionType: value.actionType || 'feedback',
      summary: value.summary || '',
      timestamp: Number(value.timestamp) || 0
    }))
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, ROOM_ACTIVITY_LIMIT);
}

export function normalizeRoomStateEntries(roomStateMap) {
  return safeDictionaryEntries(roomStateMap)
    .filter(([, value]) => value && typeof value === 'object')
    .map(([hotspotId, value]) => ({
      hotspotId,
      hotspotLabel: value.hotspotLabel || hotspotId,
      title: value.title || value.hotspotLabel || hotspotId,
      text: value.text || '',
      detail: value.detail || '',
      by: value.by || 'onbekend',
      kind: value.kind || 'status',
      sceneEffect: value.sceneEffect || 'generic',
      sceneAccent: value.sceneAccent || null,
      stageNote: value.stageNote || '',
      stateBadge: value.stateBadge || 'Live',
      stateSummary: value.stateSummary || value.text || '',
      participantCount: Number(value.participantCount) || 0,
      participantLabel: value.participantLabel || '',
      prompt: value.prompt || '',
      spotlight: value.spotlight || '',
      updatedAt: Number(value.updatedAt) || 0
    }))
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export function normalizeWhisperTypingEntries(typingMap, currentUser) {
  return safeDictionaryEntries(typingMap).reduce((next, [username, value]) => {
    if (
      username
      && username !== currentUser
      && value
      && typeof value === 'object'
      && (Date.now() - (Number(value.updatedAt) || 0) <= WHISPER_TYPING_ACTIVE_MS)
      && value.active !== false
    ) {
      next[username] = {
        active: true,
        updatedAt: Number(value.updatedAt) || 0
      };
    }
    return next;
  }, createSafeDictionary());
}

export function normalizeSpeechEntry(record, roomId, username) {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const issuedAt = Number(record.issuedAt || record.timestamp) || 0;
  const expiresAt = Number(record.expiresAt) || (issuedAt ? issuedAt + CHABLO_SPEECH_TTL_MS : 0);
  const text = String(record.text || '').trim().slice(0, 100);
  if (!issuedAt || !expiresAt || !text) {
    return null;
  }

  return {
    by: record.by || username,
    roomId: record.roomId || roomId,
    text,
    issuedAt,
    expiresAt
  };
}

export function normalizeSpeechEntries(speechMap, roomId) {
  return safeDictionaryEntries(speechMap).reduce((next, [username, value]) => {
    const normalized = normalizeSpeechEntry(value, roomId, username);
    if (normalized) {
      next[username] = normalized;
    }
    return next;
  }, createSafeDictionary());
}

export function isSpeechFresh(entry, now = Date.now()) {
  return Boolean(entry && (Number(entry.expiresAt) || 0) > now);
}

export function describeParticipants(entries, emptyText) {
  if (!entries || entries.length === 0) {
    return emptyText;
  }
  if (entries.length === 1) {
    return entries[0];
  }
  if (entries.length === 2) {
    return `${entries[0]} en ${entries[1]}`;
  }
  return `${entries[0]}, ${entries[1]} +${entries.length - 2}`;
}

export function getLatestInviteTimestamp(invites) {
  return invites.reduce((latest, invite) => Math.max(latest, invite.updatedAt || invite.createdAt || 0), 0);
}
