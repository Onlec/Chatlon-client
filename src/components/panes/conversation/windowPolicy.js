export const LEGACY_BASE_VISIBLE_COUNT = 5;
export const LOAD_OLDER_STEP = 25;
export const NEAR_BOTTOM_THRESHOLD_PX = 48;

export function countNonLegacyMessages(messages = []) {
  return messages.filter((msg) => msg && !msg.isLegacy).length;
}

export function computeVisibleTarget(totalMessages, nonLegacyCount) {
  const total = Number(totalMessages) || 0;
  const nonLegacy = Number(nonLegacyCount) || 0;
  return Math.min(total, LEGACY_BASE_VISIBLE_COUNT + nonLegacy);
}

export function shouldAutoScroll({ wasNearBottom, hasLoadedOlder }) {
  return Boolean(wasNearBottom) || !Boolean(hasLoadedOlder);
}

export function getLoadOlderLimit(previousLimit) {
  const prev = Number(previousLimit) || 0;
  return prev + LOAD_OLDER_STEP;
}

