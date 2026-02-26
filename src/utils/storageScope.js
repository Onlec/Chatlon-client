const GUEST_USER_KEY = 'guest';

function safeParseJSON(value, fallback) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeLegacyKeys(legacyKeys) {
  if (!legacyKeys) return [];
  return Array.isArray(legacyKeys) ? legacyKeys : [legacyKeys];
}

export function resolveUserKey(userKey) {
  if (typeof userKey !== 'string') return GUEST_USER_KEY;
  const trimmed = userKey.trim();
  return trimmed || GUEST_USER_KEY;
}

export function getUserStorageKey(feature, userKey) {
  return `chatlon::${feature}::${resolveUserKey(userKey)}`;
}

export function readScopedJSON(feature, userKey, legacyKeys, fallback) {
  const scopedKey = getUserStorageKey(feature, userKey);
  const scopedRaw = localStorage.getItem(scopedKey);
  if (scopedRaw !== null) {
    return safeParseJSON(scopedRaw, fallback);
  }
  for (const legacyKey of normalizeLegacyKeys(legacyKeys)) {
    const raw = localStorage.getItem(legacyKey);
    if (raw !== null) {
      return safeParseJSON(raw, fallback);
    }
  }
  return fallback;
}

export function writeScopedJSON(feature, userKey, value) {
  const scopedKey = getUserStorageKey(feature, userKey);
  if (value === undefined || value === null) {
    localStorage.removeItem(scopedKey);
    return;
  }
  localStorage.setItem(scopedKey, JSON.stringify(value));
}

export function readScopedFlag(feature, userKey, legacyKeys, fallbackBool = false) {
  const scopedKey = getUserStorageKey(feature, userKey);
  const scopedRaw = localStorage.getItem(scopedKey);
  if (scopedRaw !== null) {
    return scopedRaw === 'true';
  }
  for (const legacyKey of normalizeLegacyKeys(legacyKeys)) {
    const raw = localStorage.getItem(legacyKey);
    if (raw !== null) {
      return raw === 'true';
    }
  }
  return Boolean(fallbackBool);
}

export function writeScopedFlag(feature, userKey, enabled) {
  const scopedKey = getUserStorageKey(feature, userKey);
  if (enabled) {
    localStorage.setItem(scopedKey, 'true');
  } else {
    localStorage.removeItem(scopedKey);
  }
}

export function removeScoped(feature, userKey) {
  localStorage.removeItem(getUserStorageKey(feature, userKey));
}

export default {
  resolveUserKey,
  getUserStorageKey,
  readScopedJSON,
  writeScopedJSON,
  readScopedFlag,
  writeScopedFlag,
  removeScoped
};
