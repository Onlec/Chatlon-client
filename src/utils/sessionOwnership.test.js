import {
  getSessionStartedAt,
  isForeignActiveSession,
  shouldYieldToIncomingSession
} from './sessionOwnership';

describe('sessionOwnership', () => {
  test('isForeignActiveSession returns false for stale heartbeat', () => {
    const now = 10000;
    const result = isForeignActiveSession(
      { heartbeat: now - 15000, clientId: 'other' },
      'mine',
      now,
      10000
    );
    expect(result).toBe(false);
  });

  test('isForeignActiveSession returns false for same clientId', () => {
    const now = 10000;
    const result = isForeignActiveSession(
      { heartbeat: now - 1000, clientId: 'mine' },
      'mine',
      now,
      10000
    );
    expect(result).toBe(false);
  });

  test('isForeignActiveSession returns true for fresh foreign active session', () => {
    const now = 10000;
    const result = isForeignActiveSession(
      { heartbeat: now - 1000, clientId: 'other' },
      'mine',
      now,
      10000
    );
    expect(result).toBe(true);
  });

  test('getSessionStartedAt prefers explicit sessionStartedAt', () => {
    expect(getSessionStartedAt({ sessionStartedAt: 12345, tabId: 'client_1_a_10_b' })).toBe(12345);
  });

  test('getSessionStartedAt falls back to tabId timestamp', () => {
    expect(getSessionStartedAt({ tabId: 'client_1000_abcd_2000_efgh' })).toBe(2000);
  });

  test('shouldYieldToIncomingSession ignores stale heartbeat events', () => {
    const shouldYield = shouldYieldToIncomingSession({
      incoming: {
        tabId: 'client_1_other_5000_b',
        heartbeat: 4500,
        account: 'alice@example.com',
        clientId: 'remote',
        sessionStartedAt: 5000
      },
      currentUser: 'alice@example.com',
      localTabClientId: 'mine',
      sessionStartMs: 5000,
      myTabId: 'client_1_mine_5000_a'
    });
    expect(shouldYield).toBe(false);
  });

  test('shouldYieldToIncomingSession ignores same clientId', () => {
    const shouldYield = shouldYieldToIncomingSession({
      incoming: {
        tabId: 'client_1_other_7000_b',
        heartbeat: 9000,
        account: 'alice@example.com',
        clientId: 'mine',
        sessionStartedAt: 7000
      },
      currentUser: 'alice@example.com',
      localTabClientId: 'mine',
      sessionStartMs: 6000,
      myTabId: 'client_1_mine_6000_a'
    });
    expect(shouldYield).toBe(false);
  });

  test('shouldYieldToIncomingSession yields to newer session', () => {
    const shouldYield = shouldYieldToIncomingSession({
      incoming: {
        tabId: 'client_1_other_7000_b',
        heartbeat: 9000,
        account: 'alice@example.com',
        clientId: 'remote',
        sessionStartedAt: 7000
      },
      currentUser: 'alice@example.com',
      localTabClientId: 'mine',
      sessionStartMs: 6000,
      myTabId: 'client_1_mine_6000_a'
    });
    expect(shouldYield).toBe(true);
  });

  test('shouldYieldToIncomingSession ignores older session', () => {
    const shouldYield = shouldYieldToIncomingSession({
      incoming: {
        tabId: 'client_1_other_5000_b',
        heartbeat: 9000,
        account: 'alice@example.com',
        clientId: 'remote',
        sessionStartedAt: 5000
      },
      currentUser: 'alice@example.com',
      localTabClientId: 'mine',
      sessionStartMs: 6000,
      myTabId: 'client_1_mine_6000_a'
    });
    expect(shouldYield).toBe(false);
  });

  test('shouldYieldToIncomingSession uses lexical tie-break on equal start time', () => {
    const shouldYield = shouldYieldToIncomingSession({
      incoming: {
        tabId: 'client_1_other_6000_z',
        heartbeat: 9000,
        account: 'alice@example.com',
        clientId: 'remote',
        sessionStartedAt: 6000
      },
      currentUser: 'alice@example.com',
      localTabClientId: 'mine',
      sessionStartMs: 6000,
      myTabId: 'client_1_mine_6000_a'
    });
    expect(shouldYield).toBe(true);
  });

  test('shouldYieldToIncomingSession falls back to tabId timestamp when sessionStartedAt missing', () => {
    const shouldYield = shouldYieldToIncomingSession({
      incoming: {
        tabId: 'client_1_other_7000_z',
        heartbeat: 9000,
        account: 'alice@example.com',
        clientId: 'remote'
      },
      currentUser: 'alice@example.com',
      localTabClientId: 'mine',
      sessionStartMs: 6000,
      myTabId: 'client_1_mine_6000_a'
    });
    expect(shouldYield).toBe(true);
  });
});
