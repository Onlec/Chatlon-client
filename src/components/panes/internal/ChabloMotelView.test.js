import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ChabloMotelView from './ChabloMotelView';

let mockStageEngineState = 'ready';

jest.mock('../../../gun', () => ({
  gun: {
    get: jest.fn(() => undefined)
  }
}));

jest.mock('./chablo/ChabloPhaserStage', () => {
  const React = require('react');

  return function MockChabloPhaserStage(props) {
    React.useEffect(() => {
      props.onEngineStateChange?.(mockStageEngineState);
    }, [props.onEngineStateChange]);

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
        <button
          type="button"
          aria-label="Stage hotspot"
          onClick={() => props.onHotspotActivate?.(props.currentRoomMeta.hotspots?.[0] || null)}
        >
          Stage hotspot
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
  };
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
    }, {}),
    hotspotPresence: Object.entries(initialState.hotspotPresence || {}).reduce((next, [roomId, presenceMap]) => {
      next[roomId] = cloneNestedMap(presenceMap);
      return next;
    }, {}),
    roomActivity: Object.entries(initialState.roomActivity || {}).reduce((next, [roomId, activityMap]) => {
      next[roomId] = cloneNestedMap(activityMap);
      return next;
    }, {}),
    roomState: Object.entries(initialState.roomState || {}).reduce((next, [roomId, roomStateMap]) => {
      next[roomId] = cloneNestedMap(roomStateMap);
      return next;
    }, {})
  };

  const positionListeners = [];
  const friendListeners = new Map();
  const roomChatListeners = new Map();
  const hotspotPresenceListeners = new Map();
  const roomActivityListeners = new Map();
  const roomStateListeners = new Map();
  const positionNodes = new Map();
  const friendUserNodes = new Map();
  const roomChatNodes = new Map();
  const hotspotPresenceNodes = new Map();
  const roomActivityNodes = new Map();
  const roomStateNodes = new Map();

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

  function emitHotspotPresence(roomId, username) {
    const payload = store.hotspotPresence[roomId]?.[username];
    const listeners = hotspotPresenceListeners.get(roomId) || [];
    listeners.forEach((listener) => listener(payload, username));
  }

  function emitRoomActivity(roomId, activityId) {
    const payload = store.roomActivity[roomId]?.[activityId];
    const listeners = roomActivityListeners.get(roomId) || [];
    listeners.forEach((listener) => listener(payload, activityId));
  }

  function emitRoomState(roomId, hotspotId) {
    const payload = store.roomState[roomId]?.[hotspotId];
    const listeners = roomStateListeners.get(roomId) || [];
    listeners.forEach((listener) => listener(payload, hotspotId));
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

  function getHotspotPresenceNode(roomId) {
    if (!hotspotPresenceNodes.has(roomId)) {
      hotspotPresenceNodes.set(roomId, {
        get: jest.fn((username) => ({
          put: jest.fn((payload) => {
            if (!store.hotspotPresence[roomId]) {
              store.hotspotPresence[roomId] = {};
            }

            if (payload === null) {
              delete store.hotspotPresence[roomId][username];
            } else {
              store.hotspotPresence[roomId][username] = payload;
            }

            emitHotspotPresence(roomId, username);
          })
        })),
        map: jest.fn(() => ({
          on: jest.fn((callback) => {
            if (!hotspotPresenceListeners.has(roomId)) {
              hotspotPresenceListeners.set(roomId, []);
            }
            hotspotPresenceListeners.get(roomId).push(callback);
            Object.entries(store.hotspotPresence[roomId] || {}).forEach(([username, payload]) => {
              callback(payload, username);
            });
          }),
          off: jest.fn()
        })),
        off: jest.fn()
      });
    }

    return hotspotPresenceNodes.get(roomId);
  }

  function getRoomActivityNode(roomId) {
    if (!roomActivityNodes.has(roomId)) {
      roomActivityNodes.set(roomId, {
        get: jest.fn((activityId) => ({
          put: jest.fn((payload) => {
            if (!store.roomActivity[roomId]) {
              store.roomActivity[roomId] = {};
            }

            if (payload === null) {
              delete store.roomActivity[roomId][activityId];
            } else {
              store.roomActivity[roomId][activityId] = payload;
            }

            emitRoomActivity(roomId, activityId);
          })
        })),
        map: jest.fn(() => ({
          on: jest.fn((callback) => {
            if (!roomActivityListeners.has(roomId)) {
              roomActivityListeners.set(roomId, []);
            }
            roomActivityListeners.get(roomId).push(callback);
            Object.entries(store.roomActivity[roomId] || {}).forEach(([activityId, payload]) => {
              callback(payload, activityId);
            });
          }),
          off: jest.fn()
        })),
        off: jest.fn()
      });
    }

    return roomActivityNodes.get(roomId);
  }

  function getRoomStateNode(roomId) {
    if (!roomStateNodes.has(roomId)) {
      roomStateNodes.set(roomId, {
        get: jest.fn((hotspotId) => ({
          put: jest.fn((payload) => {
            if (!store.roomState[roomId]) {
              store.roomState[roomId] = {};
            }

            if (payload === null) {
              delete store.roomState[roomId][hotspotId];
            } else {
              store.roomState[roomId][hotspotId] = payload;
            }

            emitRoomState(roomId, hotspotId);
          })
        })),
        map: jest.fn(() => ({
          on: jest.fn((callback) => {
            if (!roomStateListeners.has(roomId)) {
              roomStateListeners.set(roomId, []);
            }
            roomStateListeners.get(roomId).push(callback);
            Object.entries(store.roomState[roomId] || {}).forEach(([hotspotId, payload]) => {
              callback(payload, hotspotId);
            });
          }),
          off: jest.fn()
        })),
        off: jest.fn()
      });
    }

    return roomStateNodes.get(roomId);
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

  const hotspotPresenceRoot = {
    get: jest.fn((roomId) => getHotspotPresenceNode(roomId))
  };

  const roomActivityRoot = {
    get: jest.fn((roomId) => getRoomActivityNode(roomId))
  };

  const roomStateRoot = {
    get: jest.fn((roomId) => getRoomStateNode(roomId))
  };

  return {
    gunApi: {
      get: jest.fn((key) => {
        if (key === 'CHABLO_POSITION') return positionsRoot;
        if (key === 'CHABLO_FRIENDS') return friendsRoot;
        if (key === 'CHABLO_ROOM_CHAT') return roomChatRoot;
        if (key === 'CHABLO_HOTSPOT_PRESENCE') return hotspotPresenceRoot;
        if (key === 'CHABLO_ROOM_ACTIVITY') return roomActivityRoot;
        if (key === 'CHABLO_ROOM_STATE') return roomStateRoot;
        return undefined;
      })
    },
    getPositionNode,
    getFriendUserNode,
    getRoomChatNode,
    getHotspotPresenceNode,
    getRoomActivityNode,
    getRoomStateNode
  };
}

describe('ChabloMotelView', () => {
  beforeEach(() => {
    mockStageEngineState = 'ready';
  });

  test('shows a branded boot overlay while the Chablo stage is loading', () => {
    mockStageEngineState = 'loading';
    const now = Date.now();
    const api = createGunApiMock({
      positions: {
        alice: { room: 'receptie', x: 9, y: 7, lastSeen: now }
      }
    });

    render(<ChabloMotelView currentUser="alice" gunApi={api.gunApi} />);

    expect(screen.getByText('Hotel wordt klaargezet...')).toBeInTheDocument();
    expect(screen.getByText(/De lobbylampen warmen op, de neon springt aan/i)).toBeInTheDocument();
  });

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

    fireEvent.click(screen.getByRole('tab', { name: 'Sociaal' }));
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

    fireEvent.click(screen.getByRole('tab', { name: 'Sociaal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ga naar kamer' }));
    expect(await screen.findByRole('heading', { name: 'De Bar' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Chat' }));
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

  test('walks to a room hotspot and shows its interaction copy', async () => {
    jest.useFakeTimers();
    try {
      const now = Date.now();
      const api = createGunApiMock({
        positions: {
          alice: { room: 'receptie', x: 9, y: 7, lastSeen: now }
        }
      });

      render(<ChabloMotelView currentUser="alice" gunApi={api.gunApi} />);

      fireEvent.click(screen.getByRole('button', { name: 'Ga naar de lounge' }));

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(screen.getByText('15, 9')).toBeInTheDocument();
      expect(screen.getAllByText('Loungehoek').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/sofa om dramatisch te zitten wachten/i).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: 'Hang rond in de lounge' }).length).toBeGreaterThan(0);

      fireEvent.click(screen.getAllByRole('button', { name: 'Hang rond in de lounge' })[0]);

      expect(screen.getByText('Hotspot actie')).toBeInTheDocument();
      expect(screen.getByText('feedback')).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  test('uses a hotspot action to prefill room chat text', async () => {
    jest.useFakeTimers();
    try {
      const now = Date.now();
      const api = createGunApiMock({
        positions: {
          alice: { room: 'receptie', x: 9, y: 7, lastSeen: now }
        }
      });

      render(<ChabloMotelView currentUser="alice" gunApi={api.gunApi} />);

      fireEvent.click(screen.getByRole('button', { name: 'De Bar' }));
      expect(await screen.findByRole('heading', { name: 'De Bar' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Ga naar de bar' }));

      act(() => {
        jest.advanceTimersByTime(1600);
      });

      expect(screen.getByText('9, 9')).toBeInTheDocument();
      fireEvent.click(screen.getAllByRole('button', { name: 'Bestel iets aan de bar' })[0]);

      expect(screen.getByPlaceholderText('Zeg iets in De Bar')).toHaveValue('Nog iemand iets van de bar?');
      expect(screen.getByRole('tab', { name: 'Chat' })).toHaveAttribute('aria-selected', 'true');
    } finally {
      jest.useRealTimers();
    }
  });

  test('shows shared hotspot presence and room activity from Gun', async () => {
    const now = Date.now();
    const api = createGunApiMock({
      positions: {
        alice: { room: 'receptie', x: 9, y: 7, lastSeen: now },
        bob: { room: 'receptie', x: 10, y: 9, lastSeen: now },
        cara: { room: 'receptie', x: 9, y: 9, lastSeen: now }
      },
      hotspotPresence: {
        receptie: {
          bob: { hotspotId: 'Balie', hotspotLabel: 'Balie', lastSeen: now },
          cara: { hotspotId: 'Balie', hotspotLabel: 'Balie', lastSeen: now }
        }
      },
      roomActivity: {
        receptie: {
          '1': {
            by: 'bob',
            room: 'receptie',
            hotspotId: 'Balie',
            hotspotLabel: 'Balie',
            actionType: 'bulletin',
            summary: 'bob bekijkt balie.',
            timestamp: now
          }
        }
      },
      roomState: {
        receptie: {
          Balie: {
            hotspotLabel: 'Balie',
            title: 'Receptie live',
            text: 'bob checkt in bij de balie.',
            detail: 'Het motelbord is weer even het centrum van de lobby.',
            by: 'bob',
            kind: 'receptie',
            updatedAt: now
          }
        }
      }
    });

    render(<ChabloMotelView currentUser="alice" gunApi={api.gunApi} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Activiteit' }));
    expect(await screen.findByText('Live room activity')).toBeInTheDocument();
    expect(screen.getByText('Gedeelde room status')).toBeInTheDocument();
    expect(screen.getByText('bob bekijkt balie.')).toBeInTheDocument();
    expect(screen.getByText('Het motelbord is weer even het centrum van de lobby.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Hotspots' }));
    expect(screen.getAllByText('Nu hier: bob en cara').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Laatste: bob bekijkt balie.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Status: bob checkt in bij de balie.').length).toBeGreaterThan(0);
  });

  test('publishes hotspot presence and shared room activity when a hotspot is used', async () => {
    jest.useFakeTimers();
    try {
      const now = Date.now();
      const api = createGunApiMock({
        positions: {
          alice: { room: 'receptie', x: 9, y: 7, lastSeen: now }
        }
      });

      render(<ChabloMotelView currentUser="alice" gunApi={api.gunApi} />);

      fireEvent.click(screen.getByRole('button', { name: 'Ga naar de lounge' }));

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(api.getHotspotPresenceNode('receptie').get).toHaveBeenCalledWith('alice');
      });
      const hotspotPresencePuts = api.getHotspotPresenceNode('receptie').get.mock.results
        .map((result) => result.value.put.mock.calls)
        .flat();
      expect(hotspotPresencePuts).toEqual(expect.arrayContaining([
        [expect.objectContaining({
          hotspotId: 'Loungehoek',
          hotspotLabel: 'Loungehoek'
        })]
      ]));

      fireEvent.click(screen.getAllByRole('button', { name: 'Hang rond in de lounge' })[0]);

      await waitFor(() => {
        expect(api.getRoomActivityNode('receptie').get).toHaveBeenCalled();
      });
      const activityPuts = api.getRoomActivityNode('receptie').get.mock.results
        .map((result) => result.value.put.mock.calls)
        .flat();
      expect(activityPuts).toEqual(expect.arrayContaining([
        [expect.objectContaining({
          by: 'alice',
          hotspotId: 'Loungehoek',
          actionType: 'feedback',
          room: 'receptie'
        })]
      ]));

      await waitFor(() => {
        expect(api.getRoomStateNode('receptie').get).toHaveBeenCalledWith('Loungehoek');
      });
      const roomStatePuts = api.getRoomStateNode('receptie').get.mock.results
        .map((result) => result.value.put.mock.calls)
        .flat();
      expect(roomStatePuts).toEqual(expect.arrayContaining([
        [expect.objectContaining({
          hotspotLabel: 'Loungehoek',
          title: 'Loungehoek',
          text: 'alice activeert loungehoek.',
          kind: 'feedback'
        })]
      ]));
    } finally {
      jest.useRealTimers();
    }
  });
});
