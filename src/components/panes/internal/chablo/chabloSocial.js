export const DEFAULT_CHABLO_SOCIAL_PREFS = {
  visibility: 'full',
  allowWhispers: true,
  allowInvites: true,
  dnd: false,
  updatedAt: 0
};

export const DEFAULT_CHABLO_SOCIAL_RELATION = {
  muted: false,
  blocked: false,
  updatedAt: 0
};

export const DEFAULT_CHABLO_LAST_READ = {
  rooms: {},
  whispers: {},
  invites: 0
};

function normalizeTimestamp(value) {
  return Number(value) || 0;
}

export function getWhisperPairId(leftUsername, rightUsername) {
  return [leftUsername, rightUsername]
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
    .join('::');
}

export function getWhisperPartner(pairId, currentUser) {
  const [left, right] = String(pairId || '').split('::');
  if (!left && !right) {
    return null;
  }
  if (left === currentUser) {
    return right || null;
  }
  if (right === currentUser) {
    return left || null;
  }
  return left || right || null;
}

export function normalizeWhisperMessages(messageMap) {
  return Object.entries(messageMap || {})
    .filter(([, value]) => value && typeof value === 'object')
    .map(([id, value]) => ({
      id,
      from: value.from || 'onbekend',
      to: value.to || 'onbekend',
      text: value.text || '',
      timestamp: normalizeTimestamp(value.timestamp)
    }))
    .sort((left, right) => left.timestamp - right.timestamp);
}

export function normalizeInviteEntries(inviteMap) {
  return Object.entries(inviteMap || {})
    .filter(([, value]) => value && typeof value === 'object')
    .map(([id, value]) => ({
      id,
      from: value.from || 'onbekend',
      to: value.to || 'onbekend',
      roomId: value.roomId || null,
      roomName: value.roomName || value.roomId || 'kamer',
      note: value.note || '',
      status: value.status || 'pending',
      createdAt: normalizeTimestamp(value.createdAt),
      updatedAt: normalizeTimestamp(value.updatedAt || value.createdAt)
    }))
    .sort((left, right) => (
      right.updatedAt - left.updatedAt
      || right.createdAt - left.createdAt
      || left.from.localeCompare(right.from)
    ));
}

export function normalizeSocialPrefs(record) {
  const next = record && typeof record === 'object'
    ? { ...DEFAULT_CHABLO_SOCIAL_PREFS, ...record }
    : { ...DEFAULT_CHABLO_SOCIAL_PREFS };

  if (!['full', 'friends', 'hidden'].includes(next.visibility)) {
    next.visibility = 'full';
  }
  next.allowWhispers = next.allowWhispers !== false;
  next.allowInvites = next.allowInvites !== false;
  next.dnd = next.dnd === true;
  next.updatedAt = normalizeTimestamp(next.updatedAt);
  return next;
}

export function normalizeSocialRelation(record) {
  const next = record && typeof record === 'object'
    ? { ...DEFAULT_CHABLO_SOCIAL_RELATION, ...record }
    : { ...DEFAULT_CHABLO_SOCIAL_RELATION };

  next.muted = next.muted === true;
  next.blocked = next.blocked === true;
  next.updatedAt = normalizeTimestamp(next.updatedAt);
  return next;
}

export function normalizeLastReadState(record) {
  const rooms = Object.entries(record?.rooms || {}).reduce((next, [roomId, timestamp]) => {
    next[roomId] = normalizeTimestamp(timestamp);
    return next;
  }, {});

  const whispers = Object.entries(record?.whispers || {}).reduce((next, [pairId, timestamp]) => {
    next[pairId] = normalizeTimestamp(timestamp);
    return next;
  }, {});

  return {
    rooms,
    whispers,
    invites: normalizeTimestamp(record?.invites)
  };
}

export function isChabloUserBlocked({
  incomingRelation,
  outgoingRelation
}) {
  return Boolean(
    normalizeSocialRelation(outgoingRelation).blocked
    || normalizeSocialRelation(incomingRelation).blocked
  );
}

export function isChabloUserVisible({
  username,
  currentUser,
  socialPrefs,
  outgoingRelation,
  incomingRelation,
  acceptedFriendUsernames
}) {
  if (!username || username === currentUser) {
    return false;
  }

  if (isChabloUserBlocked({ incomingRelation, outgoingRelation })) {
    return false;
  }

  const prefs = normalizeSocialPrefs(socialPrefs);
  if (prefs.visibility === 'hidden') {
    return false;
  }

  if (prefs.visibility === 'friends' && !acceptedFriendUsernames.has(username)) {
    return false;
  }

  return true;
}

export function getUnreadEntriesCount(entries, lastReadAt, currentUser) {
  return (entries || []).reduce((total, entry) => {
    const timestamp = normalizeTimestamp(entry?.timestamp || entry?.updatedAt || entry?.createdAt);
    if (timestamp <= lastReadAt) {
      return total;
    }
    if (entry?.from && entry.from === currentUser) {
      return total;
    }
    return total + 1;
  }, 0);
}

export function buildWhisperThreads({
  whisperMessagesByPairId,
  currentUser,
  lastReadWhispers,
  socialPrefsByUsername,
  outgoingRelationsByUsername,
  incomingRelationsByUsername,
  acceptedFriendUsernames
}) {
  return Object.entries(whisperMessagesByPairId || {})
    .map(([pairId, messages]) => {
      const partner = getWhisperPartner(pairId, currentUser);
      if (!partner) {
        return null;
      }

      const normalizedMessages = normalizeWhisperMessages(
        Array.isArray(messages)
          ? Object.fromEntries(messages.map((message) => [message.id, message]))
          : messages
      );
      if (normalizedMessages.length === 0) {
        return null;
      }

      if (isChabloUserBlocked({
        incomingRelation: incomingRelationsByUsername?.[partner],
        outgoingRelation: outgoingRelationsByUsername?.[partner]
      })) {
        return null;
      }

      const prefs = normalizeSocialPrefs(socialPrefsByUsername?.[partner]);
      const visibilityAllowsContact = (
        prefs.visibility === 'full'
        || (prefs.visibility === 'friends' && acceptedFriendUsernames.has(partner))
      );
      const lastMessage = normalizedMessages[normalizedMessages.length - 1];

      return {
        pairId,
        partner,
        messages: normalizedMessages,
        lastMessage,
        unreadCount: getUnreadEntriesCount(
          normalizedMessages,
          normalizeTimestamp(lastReadWhispers?.[pairId]),
          currentUser
        ),
        canWhisper: prefs.allowWhispers && visibilityAllowsContact
      };
    })
    .filter(Boolean)
    .sort((left, right) => (
      (right.lastMessage?.timestamp || 0) - (left.lastMessage?.timestamp || 0)
      || left.partner.localeCompare(right.partner)
    ));
}

export function buildVisibleRoomPresence({
  rooms,
  allPositions,
  currentUser,
  socialPrefsByUsername,
  outgoingRelationsByUsername,
  incomingRelationsByUsername,
  acceptedFriendUsernames,
  isPositionFresh
}) {
  return (rooms || []).map((room) => {
    const usernames = Object.entries(allPositions || {})
      .filter(([username, position]) => (
        username !== currentUser
        && position?.room === room.id
        && isPositionFresh(position)
        && isChabloUserVisible({
          username,
          currentUser,
          socialPrefs: socialPrefsByUsername?.[username],
          outgoingRelation: outgoingRelationsByUsername?.[username],
          incomingRelation: incomingRelationsByUsername?.[username],
          acceptedFriendUsernames
        })
      ))
      .map(([username]) => username)
      .sort((left, right) => left.localeCompare(right));

    return {
      roomId: room.id,
      roomName: room.name,
      usernames,
      count: usernames.length
    };
  });
}
