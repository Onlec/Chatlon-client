import { SESSION_NOTICE_KEY, SESSION_NOTICE_TTL_MS } from './sessionConstants';

function getStorage(storageOverride) {
  if (storageOverride) return storageOverride;
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

export function createConflictSessionNotice(nowMs = Date.now()) {
  return {
    id: `conflict_${nowMs}`,
    type: 'conflict',
    title: 'Sessie beeindigd',
    message: 'Je bent aangemeld op een andere locatie. Deze sessie is afgesloten.',
    createdAt: nowMs
  };
}

export function saveSessionNotice(notice, storageOverride) {
  const storage = getStorage(storageOverride);
  if (!storage || !notice) return;

  try {
    storage.setItem(SESSION_NOTICE_KEY, JSON.stringify(notice));
  } catch {
    // no-op: storage may be unavailable
  }
}

export function clearSessionNotice(storageOverride) {
  const storage = getStorage(storageOverride);
  if (!storage) return;

  try {
    storage.removeItem(SESSION_NOTICE_KEY);
  } catch {
    // no-op: storage may be unavailable
  }
}

export function loadSessionNotice({
  nowMs = Date.now(),
  ttlMs = SESSION_NOTICE_TTL_MS,
  storageOverride
} = {}) {
  const storage = getStorage(storageOverride);
  if (!storage) return null;

  try {
    const raw = storage.getItem(SESSION_NOTICE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const createdAt = Number(parsed?.createdAt);
    if (!Number.isFinite(createdAt) || createdAt <= 0) {
      clearSessionNotice(storage);
      return null;
    }

    if (nowMs - createdAt >= ttlMs) {
      clearSessionNotice(storage);
      return null;
    }

    return parsed;
  } catch {
    clearSessionNotice(storage);
    return null;
  }
}

