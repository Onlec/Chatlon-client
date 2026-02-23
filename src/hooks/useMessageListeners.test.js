import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useMessageListeners } from './useMessageListeners';

jest.mock('../utils/encryption', () => ({
  decryptMessage: jest.fn(async (content) => content)
}));

jest.mock('../gun', () => {
  const nodeStore = new Map();

  function createNode(path) {
    const valueListeners = [];
    const mapListeners = [];

    return {
      path,
      get: jest.fn((child) => getNode(`${path}/${child}`)),
      map: jest.fn(() => ({
        on: jest.fn((cb) => {
          mapListeners.push(cb);
        })
      })),
      on: jest.fn((cb) => {
        valueListeners.push(cb);
      }),
      off: jest.fn(() => {
        valueListeners.length = 0;
        mapListeners.length = 0;
      }),
      __emit(value, key) {
        valueListeners.slice().forEach((cb) => cb(value, key));
      },
      __emitMap(value, key) {
        mapListeners.slice().forEach((cb) => cb(value, key));
      }
    };
  }

  function getNode(path) {
    if (!nodeStore.has(path)) {
      nodeStore.set(path, createNode(path));
    }
    return nodeStore.get(path);
  }

  return {
    gun: {
      get: jest.fn((key) => getNode(key))
    },
    user: {
      is: { alias: 'alice@example.com' },
      get: jest.fn((key) => getNode(`user/${key}`))
    },
    __mockGetNode: getNode,
    __mockNodeStore: nodeStore
  };
});

const { gun, user, __mockGetNode: getNode, __mockNodeStore: nodeStore } = require('../gun');

function HookHarness(props) {
  useMessageListeners(props);
  return null;
}

describe('useMessageListeners', () => {
  beforeEach(() => {
    nodeStore.clear();
    gun.get.mockImplementation((key) => getNode(key));
    user.get.mockImplementation((key) => getNode(`user/${key}`));
  });

  test('keeps delivering messages after transient empty active session events', async () => {
    const onMessage = jest.fn();
    const onNotification = jest.fn();

    const conversationsRef = { current: {} };
    const activePaneRef = { current: null };
    const shownToastsRef = { current: new Set() };

    render(
      <HookHarness
        isLoggedIn
        currentUser="alice@example.com"
        conversationsRef={conversationsRef}
        activePaneRef={activePaneRef}
        showToast={jest.fn()}
        shownToastsRef={shownToastsRef}
        onMessage={onMessage}
        onNotification={onNotification}
        getAvatar={() => '/avatar.png'}
      />
    );

    // Attach contact listener path.
    getNode('user/contacts').__emitMap(
      { username: 'bob@example.com', status: 'accepted', blocked: false, canMessage: true },
      'bob@example.com'
    );

    const pairId = 'alice@example.com_bob@example.com';
    const activeSessionIdNode = getNode(`ACTIVE_SESSIONS/${pairId}/sessionId`);
    activeSessionIdNode.__emit('CHAT_alice_bob_1');

    const chatNode = getNode('CHAT_alice_bob_1');
    chatNode.__emitMap(
      { sender: 'bob@example.com', content: 'one', timeRef: Date.now() },
      'msg-1'
    );

    await waitFor(() => {
      expect(onMessage).toHaveBeenCalledTimes(1);
      expect(onNotification).toHaveBeenCalledTimes(1);
    });

    // Simulate transient empty session pointer (must NOT detach active chat listener).
    activeSessionIdNode.__emit(null);

    chatNode.__emitMap(
      { sender: 'bob@example.com', content: 'two', timeRef: Date.now() + 1 },
      'msg-2'
    );

    await waitFor(() => {
      expect(onMessage).toHaveBeenCalledTimes(2);
      expect(onNotification).toHaveBeenCalledTimes(2);
    });
  });

  test('shows friend request toast only for receiver account', async () => {
    const showToast = jest.fn();

    render(
      <HookHarness
        isLoggedIn
        currentUser="alice@example.com"
        conversationsRef={{ current: {} }}
        activePaneRef={{ current: null }}
        showToast={showToast}
        shownToastsRef={{ current: new Set() }}
        onMessage={jest.fn()}
        onNotification={jest.fn()}
        getAvatar={() => '/avatar.png'}
      />
    );

    const requestsNode = getNode('friendRequests/alice@example.com');
    const now = Date.now() + 50;

    // Self-authored request should never toast on sender.
    requestsNode.__emitMap(
      { from: 'alice@example.com', to: 'bob@example.com', status: 'pending', timestamp: now + 1 },
      'req-self'
    );

    // Mismatched target should never toast.
    requestsNode.__emitMap(
      { from: 'bob@example.com', to: 'carol@example.com', status: 'pending', timestamp: now + 2 },
      'req-other-target'
    );

    // Valid incoming request should toast once.
    requestsNode.__emitMap(
      { from: 'bob@example.com', to: 'alice@example.com', status: 'pending', timestamp: now + 3 },
      'req-valid'
    );

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledTimes(1);
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'friendRequest',
          from: 'bob@example.com',
          requestId: 'req-valid'
        })
      );
    });
  });
});
