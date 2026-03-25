import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ChabloMotelView from './ChabloMotelView';

jest.mock('../../../gun', () => ({
  gun: {
    get: jest.fn(() => undefined)
  }
}));

jest.mock('./chablo/ChabloPhaserStage', () => function MockChabloPhaserStage(props) {
  return (
    <div data-testid="mock-chablo-phaser-stage">
      <button
        type="button"
        aria-label="Stage tegel 5 7"
        onClick={() => props.onTileActivate?.({ x: 5, y: 7 })}
      >
        Stage tegel 5 7
      </button>
      <button
        type="button"
        aria-label="Stage deur naar bar"
        onClick={() => props.onTileActivate?.({ x: 17, y: 7 })}
      >
        Stage deur naar bar
      </button>
      {props.otherOccupants.map((occupant) => (
        <button
          key={occupant.username}
          type="button"
          aria-label={`Avatar van ${occupant.username}`}
          onClick={() => props.onSelectAvatar(occupant.username)}
        >
          Avatar van {occupant.username}
        </button>
      ))}
      <span>{props.currentRoomMeta.name}</span>
    </div>
  );
});

function cloneNestedMap(value = {}) {
  return Object.entries(value).reduce((next, [key, nestedValue]) => {
    next[key] = typeof nestedValue === 'object' && nestedValue !== null
      ? { ...nestedValue }
      : nestedValue;
    return next;
  }, {});
}

function createGunApiMock(initialState = {}) {
  const store = {
    positions: { ...(initialState.positions || {}) },
    friends: Object.entries(initialState.friends || {}).reduce((next, [username, friendMap]) => {
      next[username] = cloneNestedMap(friendMap);
      return next;
    }, {}),
    roomChat: Object.entries(initialState.roomChat || {}).reduce((next, [roomId, chatMap]) => {
      next[roomId] = cloneNestedMap(chatMap);
      return next;
    }, {})
  };

  const positionListeners = [];
  const friendListeners = new Map();
  const roomChatListeners = new Map();
  const positionNodes = new Map();
  const friendUserNodes = new Map();
  const roomChatNodes = new Map();

  function emitPosition(username) {
    const payload = store.positions[username];
    positionListeners.forEach((listener) => listener(payload, username));
  }

  function emitFriend(username, friendUsername) {
    const payload = store.friends[username]?.[friendUsername];
    const listeners = friendListeners.get(username) || [];
    listeners.forEach((listener) => listener(payload, friendUsername));
  }

  function emitRoomMessage(roomId, messageId) {
    const payload = store.roomChat[roomId]?.[messageId];
    const listeners = roomChatListeners.get(roomId) || [];
    listeners.forEach((listener) => listener(payload, messageId));
  }

  function getPositionNode(username) {
    if (!positionNodes.has(username)) {
      positionNodes.set(username, {
        put: jest.fn((payload) => {
          store.positions[username] = payload;
          emitPosition(username);
        })
      });
    }
    return positionNodes.get(username);
  }

  function getFriendUserNode(username) {
    if (!friendUserNodes.has(username)) {
      const friendNodes = new Map();
      friendUserNodes.set(username, {
        get: jest.fn((friendUsername) => {
          if (!friendNodes.has(friendUsername)) {
            friendNodes.set(friendUsername, {
              put: jest.fn((payload) => {
                if (!store.friends[username]) {
                  store.friends[username] = {};
                }

                if (payload === null) {
                  delete store.friends[username][friendUsername];
                } else {
                  store.friends[username][friendUsername] = payload;
                }

                emitFriend(username, friendUsername);
              })
            });
          }

          return friendNodes.get(friendUsername);
        }),
        map: jest.fn(() => ({
          on: jest.fn((callback) => {
            if (!friendListeners.has(username)) {
              friendListeners.set(username, []);
            }
            friendListeners.get(username).push(callback);
            Object.entries(store.friends[username] || {}).forEach(([friendUsername, payload]) => {
              callback(payload, friendUsername);
            });
          }),
          off: jest.fn()
        })),
        off: jest.fn()
      });
    }

    return friendUserNodes.get(username);
  }

  function getRoomChatNode(roomId) {
    if (!roomChatNodes.has(roomId)) {
      roomChatNodes.set(roomId, {
        get: jest.fn((messageId) => ({
          put: jest.fn((payload) => {
            if (!store.roomChat[roomId]) {
              store.roomChat[roomId] = {};
            }
            store.roomChat[roomId][messageId] = payload;
            emitRoomMessage(roomId, messageId);
          })
        })),
        map: jest.fn(() => ({
          on: jest.fn((callback) => {
            if (!roomChatListeners.has(roomId)) {
              roomChatListeners.set(roomId, []);
            }
            roomChatListeners.get(roomId).push(callback);
            Object.entries(store.roomChat[roomId] || {}).forEach(([messageId, payload]) => {
              callback(payload, messageId);
            });
          }),
          off: jest.fn()
        })),
        off: jest.fn()
      });
    }

    return roomChatNodes.get(roomId);
  }

  const positionsRoot = {
    get: jest.fn((username) => getPositionNode(username)),
    map: jest.fn(() => ({
      on: jest.fn((callback) => {
        positionListeners.push(callback);
        Object.entries(store.positions).forEach(([username, payload]) => {
          callback(payload, username);
        });
      }),
      off: jest.fn()
    })),
    off: jest.fn()
  };

  const friendsRoot = {
    get: jest.fn((username) => getFriendUserNode(username))
  };

  const roomChatRoot = {
    get: jest.fn((roomId) => getRoomChatNode(roomId))
  };

  return {
    gunApi: {
      get: jest.fn((key) => {
        if (key === 'CHABLO_POSITION') return positionsRoot;
        if (key === 'CHABLO_FRIENDS') return friendsRoot;
        if (key === 'CHABLO_ROOM_CHAT') return roomChatRoot;
        return undefined;
      })
    },
    getPositionNode,
    getFriendUserNode,
    getRoomChatNode
  };
}

describe('ChabloMotelView', () => {
  test('renders room occupants and opens a conversation from an avatar card', async () => {
    const now = Date.now();
    const api = createGunApiMock({
      positions: {
        alice: { room: 'receptie', x: 9, y: 7, lastSeen: now },
        bob: { room: 'receptie', x: 13, y: 5, lastSeen: now },
        cara: { room: 'bar', x: 3, y: 3, lastSeen: now }
      }
    });
    const openConversation = jest.fn();

    render(<ChabloMotelView currentUser="alice" onOpenConversation={openConversation} gunApi={api.gunApi} />);

    expect(await screen.findByRole('button', { name: 'Avatar van bob' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Avatar van cara' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Avatar van bob' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stuur bericht' }));

    expect(openConversation).toHaveBeenCalledWith('bob');
  });

  test('sends and accepts Chablo friend requests through Gun', async () => {
    const now = Date.now();
    const api = createGunApiMock({
      positions: {
        alice: { room: 'receptie', x: 9, y: 7, lastSeen: now },
        bob: { room: 'receptie', x: 13, y: 5, lastSeen: now }
      },
      friends: {
        alice: {
          dave: { status: 'pending', initiator: 'dave', metIn: 'bar', since: now }
        }
      }
    });

    render(<ChabloMotelView currentUser="alice" gunApi={api.gunApi} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Avatar van bob' }));
    fireEvent.click(screen.getByRole('button', { name: 'Voeg toe als Chablo-vriend' }));

    expect(api.getFriendUserNode('alice').get('bob').put).toHaveBeenCalledWith(expect.objectContaining({
      status: 'pending',
      initiator: 'alice',
      metIn: 'receptie'
    }));
    expect(api.getFriendUserNode('bob').get('alice').put).toHaveBeenCalledWith(expect.objectContaining({
      status: 'pending',
      initiator: 'alice',
      metIn: 'receptie'
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Accepteer' }));

    await waitFor(() => {
      expect(api.getFriendUserNode('alice').get('dave').put).toHaveBeenCalledWith(expect.objectContaining({
        status: 'accepted'
      }));
    });
    expect(api.getFriendUserNode('dave').get('alice').put).toHaveBeenCalledWith(expect.objectContaining({
      status: 'accepted'
    }));
  });

  test('switches rooms and posts room chat messages locally', async () => {
    const now = Date.now();
    const api = createGunApiMock({
      positions: {
        alice: { room: 'receptie', x: 9, y: 7, lastSeen: now },
        bob: { room: 'bar', x: 5, y: 5, lastSeen: now }
      },
      friends: {
        alice: {
          bob: { status: 'accepted', initiator: 'alice', metIn: 'bar', since: now }
        }
      }
    });

    render(<ChabloMotelView currentUser="alice" gunApi={api.gunApi} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ga naar kamer' }));
    expect(await screen.findByRole('heading', { name: 'De Bar' })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Zeg iets in De Bar'), {
      target: { value: 'Iedereen hier lijkt AFK.' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verzend naar kamer' }));

    expect(await screen.findByText('Iedereen hier lijkt AFK.')).toBeInTheDocument();

    const roomChatNode = api.getRoomChatNode('bar');
    const putCalls = roomChatNode.get.mock.results.map((result) => result.value.put.mock.calls).flat();
    expect(putCalls).toEqual(expect.arrayContaining([
      [expect.objectContaining({
        van: 'alice',
        tekst: 'Iedereen hier lijkt AFK.'
      })]
    ]));
  });

  test('uses door movement and stage callbacks to change room and sync position', async () => {
    jest.useFakeTimers();
    try {
      const now = Date.now();
      const api = createGunApiMock({
        positions: {
          alice: { room: 'receptie', x: 9, y: 7, lastSeen: now }
        }
      });

      render(<ChabloMotelView currentUser="alice" gunApi={api.gunApi} />);

      fireEvent.pointerDown(screen.getByRole('button', { name: 'Rechts' }));
      expect(screen.getByText('10, 7')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(179);
      });
      expect(screen.getByText('10, 7')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(screen.getByText('11, 7')).toBeInTheDocument();

      fireEvent.pointerUp(screen.getByRole('button', { name: 'Rechts' }));

      act(() => {
        jest.advanceTimersByTime(400);
      });
      expect(screen.getByText('11, 7')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Stage deur naar bar' }));

      act(() => {
        jest.advanceTimersByTime(950);
      });

      expect(await screen.findByRole('heading', { name: 'De Bar' })).toBeInTheDocument();
      expect(screen.getByText('3, 7')).toBeInTheDocument();

      await waitFor(() => {
        expect(api.getPositionNode('alice').put).toHaveBeenCalledWith(expect.objectContaining({
          room: 'bar',
          x: 3,
          y: 7
        }));
      });

      fireEvent.click(screen.getByRole('button', { name: 'Stage tegel 5 7' }));

      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(api.getPositionNode('alice').put).toHaveBeenCalledWith(expect.objectContaining({
          room: 'bar',
          x: 5,
          y: 7
        }));
      });
      expect(screen.getByText('5, 7')).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});
