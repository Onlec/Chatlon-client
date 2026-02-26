import { gun } from '../gun';

export const USER_PREFS_ROOT = 'USER_PREFS';

export const PREF_KEYS = {
  SETTINGS: 'settings',
  SCANLINES: 'scanlines',
  DESKTOP_SHORTCUTS: 'desktopShortcuts',
  AUTO_SIGNIN: 'autoSignin',
  REMEMBER_ME: 'rememberMe',
  META: '_meta'
};

function normalizeUserKey(userKey) {
  if (typeof userKey !== 'string') return 'guest';
  const trimmed = userKey.trim();
  return trimmed || 'guest';
}

function normalizeData(data) {
  if (!data || typeof data !== 'object') return {};
  const next = { ...data };
  delete next._;
  delete next['#'];
  return next;
}

export function getUserPrefsNode(userKey) {
  return gun.get(USER_PREFS_ROOT).get(normalizeUserKey(userKey));
}

export function readUserPrefsOnce(userKey) {
  return new Promise((resolve) => {
    getUserPrefsNode(userKey).once((data) => {
      resolve(normalizeData(data));
    });
  });
}

export function readUserPrefOnce(userKey, key, fallback = null) {
  return new Promise((resolve) => {
    getUserPrefsNode(userKey).get(key).once((value) => {
      if (value === undefined || value === null) {
        resolve(fallback);
        return;
      }
      if (typeof fallback === 'object' && fallback !== null && typeof value === 'object' && value !== null) {
        resolve({ ...fallback, ...normalizeData(value) });
        return;
      }
      resolve(value);
    });
  });
}

export function writeUserPrefs(userKey, patch) {
  const payload = {
    ...patch,
    [PREF_KEYS.META]: {
      updatedAt: Date.now()
    }
  };
  return new Promise((resolve, reject) => {
    getUserPrefsNode(userKey).put(payload, (ack) => {
      if (ack?.err) {
        reject(new Error(ack.err));
        return;
      }
      resolve(ack);
    });
  });
}

export function writeUserPref(userKey, key, value) {
  return writeUserPrefs(userKey, { [key]: value });
}

export function subscribeUserPrefs(userKey, callback) {
  const node = getUserPrefsNode(userKey);
  node.on((data) => {
    callback(normalizeData(data));
  });
  return () => node.off();
}

export default {
  USER_PREFS_ROOT,
  PREF_KEYS,
  getUserPrefsNode,
  readUserPrefsOnce,
  readUserPrefOnce,
  writeUserPrefs,
  writeUserPref,
  subscribeUserPrefs
};
