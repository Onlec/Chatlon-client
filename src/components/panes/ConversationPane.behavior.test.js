import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

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

describe('ConversationPane behavior guards', () => {
  beforeEach(() => {
    mockNodeStore.clear();
    mockPlaySound.mockClear();
    gun.get.mockImplementation((key) => mockGetNode(key));
  });

  test('typing and send are guarded until session is ready', async () => {
    const clearNotificationTime = jest.fn();
    render(
      <ConversationPane
        contactName="bob@example.com"
        lastNotificationTime={1000}
        clearNotificationTime={clearNotificationTime}
        contactPresenceData={null}
        isActive
      />
    );

    expect(clearNotificationTime).toHaveBeenCalledWith('bob@example.com');

    const textarea = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: 'Verzenden' });
    expect(textarea.disabled).toBe(true);
    expect(sendButton.disabled).toBe(true);

    const sessionIdNode = mockGetNode('ACTIVE_SESSIONS/alice@example.com_bob@example.com/sessionId');
    act(() => {
      sessionIdNode.__emit('CHAT_alice_bob_ready');
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox').disabled).toBe(false);
    });

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hoi Bob' } });

    await waitFor(() => {
      expect(mockGetNode('TYPING_CHAT_alice_bob_ready').put).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Verzenden' }));

    await waitFor(() => {
      expect(mockGetNode('CHAT_alice_bob_ready').get).toHaveBeenCalledTimes(1);
    });

    const messageKey = mockGetNode('CHAT_alice_bob_ready').get.mock.calls[0][0];
    expect(mockGetNode(`CHAT_alice_bob_ready/${messageKey}`).put).toHaveBeenCalledTimes(1);
  });

  test('incoming nudge side effects fire once per unique timestamp', async () => {
    render(
      <ConversationPane
        contactName="bob@example.com"
        lastNotificationTime={1000}
        clearNotificationTime={jest.fn()}
        contactPresenceData={null}
        isActive
      />
    );

    const sessionIdNode = mockGetNode('ACTIVE_SESSIONS/alice@example.com_bob@example.com/sessionId');
    act(() => {
      sessionIdNode.__emit('CHAT_alice_bob_ready');
    });

    await waitFor(() => {
      expect(mockGetNode('NUDGE_CHAT_alice_bob_ready').on).toHaveBeenCalledTimes(1);
    });

    const nudgeNode = mockGetNode('NUDGE_CHAT_alice_bob_ready');
    const nudgeTime = Date.now() + 1000;
    act(() => {
      nudgeNode.__emit({ from: 'bob@example.com', time: nudgeTime });
      nudgeNode.__emit({ from: 'bob@example.com', time: nudgeTime });
    });

    expect(mockPlaySound).toHaveBeenCalledTimes(1);
  });
});
