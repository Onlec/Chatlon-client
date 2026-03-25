import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MyspaceView from './MyspaceView';

jest.mock('../../../gun', () => ({
  gun: {
    get: jest.fn(() => undefined)
  }
}));

function cloneComments(commentStore = {}) {
  return Object.entries(commentStore).reduce((next, [username, comments]) => {
    next[username] = { ...comments };
    return next;
  }, {});
}

function createGunApiMock(initialState = {}) {
  const store = {
    profiles: { ...(initialState.profiles || {}) },
    topFriends: { ...(initialState.topFriends || {}) },
    comments: cloneComments(initialState.comments || {})
  };

  const profileListeners = new Map();
  const topFriendListeners = new Map();
  const commentListeners = new Map();
  const profileNodes = new Map();
  const topFriendNodes = new Map();
  const commentNodes = new Map();

  function getListeners(map, key) {
    if (!map.has(key)) {
      map.set(key, []);
    }
    return map.get(key);
  }

  function emitProfile(username) {
    getListeners(profileListeners, username).forEach((listener) => {
      listener(store.profiles[username]);
    });
  }

  function emitTopFriends(username) {
    getListeners(topFriendListeners, username).forEach((listener) => {
      listener(store.topFriends[username]);
    });
  }

  function emitComment(username, commentId, comment) {
    getListeners(commentListeners, username).forEach((listener) => {
      listener(comment, commentId);
    });
  }

  function getProfileNode(username) {
    if (!profileNodes.has(username)) {
      const putField = (field, value) => {
        store.profiles[username] = {
          ...(store.profiles[username] || {}),
          [field]: value
        };
        emitProfile(username);
      };

      const visitorsNode = {
        put: jest.fn((value) => putField('visitors', value))
      };

      profileNodes.set(username, {
        on: jest.fn((callback) => {
          getListeners(profileListeners, username).push(callback);
          callback(store.profiles[username]);
        }),
        off: jest.fn(),
        once: jest.fn((callback) => {
          callback(store.profiles[username]);
        }),
        put: jest.fn((payload) => {
          store.profiles[username] = {
            ...(store.profiles[username] || {}),
            ...payload
          };
          emitProfile(username);
        }),
        get: jest.fn((field) => {
          if (field === 'visitors') {
            return visitorsNode;
          }

          return {
            put: jest.fn((value) => putField(field, value))
          };
        })
      });
    }

    return profileNodes.get(username);
  }

  function getTopFriendsNode(username) {
    if (!topFriendNodes.has(username)) {
      topFriendNodes.set(username, {
        on: jest.fn((callback) => {
          getListeners(topFriendListeners, username).push(callback);
          callback(store.topFriends[username]);
        }),
        off: jest.fn(),
        put: jest.fn((payload) => {
          store.topFriends[username] = {
            ...(store.topFriends[username] || {}),
            ...payload
          };
          emitTopFriends(username);
        })
      });
    }

    return topFriendNodes.get(username);
  }

  function getCommentNode(username) {
    if (!commentNodes.has(username)) {
      const mapNode = {
        on: jest.fn((callback) => {
          getListeners(commentListeners, username).push(callback);
          Object.entries(store.comments[username] || {}).forEach(([commentId, comment]) => {
            callback(comment, commentId);
          });
        }),
        off: jest.fn()
      };

      commentNodes.set(username, {
        get: jest.fn((commentId) => ({
          put: jest.fn((payload) => {
            store.comments[username] = {
              ...(store.comments[username] || {}),
              [commentId]: payload
            };
            emitComment(username, commentId, payload);
          })
        })),
        map: jest.fn(() => mapNode),
        off: jest.fn()
      });
    }

    return commentNodes.get(username);
  }

  const profilesRoot = {
    get: jest.fn((username) => getProfileNode(username))
  };
  const topFriendsRoot = {
    get: jest.fn((username) => getTopFriendsNode(username))
  };
  const commentsRoot = {
    get: jest.fn((username) => getCommentNode(username))
  };

  return {
    gunApi: {
      get: jest.fn((key) => {
        if (key === 'MYSPACE_PROFILES') return profilesRoot;
        if (key === 'MYSPACE_TOPFRIENDS') return topFriendsRoot;
        if (key === 'MYSPACE_COMMENTS') return commentsRoot;
        return undefined;
      })
    },
    getProfileNode,
    getTopFriendsNode,
    getCommentsForUser(username) {
      return store.comments[username] || {};
    }
  };
}

describe('MyspaceView', () => {
  test('loads the current user profile, top friends and comments', async () => {
    const api = createGunApiMock({
      profiles: {
        alice: {
          aboutMe: 'Welkom op mijn profiel.',
          mood: 'chronically online',
          bgPattern: 'hearts',
          visitors: 12
        }
      },
      topFriends: {
        alice: {
          slot1: 'bob'
        }
      },
      comments: {
        alice: {
          '1': {
            van: 'bob',
            tekst: 'Nooit offline he?',
            timestamp: 1
          }
        }
      }
    });

    render(<MyspaceView currentUser="alice" gunApi={api.gunApi} />);

    expect(await screen.findByRole('heading', { name: 'alice' })).toBeInTheDocument();
    expect(screen.getByText('Welkom op mijn profiel.')).toBeInTheDocument();
    expect(screen.getByText(/chronically online/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bob/i })).toBeInTheDocument();
    expect(screen.getByText('Nooit offline he?')).toBeInTheDocument();
  });

  test('saves profile edits and top friends back to Gun', async () => {
    const api = createGunApiMock({
      profiles: {
        alice: {
          aboutMe: 'oud profiel',
          mood: 'slaperig',
          bgColor: '#112233',
          bgPattern: 'stars',
          textColor: '#ffffff',
          visitors: 4
        }
      }
    });

    render(<MyspaceView currentUser="alice" gunApi={api.gunApi} />);

    fireEvent.click(screen.getByRole('button', { name: 'Bewerk profiel' }));

    fireEvent.change(screen.getByLabelText('About me'), {
      target: { value: 'Nieuwe bio op mijn supercoole profiel.' }
    });
    fireEvent.change(screen.getByLabelText('Mood'), {
      target: { value: 'retro chaos' }
    });
    fireEvent.change(screen.getByLabelText('Song title'), {
      target: { value: 'The Dial-Up Anthem' }
    });
    fireEvent.change(screen.getByLabelText('Slot 1'), {
      target: { value: 'bob' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Profiel opslaan' }));

    await waitFor(() => {
      expect(api.getProfileNode('alice').put).toHaveBeenCalledWith(expect.objectContaining({
        aboutMe: 'Nieuwe bio op mijn supercoole profiel.',
        mood: 'retro chaos',
        songTitle: 'The Dial-Up Anthem',
        visitors: 4,
        lastUpdated: expect.any(Number)
      }));
    });

    expect(api.getTopFriendsNode('alice').put).toHaveBeenCalledWith(expect.objectContaining({
      slot1: 'bob'
    }));
  });

  test('navigates to a top friend profile inside the same page', async () => {
    const api = createGunApiMock({
      profiles: {
        alice: {
          aboutMe: 'Alice hier'
        },
        bob: {
          aboutMe: 'Bob was here',
          mood: 'nostalgic'
        }
      },
      topFriends: {
        alice: {
          slot1: 'bob'
        }
      }
    });

    render(<MyspaceView currentUser="alice" gunApi={api.gunApi} />);

    fireEvent.click(await screen.findByRole('button', { name: /bob/i }));

    expect(await screen.findByRole('heading', { name: 'bob' })).toBeInTheDocument();
    expect(screen.getByText('Bob was here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mijn profiel' })).toBeInTheDocument();
  });

  test('posts comments to the viewed profile and updates the list', async () => {
    const api = createGunApiMock({
      profiles: {
        bob: {
          aboutMe: 'Welkom op Bob zijn profiel.'
        }
      }
    });

    render(<MyspaceView currentUser="alice" gunApi={api.gunApi} />);

    fireEvent.change(screen.getByLabelText('Profiel bekijken'), {
      target: { value: 'bob' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ga' }));

    expect(await screen.findByRole('heading', { name: 'bob' })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Laat een bericht achter voor bob'), {
      target: { value: 'Groetjes uit de comments!' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Plaats comment' }));

    expect(await screen.findByText('Groetjes uit de comments!')).toBeInTheDocument();
    expect(Object.values(api.getCommentsForUser('bob'))).toEqual(expect.arrayContaining([
      expect.objectContaining({
        van: 'alice',
        tekst: 'Groetjes uit de comments!'
      })
    ]));
  });
});
