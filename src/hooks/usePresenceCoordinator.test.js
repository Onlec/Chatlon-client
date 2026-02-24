import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { usePresenceCoordinator } from './usePresenceCoordinator';

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
        }),
        off: jest.fn(() => {
          mapListeners.length = 0;
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
      get: jest.fn((key) => getNode(`user/${key}`))
    },
    __mockGetNode: getNode,
    __mockNodeStore: nodeStore
  };
});

const { gun, user, __mockGetNode: getNode, __mockNodeStore: nodeStore } = require('../gun');

let latest = null;

function Harness(props) {
  latest = usePresenceCoordinator(props);
  return null;
}

describe('usePresenceCoordinator', () => {
  beforeEach(() => {
    nodeStore.clear();
    gun.get.mockImplementation((key) => getNode(key));
    user.get.mockImplementation((key) => getNode(`user/${key}`));
    latest = null;
  });

  test('attach/detach follows contact eligibility', async () => {
    render(
      <Harness
        isLoggedIn
        currentUser="alice@example.com"
        onContactOnline={jest.fn()}
      />
    );

    const contactsNode = getNode('user/contacts');
    act(() => {
      contactsNode.__emitMap(
        { username: 'bob@example.com', status: 'accepted', blocked: false, canMessage: true, inList: true, visibility: 'full' },
        'bob@example.com'
      );
    });

    await waitFor(() => {
      expect(latest.hasPresenceListener('bob@example.com')).toBe(true);
    });

    act(() => {
      contactsNode.__emitMap(
        { username: 'bob@example.com', status: 'pending', canMessage: false, inList: true, visibility: 'limbo' },
        'bob@example.com'
      );
    });

    await waitFor(() => {
      expect(latest.hasPresenceListener('bob@example.com')).toBe(false);
    });
  });

  test('offline to online transition triggers onContactOnline exactly once', async () => {
    const onContactOnline = jest.fn();
    render(
      <Harness
        isLoggedIn
        currentUser="alice@example.com"
        onContactOnline={onContactOnline}
      />
    );

    const contactsNode = getNode('user/contacts');
    act(() => {
      contactsNode.__emitMap(
        { username: 'bob@example.com', status: 'accepted', blocked: false, canMessage: true, inList: true, visibility: 'full' },
        'bob@example.com'
      );
    });

    const bobPresenceNode = getNode('PRESENCE/bob@example.com');
    act(() => {
      bobPresenceNode.__emit({ status: 'offline', lastSeen: 0, username: 'bob@example.com' });
      bobPresenceNode.__emit({ status: 'online', lastSeen: Date.now(), username: 'bob@example.com' });
      bobPresenceNode.__emit({ status: 'online', lastSeen: Date.now() + 1, username: 'bob@example.com' });
    });

    await waitFor(() => {
      expect(onContactOnline).toHaveBeenCalledTimes(1);
      expect(onContactOnline).toHaveBeenCalledWith('bob@example.com');
    });
  });

  test('cleanup on unmount removes listeners and resets transition baseline', async () => {
    const onContactOnline = jest.fn();

    const first = render(
      <Harness
        isLoggedIn
        currentUser="alice@example.com"
        onContactOnline={onContactOnline}
      />
    );

    const contactsNode = getNode('user/contacts');
    act(() => {
      contactsNode.__emitMap(
        { username: 'bob@example.com', status: 'accepted', blocked: false, canMessage: true, inList: true, visibility: 'full' },
        'bob@example.com'
      );
    });

    const bobPresenceNode = getNode('PRESENCE/bob@example.com');
    act(() => {
      bobPresenceNode.__emit({ status: 'offline', lastSeen: 0, username: 'bob@example.com' });
      bobPresenceNode.__emit({ status: 'online', lastSeen: Date.now(), username: 'bob@example.com' });
    });

    await waitFor(() => {
      expect(onContactOnline).toHaveBeenCalledTimes(1);
    });

    first.unmount();

    render(
      <Harness
        isLoggedIn
        currentUser="alice@example.com"
        onContactOnline={onContactOnline}
      />
    );

    act(() => {
      contactsNode.__emitMap(
        { username: 'bob@example.com', status: 'accepted', blocked: false, canMessage: true, inList: true, visibility: 'full' },
        'bob@example.com'
      );
      // First callback after remount defines baseline; should not produce transition toast.
      bobPresenceNode.__emit({ status: 'online', lastSeen: Date.now() + 100, username: 'bob@example.com' });
    });

    await waitFor(() => {
      expect(onContactOnline).toHaveBeenCalledTimes(1);
    });
  });
});
