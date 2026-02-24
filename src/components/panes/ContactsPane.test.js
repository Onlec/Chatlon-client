import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import ContactsPane from './ContactsPane';

jest.mock('../../contexts/AvatarContext', () => ({
  useAvatar: () => ({
    getAvatar: () => '/avatar.png',
    getDisplayName: (username) => username,
    setMyDisplayName: jest.fn()
  })
}));

jest.mock('../DropdownMenu', () => () => null);
jest.mock('../modals/OptionsDialog', () => () => null);
jest.mock('../modals/AddContactWizard', () => () => null);
jest.mock('../modals/FriendRequestDialog', () => () => null);
jest.mock('../modals/AvatarPickerModal', () => () => null);
jest.mock('../modals/ModalPane', () => ({ children }) => <div>{children}</div>);

jest.mock('../../gun', () => {
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
      put: jest.fn(),
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

const { gun, user, __mockGetNode: getNode, __mockNodeStore: nodeStore } = require('../../gun');

describe('ContactsPane presence consumption', () => {
  beforeEach(() => {
    nodeStore.clear();
    gun.get.mockImplementation((key) => getNode(key));
    user.get.mockImplementation((key) => getNode(`user/${key}`));
  });

  test('renders contact status from contactPresenceMap without attaching per-contact presence listeners', async () => {
    render(
      <ContactsPane
        onOpenConversation={jest.fn()}
        userStatus="online"
        onStatusChange={jest.fn()}
        onLogoff={jest.fn()}
        onSignOut={jest.fn()}
        onClosePane={jest.fn()}
        nowPlaying={null}
        currentUserEmail="alice@example.com"
        messengerSignedIn
        setMessengerSignedIn={jest.fn()}
        contactPresenceMap={{
          'bob@example.com': {
            status: 'online',
            lastSeen: Date.now(),
            personalMessage: 'Hallo daar'
          }
        }}
      />
    );

    act(() => {
      getNode('user/contacts').__emitMap(
        { username: 'bob@example.com', status: 'accepted', timestamp: Date.now() },
        'bob@example.com'
      );
    });

    await waitFor(() => {
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
      expect(screen.getByText(/\(Online\)/)).toBeInTheDocument();
      expect(screen.getByText(/Hallo daar/)).toBeInTheDocument();
    });

    // ContactsPane mag geen per-contact PRESENCE listener meer opzetten.
    const presenceGetCalls = gun.get.mock.calls
      .map((args) => args[0])
      .filter((path) => typeof path === 'string' && path.startsWith('PRESENCE'));
    expect(presenceGetCalls).toEqual([]);
  });
});
