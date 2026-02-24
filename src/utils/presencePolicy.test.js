import {
  computePresenceState,
  shouldEmitOnlineTransition,
  isHeartbeatFresh,
  isStaleTransition
} from './presencePolicy';

describe('presencePolicy', () => {
  test('shouldEmitOnlineTransition for offline -> online/away/busy', () => {
    expect(shouldEmitOnlineTransition(
      { value: 'offline', statusValue: 'offline' },
      { value: 'online', statusValue: 'online' }
    )).toBe(true);
    expect(shouldEmitOnlineTransition(
      { value: 'offline', statusValue: 'offline' },
      { value: 'online', statusValue: 'away' }
    )).toBe(true);
    expect(shouldEmitOnlineTransition(
      { value: 'offline', statusValue: 'offline' },
      { value: 'online', statusValue: 'busy' }
    )).toBe(true);
    expect(shouldEmitOnlineTransition(
      { value: 'online', statusValue: 'online' },
      { value: 'online', statusValue: 'away' }
    )).toBe(false);
  });

  test('isHeartbeatFresh uses heartbeatAt/lastSeen timeout', () => {
    const now = 1_000_000;
    expect(isHeartbeatFresh({ heartbeatAt: now - 5000 }, now, 10000)).toBe(true);
    expect(isHeartbeatFresh({ lastSeen: now - 15000 }, now, 10000)).toBe(false);
    expect(isHeartbeatFresh(null, now, 10000)).toBe(false);
  });

  test('computePresenceState derives offline when heartbeat stale or appear-offline', () => {
    const now = 2_000_000;
    const stale = computePresenceState(
      { status: 'online', heartbeatAt: now - 70_000, lastSeen: now - 70_000 },
      now
    );
    expect(stale.value).toBe('offline');

    const appearOffline = computePresenceState(
      { status: 'appear-offline', heartbeatAt: now - 1000, lastSeen: now - 1000 },
      now
    );
    expect(appearOffline.value).toBe('offline');
    expect(appearOffline.statusValue).toBe('offline');
  });

  test('isStaleTransition respects min dwell', () => {
    const prev = { value: 'online', transitionedAt: 1000 };
    const nextTooSoon = { value: 'offline', observedAt: 2000 };
    const nextLate = { value: 'offline', observedAt: 6000 };
    expect(isStaleTransition(prev, nextTooSoon, 3000)).toBe(true);
    expect(isStaleTransition(prev, nextLate, 3000)).toBe(false);
  });
});

