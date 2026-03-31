import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { useMailInbox } from './useMailInbox';

jest.mock('../../gun', () => {
  const nodeStore = new Map();

  function createNode(path) {
    const mapListeners = [];

    return {
      path,
      get: jest.fn((child) => getNode(`${path}/${child}`)),
      map: jest.fn(() => ({
        on: jest.fn((callback) => {
          mapListeners.push(callback);
        }),
        off: jest.fn(() => {
          mapListeners.length = 0;
        })
      })),
      put: jest.fn(),
      off: jest.fn(() => {
        mapListeners.length = 0;
      }),
      __emitMap(value, key) {
        mapListeners.slice().forEach((callback) => callback(value, key));
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

const { gun, user, __mockGetNode: getNode, __mockNodeStore: nodeStore } = require('../../gun');

let latestA = null;
let latestB = null;

function Harness({ slot, currentUser }) {
  const value = useMailInbox(currentUser);
  if (slot === 'a') latestA = value;
  if (slot === 'b') latestB = value;
  return null;
}

describe('useMailInbox', () => {
  beforeEach(() => {
    localStorage.clear();
    nodeStore.clear();
    gun.get.mockImplementation((key) => getNode(key));
    user.get.mockImplementation((key) => getNode(`user/${key}`));
    latestA = null;
    latestB = null;
  });

  test('routes inbox and sent delete or restore mutations to the correct store', async () => {
    render(<Harness slot="a" currentUser="alice@example.com" />);

    const inboxNode = getNode('MAIL_INBOX/alice@example.com');
    const sentNode = getNode('user/mailSent');

    act(() => {
      inboxNode.__emitMap({
        from: 'bob@example.com',
        to: 'alice@example.com',
        subject: 'Inbox mail',
        body: 'Hello',
        timestamp: 100,
        read: false
      }, 'inbox-1');
      sentNode.__emitMap({
        from: 'alice@example.com',
        to: 'bob@example.com',
        subject: 'Sent mail',
        body: 'Hi',
        timestamp: 200,
        deleted: false
      }, 'sent-1');
    });

    await waitFor(() => {
      expect(latestA.inbox).toHaveLength(1);
      expect(latestA.sent).toHaveLength(1);
    });

    act(() => {
      latestA.markDeleted(latestA.sent[0]);
    });

    expect(getNode('user/mailSent/sent-1/deleted').put).toHaveBeenCalledWith(true);
    expect(latestA.sent).toHaveLength(0);
    expect(latestA.trash.map((mail) => mail.id)).toContain('sent-1');

    act(() => {
      latestA.restoreFromTrash(latestA.trash.find((mail) => mail.id === 'sent-1'));
      latestA.markDeleted(latestA.inbox[0]);
    });

    expect(getNode('user/mailSent/sent-1/deleted').put).toHaveBeenCalledWith(false);
    expect(getNode('MAIL_INBOX/alice@example.com/inbox-1/deleted').put).toHaveBeenCalledWith(true);
    expect(latestA.sent).toHaveLength(1);
    expect(latestA.trash.map((mail) => mail.id)).toContain('inbox-1');

    act(() => {
      latestA.markDeleted(latestA.sent[0]);
    });

    await waitFor(() => {
      expect(latestA.trash.map((mail) => mail.id)).toContain('sent-1');
    });

    act(() => {
      latestA.permanentDelete(latestA.trash.find((mail) => mail.id === 'sent-1'));
    });

    expect(getNode('user/mailSent/sent-1').put).toHaveBeenCalledWith(null);
    expect(latestA.sent.map((mail) => mail.id)).not.toContain('sent-1');
    expect(latestA.trash.map((mail) => mail.id)).not.toContain('sent-1');
  });

  test('builds trash from both deleted inbox and deleted sent messages', async () => {
    render(<Harness slot="a" currentUser="alice@example.com" />);

    act(() => {
      getNode('MAIL_INBOX/alice@example.com').__emitMap({
        from: 'bob@example.com',
        to: 'alice@example.com',
        subject: 'Deleted inbox',
        body: 'Hello',
        timestamp: 100,
        deleted: true
      }, 'inbox-deleted');
      getNode('user/mailSent').__emitMap({
        from: 'alice@example.com',
        to: 'carol@example.com',
        subject: 'Deleted sent',
        body: 'Hello',
        timestamp: 101,
        deleted: true
      }, 'sent-deleted');
    });

    await waitFor(() => {
      expect(latestA.trash).toHaveLength(2);
    });

    expect(latestA.trash).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'inbox-deleted', mailbox: 'inbox' }),
      expect.objectContaining({ id: 'sent-deleted', mailbox: 'sent' }),
    ]));
  });

  test('supports read and unread toggles for single inbox messages and the whole inbox', async () => {
    render(<Harness slot="a" currentUser="alice@example.com" />);

    act(() => {
      getNode('MAIL_INBOX/alice@example.com').__emitMap({
        from: 'bob@example.com',
        to: 'alice@example.com',
        subject: 'Unread mail',
        body: 'Hello',
        timestamp: 100,
        read: false
      }, 'inbox-1');
      getNode('MAIL_INBOX/alice@example.com').__emitMap({
        from: 'carol@example.com',
        to: 'alice@example.com',
        subject: 'Read mail',
        body: 'Hi',
        timestamp: 101,
        read: true
      }, 'inbox-2');
    });

    await waitFor(() => {
      expect(latestA.unreadCount).toBe(1);
    });

    act(() => {
      latestA.markUnread(latestA.inbox.find((mail) => mail.id === 'inbox-2'));
    });

    expect(getNode('MAIL_INBOX/alice@example.com/inbox-2/read').put).toHaveBeenCalledWith(false);
    expect(latestA.unreadCount).toBe(2);

    act(() => {
      latestA.markRead(latestA.inbox.find((mail) => mail.id === 'inbox-1'));
    });

    expect(getNode('MAIL_INBOX/alice@example.com/inbox-1/read').put).toHaveBeenCalledWith(true);
    expect(latestA.unreadCount).toBe(1);

    act(() => {
      latestA.markAllRead();
    });

    expect(getNode('MAIL_INBOX/alice@example.com/inbox-2/read').put).toHaveBeenLastCalledWith(true);
    expect(latestA.unreadCount).toBe(0);

    act(() => {
      latestA.markAllUnread();
    });

    expect(getNode('MAIL_INBOX/alice@example.com/inbox-1/read').put).toHaveBeenLastCalledWith(false);
    expect(getNode('MAIL_INBOX/alice@example.com/inbox-2/read').put).toHaveBeenLastCalledWith(false);
    expect(latestA.unreadCount).toBe(2);
  });

  test('synchronizes last-seen state immediately between hook instances in the same tab', async () => {
    render(
      <>
        <Harness slot="a" currentUser="alice@example.com" />
        <Harness slot="b" currentUser="alice@example.com" />
      </>
    );

    act(() => {
      getNode('MAIL_INBOX/alice@example.com').__emitMap({
        from: 'bob@example.com',
        to: 'alice@example.com',
        subject: 'Unread',
        body: 'Hello',
        timestamp: 100,
        read: false
      }, 'inbox-1');
    });

    await waitFor(() => {
      expect(latestA.newMailSinceLastSeen).toHaveLength(1);
      expect(latestB.newMailSinceLastSeen).toHaveLength(1);
    });

    act(() => {
      latestA.markAllSeen(500);
    });

    await waitFor(() => {
      expect(latestA.newMailSinceLastSeen).toHaveLength(0);
      expect(latestB.newMailSinceLastSeen).toHaveLength(0);
    });

    expect(localStorage.getItem('chatlon_mail_last_seen_alice@example.com')).toBe('500');
  });
});
