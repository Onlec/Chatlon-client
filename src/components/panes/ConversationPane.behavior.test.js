import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { getContactPairId } from '../../utils/chatUtils';

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
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

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

  test('creates a new session once when none exists and enables input', async () => {
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

    const sessionIdNode = mockGetNode('ACTIVE_SESSIONS/alice@example.com_bob@example.com/sessionId');
    // Simulate "no existing session" on confirm read.
    sessionIdNode.once.mockImplementation((cb) => cb(null));

    act(() => {
      sessionIdNode.__emit(null);
      jest.advanceTimersByTime(801);
    });

    await waitFor(() => {
      expect(mockGetNode('ACTIVE_SESSIONS/alice@example.com_bob@example.com').put).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByRole('textbox').disabled).toBe(false);
      expect(screen.getByRole('button', { name: 'Verzenden' }).disabled).toBe(false);
    });
  });

  test('does not create duplicate sessions during quick reopen/race events', async () => {
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
    sessionIdNode.once.mockImplementation((cb) => cb(null));

    // Trigger several transient empties rapidly.
    act(() => {
      sessionIdNode.__emit(null);
      sessionIdNode.__emit(null);
      sessionIdNode.__emit('');
      jest.advanceTimersByTime(801);
    });

    const sessionRoot = mockGetNode('ACTIVE_SESSIONS/alice@example.com_bob@example.com');
    await waitFor(() => {
      expect(sessionRoot.put).toHaveBeenCalledTimes(1);
    });

    // Reopen same conversation quickly; first generation timer should not create again.
    rerender(
      <ConversationPane
        contactName="bob@example.com"
        lastNotificationTime={2000}
        clearNotificationTime={clearNotificationTime}
        contactPresenceData={null}
        isActive
      />
    );

    act(() => {
      sessionIdNode.__emit('CHAT_alice_bob_existing');
      jest.advanceTimersByTime(801);
    });

    // No second create write after existing session is announced.
    await waitFor(() => {
      expect(sessionRoot.put).toHaveBeenCalledTimes(1);
    });
  });

  test('ignores chat stream noise and renders only valid messages', async () => {
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
      expect(mockGetNode('CHAT_alice_bob_ready').map).toHaveBeenCalledTimes(1);
    });

    const chatNode = mockGetNode('CHAT_alice_bob_ready');
    act(() => {
      chatNode.__emitMap({ sender: 'bob@example.com', content: 'meta-underscore', timeRef: Date.now() }, '_');
      chatNode.__emitMap({ sender: 'bob@example.com', content: 'meta-hash', timeRef: Date.now() }, '#');
      chatNode.__emitMap({ sender: '', content: 'missing-sender', timeRef: Date.now() }, 'msg-no-sender');
      chatNode.__emitMap({ sender: 'bob@example.com', content: '', timeRef: Date.now() }, 'msg-no-content');
      chatNode.__emitMap({ sender: 'bob@example.com', content: 'valid-message', timeRef: Date.now() }, 'msg-valid');
    });

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.queryByText('meta-underscore')).toBeNull();
      expect(screen.queryByText('meta-hash')).toBeNull();
      expect(screen.queryByText('missing-sender')).toBeNull();
      expect(document.querySelectorAll('.chat-message')).toHaveLength(1);
    });
  });

  test('legacy backlog does not auto-grow visible window, non-legacy arrivals do', async () => {
    render(
      <ConversationPane
        contactName="bob@example.com"
        lastNotificationTime={Date.now()}
        clearNotificationTime={jest.fn()}
        contactPresenceData={null}
        isActive
      />
    );

    const sessionIdNode = mockGetNode('ACTIVE_SESSIONS/alice@example.com_bob@example.com/sessionId');
    act(() => {
      sessionIdNode.__emit('CHAT_alice_bob_ready');
    });

    const chatNode = mockGetNode('CHAT_alice_bob_ready');
    act(() => {
      for (let i = 0; i < 8; i += 1) {
        chatNode.__emitMap(
          { sender: 'bob@example.com', content: `legacy-${i}`, timeRef: Date.now() - 60000 - i },
          `legacy-${i}`
        );
      }
    });

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(document.querySelectorAll('.chat-message').length).toBe(5);
      expect(screen.getByText(/Laad oudere berichten/)).toBeInTheDocument();
    });

    act(() => {
      chatNode.__emitMap(
        { sender: 'bob@example.com', content: 'fresh-live', timeRef: Date.now() },
        'fresh-live'
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(document.querySelectorAll('.chat-message').length).toBe(6);
    });
  });

  test('rapid non-legacy burst remains visible without message loss', async () => {
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

    const chatNode = mockGetNode('CHAT_alice_bob_ready');
    act(() => {
      for (let i = 0; i < 20; i += 1) {
        chatNode.__emitMap(
          { sender: 'bob@example.com', content: `burst-${i}`, timeRef: Date.now() + i },
          `burst-${i}`
        );
      }
    });

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(document.querySelectorAll('.chat-message').length).toBe(20);
    });
  });

  test('initial mixed hydration shows 5 legacy plus all unread non-legacy messages', async () => {
    const now = Date.now();
    render(
      <ConversationPane
        contactName="bob@example.com"
        lastNotificationTime={now}
        clearNotificationTime={jest.fn()}
        contactPresenceData={null}
        isActive
      />
    );

    const sessionIdNode = mockGetNode('ACTIVE_SESSIONS/alice@example.com_bob@example.com/sessionId');
    act(() => {
      sessionIdNode.__emit('CHAT_alice_bob_ready');
    });

    const chatNode = mockGetNode('CHAT_alice_bob_ready');
    act(() => {
      // Older backlog (legacy)
      for (let i = 0; i < 20; i += 1) {
        chatNode.__emitMap(
          { sender: 'bob@example.com', content: `old-${i}`, timeRef: now - 60000 - i },
          `old-${i}`
        );
      }
      // Unread recent messages (non-legacy)
      for (let i = 0; i < 6; i += 1) {
        chatNode.__emitMap(
          { sender: 'bob@example.com', content: `new-${i}`, timeRef: now + i },
          `new-${i}`
        );
      }
    });

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(document.querySelectorAll('.chat-message').length).toBe(11);
      expect(screen.getByText(/Laad oudere berichten/)).toBeInTheDocument();
    });
  });

  test('does not double-count legacy window when unread burst is large', async () => {
    const now = Date.now();
    render(
      <ConversationPane
        contactName="bob@example.com"
        lastNotificationTime={now}
        clearNotificationTime={jest.fn()}
        contactPresenceData={null}
        isActive
      />
    );

    const sessionIdNode = mockGetNode('ACTIVE_SESSIONS/alice@example.com_bob@example.com/sessionId');
    act(() => {
      sessionIdNode.__emit('CHAT_alice_bob_ready');
    });

    const chatNode = mockGetNode('CHAT_alice_bob_ready');
    act(() => {
      for (let i = 0; i < 30; i += 1) {
        chatNode.__emitMap(
          { sender: 'bob@example.com', content: `old-${i}`, timeRef: now - 60000 - i },
          `old-${i}`
        );
      }
      for (let i = 0; i < 10; i += 1) {
        chatNode.__emitMap(
          { sender: 'bob@example.com', content: `new-${i}`, timeRef: now + i },
          `new-${i}`
        );
      }
    });

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      // Expected window: 5 legacy + 10 unread non-legacy = 15 (not 25).
      expect(document.querySelectorAll('.chat-message').length).toBe(15);
    });
  });

  test('incoming game invite remains visible within 5-minute stale window', async () => {
    render(
      <ConversationPane
        contactName="bob@example.com"
        lastNotificationTime={1000}
        clearNotificationTime={jest.fn()}
        contactPresenceData={null}
      />
    );

    const pairId = getContactPairId('alice@example.com', 'bob@example.com');
    const invitesNode = mockGetNode(`GAME_INVITES_${pairId}`);
    const recent = Date.now() - (4 * 60 * 1000);

    act(() => {
      invitesNode.__emitMap({
        inviter: 'bob@example.com',
        invitee: 'alice@example.com',
        gameType: 'tictactoe',
        gameSessionId: 'GAME_TEST_RECENT',
        status: 'pending',
        createdAt: recent,
        updatedAt: recent
      }, 'req_recent');
    });

    await waitFor(() => {
      expect(screen.getByText(/wil Tic Tac Toe spelen/)).toBeInTheDocument();
    });
  });

  test('ignores incoming game invite older than 5 minutes', async () => {
    render(
      <ConversationPane
        contactName="bob@example.com"
        lastNotificationTime={1000}
        clearNotificationTime={jest.fn()}
        contactPresenceData={null}
      />
    );

    const pairId = getContactPairId('alice@example.com', 'bob@example.com');
    const invitesNode = mockGetNode(`GAME_INVITES_${pairId}`);
    const stale = Date.now() - (6 * 60 * 1000);

    act(() => {
      invitesNode.__emitMap({
        inviter: 'bob@example.com',
        invitee: 'alice@example.com',
        gameType: 'tictactoe',
        gameSessionId: 'GAME_TEST_STALE',
        status: 'pending',
        createdAt: stale,
        updatedAt: stale
      }, 'req_stale');
    });

    expect(screen.queryByText(/wil Tic Tac Toe spelen/)).toBeNull();
  });

  test('cancels outgoing invite on the same requestId node', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1710000000000);
    render(
      <ConversationPane
        contactName="bob@example.com"
        lastNotificationTime={1000}
        clearNotificationTime={jest.fn()}
        contactPresenceData={null}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Spelletjes/i }));
    fireEvent.click(screen.getByRole('button', { name: /Tic Tac Toe/i }));

    const pairId = getContactPairId('alice@example.com', 'bob@example.com');
    const requestId = 'alice@example.com_tictactoe_1710000000000';
    const requestNode = mockGetNode(`GAME_INVITES_${pairId}/${requestId}`);

    await waitFor(() => {
      expect(requestNode.put).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
    });

    fireEvent.click(screen.getByRole('button', { name: /Annuleren/i }));

    await waitFor(() => {
      expect(requestNode.put).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
    });

    nowSpy.mockRestore();
  });

  test('disables games button when local game pane is open', () => {
    render(
      <ConversationPane
        contactName="bob@example.com"
        lastNotificationTime={1000}
        clearNotificationTime={jest.fn()}
        contactPresenceData={null}
        hasOpenGamePane
      />
    );

    expect(screen.getByRole('button', { name: /Spelletjes/i })).toBeDisabled();
  });
});
