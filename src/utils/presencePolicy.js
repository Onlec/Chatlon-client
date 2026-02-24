import { getPresenceStatus, PRESENCE_TIMEOUT } from './presenceUtils';

export const PRESENCE_ONLINE_GRACE_MS = 0;
export const PRESENCE_OFFLINE_GRACE_MS = 12000;
export const PRESENCE_MIN_DWELL_MS = 3000;

export function isHeartbeatFresh(rawPresence, now, timeoutMs = PRESENCE_TIMEOUT) {
  if (!rawPresence) return false;
  const heartbeatAt = Number(rawPresence.heartbeatAt) || Number(rawPresence.lastSeen) || 0;
  if (!heartbeatAt) return false;
  return (now - heartbeatAt) <= timeoutMs;
}

export function computePresenceState(rawPresence, now, policyConfig = {}) {
  const timeoutMs = Number(policyConfig.timeoutMs) || PRESENCE_TIMEOUT;
  const derived = getPresenceStatus(rawPresence);
  const heartbeatAt = Number(rawPresence?.heartbeatAt) || Number(rawPresence?.lastSeen) || 0;
  const heartbeatSeq = Number(rawPresence?.heartbeatSeq) || 0;
  const sessionId = typeof rawPresence?.sessionId === 'string' ? rawPresence.sessionId : '';
  const fresh = isHeartbeatFresh(rawPresence, now, timeoutMs);
  const baseValue = derived.value === 'offline' || !fresh ? 'offline' : 'online';

  return {
    value: baseValue,
    statusValue: derived.value,
    observedAt: now,
    heartbeatAt,
    heartbeatSeq,
    sessionId,
    fresh
  };
}

export function shouldEmitOnlineTransition(prevComputed, nextComputed) {
  const prevStatus = prevComputed?.statusValue || prevComputed?.value || 'offline';
  const nextStatus = nextComputed?.statusValue || nextComputed?.value || 'offline';
  const wasOffline = prevStatus === 'offline' || prevComputed?.value === 'offline';
  const isNowReachable = nextStatus === 'online' || nextStatus === 'away' || nextStatus === 'busy';
  return wasOffline && isNowReachable;
}

export function isStaleTransition(prevComputed, nextComputed, minDwellMs = PRESENCE_MIN_DWELL_MS) {
  if (!prevComputed || !nextComputed) return false;
  if (prevComputed.value === nextComputed.value) return false;
  const lastTransitionAt = Number(prevComputed.transitionedAt) || 0;
  if (!lastTransitionAt) return false;
  return (Number(nextComputed.observedAt) - lastTransitionAt) < minDwellMs;
}

export default {
  PRESENCE_ONLINE_GRACE_MS,
  PRESENCE_OFFLINE_GRACE_MS,
  PRESENCE_MIN_DWELL_MS,
  isHeartbeatFresh,
  computePresenceState,
  shouldEmitOnlineTransition,
  isStaleTransition
};
