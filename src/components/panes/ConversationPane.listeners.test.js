import React from 'react';
import { act, render, waitFor } from '@testing-library/react';

const mockPlaySound = jest.fn();

jest.mock('../../gun', () => {
  const mockNodeStore = new Map();

  function createNode(path) {
    const mapListeners = [];
    const valueListeners = [];

    return {
      path,
      get: jest.fn((child) => mockGetNode(`${path}/${child}`)),
      map: jest.fn(() => ({
        on: jest.fn((callback) => {
          mapListeners.push(callback);
        })
      })),
      on: jest.fn((callback) => {
        valueListeners.push(callback);
      }),
      once: jest.fn(),
      put: jest.fn(),
      off: jest.fn(() => {
        mapListeners.length = 0;
        valueListeners.length = 0;
      }),
      __emit(value, key) {
        valueListeners.slice().forEach((callback) => callback(value, key));
      },
      __emitMap(value, key) {
        mapListeners.slice().forEach((callback) => callback(value, key));
      }
    };
  }

  function mockGetNode(path) {
    if (!mockNodeStore.has(path)) {
      mockNodeStore.set(path, createNode(path));
    }
    return mockNodeStore.get(path);
  }

  return {
    gun: {
      get: jest.fn((key) => mockGetNode(key))
    },
    user: {
      is: { alias: 'alice@example.com' }
    },
    __mockGetNode: mockGetNode,
    __mockNodeStore: mockNodeStore
  };
});

jest.mock('../../utils/encryption', () => ({
  encryptMessage: jest.fn(async (content) => content),
  decryptMessage: jest.fn(async (content) => content),
  warmupEncryption: jest.fn()
}));

jest.mock('../../hooks/useWebRTC', () => ({
  useWebRTC: () => ({
    callState: 'idle',
    isMuted: false,
    callDuration: 0,
    remoteAudioRef: { current: null },
    startCall: jest.fn(),
    acceptCall: jest.fn(),
    rejectCall: jest.fn(),
    hangUp: jest.fn(),
    toggleMute: jest.fn()
  })
}));

jest.mock('../../hooks/useSounds', () => ({
  useSounds: () => ({
    playSound: mockPlaySound
  })
}));

jest.mock('../../contexts/AvatarContext', () => ({
  useAvatar: () => ({
    getDisplayName: (username) => username,
    getAvatar: () => '/avatar.png'
  })
}));

jest.mock('../CallPanel', () => () => <div data-testid="call-panel" />);

const { gun, __mockGetNode: mockGetNode, __mockNodeStore: mockNodeStore } = require('../../gun');
const ConversationPane = require('./ConversationPane').default;

describe('ConversationPane listener lifecycle', () => {
  beforeEach(() => {
    mockNodeStore.clear();
    mockPlaySound.mockClear();
    gun.get.mockImplementation((key) => mockGetNode(key));
  });

  test('changing lastNotificationTime does not re-register chat listeners', async () => {
    const clearNotificationTime = jest.fn();
    const { rerender } = render(
      <ConversationPane
        contactName="bob@example.com"
        lastNotificationTime={1000}
        clearNotificationTime={clearNotificationTime}
        contactPresenceData={null}
        isActive
      />
    );

    const sessionIdNode = mockGetNode('ACTIVE_SESSIONS/alice@example.com_bob@example.com/sessionId');
    act(() => {
      sessionIdNode.__emit('CHAT_alice_bob_1');
    });

    let initialMapCalls = 0;
    await waitFor(() => {
      initialMapCalls = mockGetNode('CHAT_alice_bob_1').map.mock.calls.length;
      expect(initialMapCalls).toBeGreaterThan(0);
    });

    rerender(
      <ConversationPane
        contactName="bob@example.com"
        lastNotificationTime={2000}
        clearNotificationTime={clearNotificationTime}
        contactPresenceData={null}
        isActive
      />
    );

    await waitFor(() => {
      const currentMapCalls = mockGetNode('CHAT_alice_bob_1').map.mock.calls.length;
      expect(currentMapCalls).toBeLessThanOrEqual(initialMapCalls + 1);
    });
  });

  test('session switch detaches old stream listeners and unmount cleans active listeners', async () => {
    const clearNotificationTime = jest.fn();
    const { unmount } = render(
      <ConversationPane
        contactName="bob@example.com"
        lastNotificationTime={1000}
        clearNotificationTime={clearNotificationTime}
        contactPresenceData={null}
        isActive
      />
    );

    const sessionIdNode = mockGetNode('ACTIVE_SESSIONS/alice@example.com_bob@example.com/sessionId');
    act(() => {
      sessionIdNode.__emit('CHAT_alice_bob_A');
    });

    let sessionAMapCalls = 0;
    await waitFor(() => {
      sessionAMapCalls = mockGetNode('CHAT_alice_bob_A').map.mock.calls.length;
      expect(sessionAMapCalls).toBeGreaterThan(0);
      expect(mockGetNode('NUDGE_CHAT_alice_bob_A').on.mock.calls.length).toBeGreaterThan(0);
      expect(mockGetNode('TYPING_CHAT_alice_bob_A').on.mock.calls.length).toBeGreaterThan(0);
    });

    act(() => {
      sessionIdNode.__emit('CHAT_alice_bob_B');
    });

    await waitFor(() => {
      expect(mockGetNode('CHAT_alice_bob_B').map.mock.calls.length).toBeGreaterThan(0);
      expect(mockGetNode('CHAT_alice_bob_A').map.mock.calls.length).toBe(sessionAMapCalls);
      expect(mockGetNode('CHAT_alice_bob_A').off.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockGetNode('NUDGE_CHAT_alice_bob_A').off.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockGetNode('TYPING_CHAT_alice_bob_A').off.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    unmount();

    expect(mockGetNode('ACTIVE_SESSIONS/alice@example.com_bob@example.com/sessionId').off.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(mockGetNode('CHAT_alice_bob_B').off.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(mockGetNode('NUDGE_CHAT_alice_bob_B').off.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(mockGetNode('TYPING_CHAT_alice_bob_B').off.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
