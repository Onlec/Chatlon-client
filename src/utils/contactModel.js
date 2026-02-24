export function normalizeContactRecord(contactData = {}) {
  const rawStatus = contactData.status || 'pending';
  const status = rawStatus === 'declined' ? 'pending' : rawStatus;
  const blocked = typeof contactData.blocked === 'boolean'
    ? contactData.blocked
    : status === 'blocked';
  const canMessage = typeof contactData.canMessage === 'boolean'
    ? contactData.canMessage
    : status === 'accepted' && !blocked;
  const pendingDirection = contactData.pendingDirection || (status === 'pending' ? 'outgoing' : null);
  const inList = typeof contactData.inList === 'boolean'
    ? contactData.inList
    : true;
  const visibility = contactData.visibility || (status === 'accepted' ? 'full' : 'limbo');
  const identityMode = contactData.identityMode || (status === 'accepted' ? 'profile' : 'email_only');

  return {
    username: contactData.username,
    contactStatus: status,
    blocked,
    canMessage,
    inList,
    visibility,
    identityMode,
    pendingDirection,
    timestamp: contactData.timestamp || 0,
    lastSyncTimestamp: Number(contactData.lastSyncTimestamp) || 0,
    blockWindowActiveFrom: Number(contactData.blockWindowActiveFrom) || 0,
    blockedMessageWindows: Array.isArray(contactData.blockedMessageWindows)
      ? contactData.blockedMessageWindows
          .map((w) => ({
            from: Number(w?.from) || 0,
            to: Number(w?.to) || 0
          }))
          .filter((w) => w.from > 0)
      : []
  };
}

export function canAttachContactListeners(contactData = {}) {
  const normalized = normalizeContactRecord(contactData);
  return normalized.contactStatus === 'accepted'
    && !normalized.blocked
    && normalized.canMessage;
}

export function canAttachPresenceListeners(contactData = {}) {
  const normalized = normalizeContactRecord(contactData);
  return normalized.contactStatus === 'accepted'
    && normalized.inList !== false
    && normalized.visibility !== 'limbo';
}

export function resolveContactUsername(contactData = {}, contactKey = '') {
  const usernameFromData = typeof contactData?.username === 'string' ? contactData.username.trim() : '';
  const usernameFromKey = typeof contactKey === 'string' ? contactKey.trim() : '';
  return usernameFromData || usernameFromKey || '';
}

export function getPresenceEligibility(contactData = {}, contactKey = '') {
  const username = resolveContactUsername(contactData, contactKey);
  if (!username || !contactData) {
    return { username, eligible: false };
  }
  // Canonical rule-set:
  // accepted && inList !== false && visibility !== 'limbo'
  return {
    username,
    eligible: canAttachPresenceListeners(contactData)
  };
}
