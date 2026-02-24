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

  test('priority contact attaches immediately', () => {
    render(
      <Harness
        isLoggedIn
        currentUser="alice@example.com"
        onContactOnline={jest.fn()}
        priorityContacts={['prio@example.com']}
      />
    );

    const contactsNode = getNode('user/contacts');
    act(() => {
      contactsNode.__emitMap(
        { username: 'prio@example.com', status: 'accepted', blocked: false, canMessage: true, inList: true, visibility: 'full' },
        'prio@example.com'
      );
    });

    expect(latest.hasPresenceListener('prio@example.com')).toBe(true);
  });

  test('does not attach contact presence listeners while messenger is inactive', async () => {
    render(
      <Harness
        isLoggedIn
        currentUser="alice@example.com"
        isMessengerActive={false}
        onContactOnline={jest.fn()}
      />
    );

    const contactsNode = getNode('user/contacts');
    act(() => {
      contactsNode.__emitMap(
        { username: 'silent@example.com', status: 'accepted', blocked: false, canMessage: true, inList: true, visibility: 'full' },
        'silent@example.com'
      );
    });

    await waitFor(() => {
      expect(latest.hasPresenceListener('silent@example.com')).toBe(false);
      expect(latest.contactPresence['silent@example.com']).toBeUndefined();
    });
  });

  test('detaches active presence listeners when messenger transitions to inactive', async () => {
    const { rerender } = render(
      <Harness
        isLoggedIn
        currentUser="alice@example.com"
        isMessengerActive
        onContactOnline={jest.fn()}
      />
    );

    const contactsNode = getNode('user/contacts');
    act(() => {
      contactsNode.__emitMap(
        { username: 'drop@example.com', status: 'accepted', blocked: false, canMessage: true, inList: true, visibility: 'full' },
        'drop@example.com'
      );
    });

    await waitFor(() => {
      expect(latest.hasPresenceListener('drop@example.com')).toBe(true);
    });

    rerender(
      <Harness
        isLoggedIn
        currentUser="alice@example.com"
        isMessengerActive={false}
        onContactOnline={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(latest.hasPresenceListener('drop@example.com')).toBe(false);
      expect(latest.contactPresence['drop@example.com']).toBeUndefined();
    });
  });

  test('non-priority eligible contact attaches via queue', async () => {
    jest.useFakeTimers();
    render(
      <Harness
        isLoggedIn
        currentUser="alice@example.com"
        onContactOnline={jest.fn()}
        priorityContacts={[]}
      />
    );

    const contactsNode = getNode('user/contacts');
    act(() => {
      contactsNode.__emitMap(
        { username: 'queued@example.com', status: 'accepted', blocked: false, canMessage: true, inList: true, visibility: 'full' },
        'queued@example.com'
      );
    });

    expect(latest.hasPresenceListener('queued@example.com')).toBe(false);
    act(() => {
      jest.advanceTimersByTime(30);
    });
    expect(latest.hasPresenceListener('queued@example.com')).toBe(true);
    jest.useRealTimers();
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
    await waitFor(() => {
      expect(latest.hasPresenceListener('bob@example.com')).toBe(true);
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

  test('offline to away transition triggers onContactOnline exactly once', async () => {
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
        { username: 'carol@example.com', status: 'accepted', blocked: false, canMessage: true, inList: true, visibility: 'full' },
        'carol@example.com'
      );
    });
    await waitFor(() => {
      expect(latest.hasPresenceListener('carol@example.com')).toBe(true);
    });

    const carolPresenceNode = getNode('PRESENCE/carol@example.com');
    act(() => {
      carolPresenceNode.__emit({ status: 'offline', lastSeen: 0, username: 'carol@example.com' });
      carolPresenceNode.__emit({ status: 'away', lastSeen: Date.now(), username: 'carol@example.com' });
    });

    await waitFor(() => {
      expect(onContactOnline).toHaveBeenCalledTimes(1);
      expect(onContactOnline).toHaveBeenCalledWith('carol@example.com');
    });
  });

  test('appear-offline to online transition triggers onContactOnline', async () => {
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
        { username: 'dave@example.com', status: 'accepted', blocked: false, canMessage: true, inList: true, visibility: 'full' },
        'dave@example.com'
      );
    });
    await waitFor(() => {
      expect(latest.hasPresenceListener('dave@example.com')).toBe(true);
    });

    const davePresenceNode = getNode('PRESENCE/dave@example.com');
    const now = Date.now();
    act(() => {
      davePresenceNode.__emit({ status: 'online', lastSeen: now, username: 'dave@example.com' });
      davePresenceNode.__emit({ status: 'appear-offline', lastSeen: now + 10, username: 'dave@example.com' });
      davePresenceNode.__emit({ status: 'online', lastSeen: now + 20, username: 'dave@example.com' });
    });

    await waitFor(() => {
      expect(onContactOnline).toHaveBeenCalledTimes(1);
      expect(onContactOnline).toHaveBeenCalledWith('dave@example.com');
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
    await waitFor(() => {
      expect(latest.hasPresenceListener('bob@example.com')).toBe(true);
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
    });
    await waitFor(() => {
      expect(latest.hasPresenceListener('bob@example.com')).toBe(true);
    });
    act(() => {
      // First callback after remount defines baseline; should not produce transition toast.
      bobPresenceNode.__emit({ status: 'online', lastSeen: Date.now() + 100, username: 'bob@example.com' });
    });

    await waitFor(() => {
      expect(onContactOnline).toHaveBeenCalledTimes(1);
    });
  });

  test('out-of-order heartbeat replay is ignored and does not overwrite newer presence', async () => {
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
        { username: 'erin@example.com', status: 'accepted', blocked: false, canMessage: true, inList: true, visibility: 'full' },
        'erin@example.com'
      );
    });
    await waitFor(() => {
      expect(latest.hasPresenceListener('erin@example.com')).toBe(true);
    });

    const erinPresenceNode = getNode('PRESENCE/erin@example.com');
    act(() => {
      erinPresenceNode.__emit({
        status: 'online',
        lastSeen: 2000,
        heartbeatAt: 2000,
        heartbeatSeq: 5,
        sessionId: 'session-a',
        username: 'erin@example.com'
      });
    });

    await waitFor(() => {
      expect(latest.contactPresence['erin@example.com']?.status).toBe('online');
    });

    act(() => {
      erinPresenceNode.__emit({
        status: 'offline',
        lastSeen: 0,
        heartbeatAt: 2000,
        heartbeatSeq: 4,
        sessionId: 'session-a',
        username: 'erin@example.com'
      });
    });

    await waitFor(() => {
      expect(latest.contactPresence['erin@example.com']?.status).toBe('online');
      expect(onContactOnline).toHaveBeenCalledTimes(0);
    });
  });

  test('cleanupPresenceListeners is idempotent', async () => {
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
        { username: 'clean@example.com', status: 'accepted', blocked: false, canMessage: true, inList: true, visibility: 'full' },
        'clean@example.com'
      );
    });
    await waitFor(() => {
      expect(latest.hasPresenceListener('clean@example.com')).toBe(true);
    });

    act(() => {
      latest.cleanupPresenceListeners();
      latest.cleanupPresenceListeners();
    });

    expect(latest.hasPresenceListener('clean@example.com')).toBe(false);
  });
});
