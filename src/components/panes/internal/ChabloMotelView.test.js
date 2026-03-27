import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ChabloMotelView from './ChabloMotelView';
import {
  createDefaultChabloAvatarAppearance,
  createRandomChabloAvatarAppearance
} from './chablo/chabloAvatarAppearance';

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
        {(props.currentRoomMeta.hotspots || []).map((hotspot) => (
          <button
            key={`hotspot-${hotspot.id}`}
            type="button"
            aria-label={`Stage hotspot ${hotspot.label}`}
            onClick={() => props.onHotspotActivate?.(hotspot)}
          >
            Stage hotspot {hotspot.label}
          </button>
        ))}
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
        {Object.entries(props.activeEmotesByUsername || {}).map(([username, emote]) => (
          <span key={`emote-${username}`}>{`Emote ${username}: ${emote.label}`}</span>
        ))}
        {Object.entries(props.activeSpeechByUsername || {}).map(([username, speech]) => (
          <span key={`speech-${username}`}>{`Speech ${username}: ${speech.text}`}</span>
        ))}
        <span>{`Huidige vorm: ${props.appearanceByUsername?.[props.currentUser]?.bodyShape || 'none'}`}</span>
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
    }, {}),
    appearances: cloneNestedMap(initialState.appearances || {}),
    emotes: Object.entries(initialState.emotes || {}).reduce((next, [roomId, emoteMap]) => {
      next[roomId] = cloneNestedMap(emoteMap);
      return next;
    }, {}),
    speech: Object.entries(initialState.speech || {}).reduce((next, [roomId, speechMap]) => {
      next[roomId] = cloneNestedMap(speechMap);
      return next;
    }, {}),
    whispers: Object.entries(initialState.whispers || {}).reduce((next, [pairId, whisperMap]) => {
      next[pairId] = cloneNestedMap(whisperMap);
      return next;
    }, {}),
    invites: Object.entries(initialState.invites || {}).reduce((next, [username, inviteMap]) => {
      next[username] = cloneNestedMap(inviteMap);
      return next;
    }, {}),
    socialPrefs: cloneNestedMap(initialState.socialPrefs || {}),
    socialRelations: Object.entries(initialState.socialRelations || {}).reduce((next, [username, relationMap]) => {
      next[username] = cloneNestedMap(relationMap);
      return next;
    }, {}),
    lastRead: cloneNestedMap(initialState.lastRead || {}),
    whisperTyping: Object.entries(initialState.whisperTyping || {}).reduce((next, [pairId, typingMap]) => {
      next[pairId] = cloneNestedMap(typingMap);
      return next;
    }, {})
  };

  const positionListeners = [];
  const friendListeners = new Map();
  const roomChatListeners = new Map();
  const hotspotPresenceListeners = new Map();
  const roomActivityListeners = new Map();
  const roomStateListeners = new Map();
  const appearanceListeners = new Map();
  const emoteListeners = new Map();
  const speechListeners = new Map();
  const whisperListeners = new Map();
  const inviteListeners = new Map();
  const socialPrefListeners = new Map();
  const socialRelationListeners = new Map();
  const lastReadListeners = new Map();
  const whisperTypingListeners = new Map();
  const positionNodes = new Map();
  const friendUserNodes = new Map();
  const roomChatNodes = new Map();
  const hotspotPresenceNodes = new Map();
  const roomActivityNodes = new Map();
  const roomStateNodes = new Map();
  const appearanceNodes = new Map();
  const emoteNodes = new Map();
  const speechNodes = new Map();
  const whisperNodes = new Map();
  const inviteNodes = new Map();
  const socialPrefNodes = new Map();
  const socialRelationUserNodes = new Map();
  const lastReadNodes = new Map();
  const whisperTypingNodes = new Map();

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

  function emitAppearance(username) {
    const payload = store.appearances[username];
    const listeners = appearanceListeners.get(username) || [];
    listeners.forEach((listener) => listener(payload));
  }

  function emitEmote(roomId, username) {
    const payload = store.emotes[roomId]?.[username];
    const listeners = emoteListeners.get(roomId) || [];
    listeners.forEach((listener) => listener(payload, username));
  }

  function emitSpeech(roomId, username) {
    const payload = store.speech[roomId]?.[username];
    const listeners = speechListeners.get(roomId) || [];
    listeners.forEach((listener) => listener(payload, username));
  }

  function emitWhisper(pairId, messageId) {
    const payload = store.whispers[pairId]?.[messageId];
    const listeners = whisperListeners.get(pairId) || [];
    listeners.forEach((listener) => listener(payload, messageId));
  }

  function emitInvite(username, inviteId) {
    const payload = store.invites[username]?.[inviteId];
    const listeners = inviteListeners.get(username) || [];
    listeners.forEach((listener) => listener(payload, inviteId));
  }

  function emitSocialPref(username) {
    const payload = store.socialPrefs[username];
    const listeners = socialPrefListeners.get(username) || [];
    listeners.forEach((listener) => listener(payload));
  }

  function emitSocialRelation(username, otherUsername) {
    const payload = store.socialRelations[username]?.[otherUsername];
    const mapListeners = socialRelationListeners.get(username)?.map || [];
    const recordListeners = socialRelationListeners.get(username)?.record?.get(otherUsername) || [];
    mapListeners.forEach((listener) => listener(payload, otherUsername));
    recordListeners.forEach((listener) => listener(payload));
  }

  function emitLastRead(username) {
    const payload = store.lastRead[username];
    const listeners = lastReadListeners.get(username) || [];
    listeners.forEach((listener) => listener(payload));
  }

  function emitWhisperTyping(pairId, username) {
    const payload = store.whisperTyping[pairId]?.[username];
    const listeners = whisperTypingListeners.get(pairId) || [];
    listeners.forEach((listener) => listener(payload, username));
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

  function getAppearanceNode(username) {
    if (!appearanceNodes.has(username)) {
      appearanceNodes.set(username, {
        put: jest.fn((payload) => {
          if (payload === null) {
            delete store.appearances[username];
          } else {
            store.appearances[username] = payload;
          }
          emitAppearance(username);
        }),
        on: jest.fn((callback) => {
          if (!appearanceListeners.has(username)) {
            appearanceListeners.set(username, []);
          }
          appearanceListeners.get(username).push(callback);
          callback(store.appearances[username]);
        }),
        off: jest.fn()
      });
    }

    return appearanceNodes.get(username);
  }

  function getEmoteNode(roomId) {
    if (!emoteNodes.has(roomId)) {
      const emoteRecordNodes = new Map();
      emoteNodes.set(roomId, {
        get: jest.fn((username) => {
          if (!emoteRecordNodes.has(username)) {
            emoteRecordNodes.set(username, {
              put: jest.fn((payload) => {
                if (!store.emotes[roomId]) {
                  store.emotes[roomId] = {};
                }

                if (payload === null) {
                  delete store.emotes[roomId][username];
                } else {
                  store.emotes[roomId][username] = payload;
                }

                emitEmote(roomId, username);
              })
            });
          }

          return emoteRecordNodes.get(username);
        }),
        map: jest.fn(() => ({
          on: jest.fn((callback) => {
            if (!emoteListeners.has(roomId)) {
              emoteListeners.set(roomId, []);
            }
            emoteListeners.get(roomId).push(callback);
            Object.entries(store.emotes[roomId] || {}).forEach(([username, payload]) => {
              callback(payload, username);
            });
          }),
          off: jest.fn()
        })),
        off: jest.fn()
      });
    }

    return emoteNodes.get(roomId);
  }

  function getSpeechNode(roomId) {
    if (!speechNodes.has(roomId)) {
      const speechRecordNodes = new Map();
      speechNodes.set(roomId, {
        get: jest.fn((username) => {
          if (!speechRecordNodes.has(username)) {
            speechRecordNodes.set(username, {
              put: jest.fn((payload) => {
                if (!store.speech[roomId]) {
                  store.speech[roomId] = {};
                }

                if (payload === null) {
                  delete store.speech[roomId][username];
                } else {
                  store.speech[roomId][username] = payload;
                }

                emitSpeech(roomId, username);
              })
            });
          }

          return speechRecordNodes.get(username);
        }),
        map: jest.fn(() => ({
          on: jest.fn((callback) => {
            if (!speechListeners.has(roomId)) {
              speechListeners.set(roomId, []);
            }
            speechListeners.get(roomId).push(callback);
            Object.entries(store.speech[roomId] || {}).forEach(([username, payload]) => {
              callback(payload, username);
            });
          }),
          off: jest.fn()
        })),
        off: jest.fn()
      });
    }

    return speechNodes.get(roomId);
  }

  function getWhisperNode(pairId) {
    if (!whisperNodes.has(pairId)) {
      whisperNodes.set(pairId, {
        get: jest.fn((messageId) => ({
          put: jest.fn((payload) => {
            if (!store.whispers[pairId]) {
              store.whispers[pairId] = {};
            }

            if (payload === null) {
              delete store.whispers[pairId][messageId];
            } else {
              store.whispers[pairId][messageId] = payload;
            }

            emitWhisper(pairId, messageId);
          })
        })),
        map: jest.fn(() => ({
          on: jest.fn((callback) => {
            if (!whisperListeners.has(pairId)) {
              whisperListeners.set(pairId, []);
            }
            whisperListeners.get(pairId).push(callback);
            Object.entries(store.whispers[pairId] || {}).forEach(([messageId, payload]) => {
              callback(payload, messageId);
            });
          }),
          off: jest.fn()
        })),
        off: jest.fn()
      });
    }

    return whisperNodes.get(pairId);
  }

  function getInviteNode(username) {
    if (!inviteNodes.has(username)) {
      const inviteRecordNodes = new Map();
      inviteNodes.set(username, {
        get: jest.fn((inviteId) => {
          if (!inviteRecordNodes.has(inviteId)) {
            inviteRecordNodes.set(inviteId, {
              put: jest.fn((payload) => {
                if (!store.invites[username]) {
                  store.invites[username] = {};
                }

                if (payload === null) {
                  delete store.invites[username][inviteId];
                } else {
                  store.invites[username][inviteId] = payload;
                }

                emitInvite(username, inviteId);
              })
            });
          }

          return inviteRecordNodes.get(inviteId);
        }),
        map: jest.fn(() => ({
          on: jest.fn((callback) => {
            if (!inviteListeners.has(username)) {
              inviteListeners.set(username, []);
            }
            inviteListeners.get(username).push(callback);
            Object.entries(store.invites[username] || {}).forEach(([inviteId, payload]) => {
              callback(payload, inviteId);
            });
          }),
          off: jest.fn()
        })),
        off: jest.fn()
      });
    }

    return inviteNodes.get(username);
  }

  function getSocialPrefsNode(username) {
    if (!socialPrefNodes.has(username)) {
      socialPrefNodes.set(username, {
        put: jest.fn((payload) => {
          if (payload === null) {
            delete store.socialPrefs[username];
          } else {
            store.socialPrefs[username] = payload;
          }
          emitSocialPref(username);
        }),
        on: jest.fn((callback) => {
          if (!socialPrefListeners.has(username)) {
            socialPrefListeners.set(username, []);
          }
          socialPrefListeners.get(username).push(callback);
          callback(store.socialPrefs[username]);
        }),
        off: jest.fn()
      });
    }

    return socialPrefNodes.get(username);
  }

  function getSocialRelationUserNode(username) {
    if (!socialRelationUserNodes.has(username)) {
      const recordNodes = new Map();
      socialRelationUserNodes.set(username, {
        get: jest.fn((otherUsername) => {
          if (!recordNodes.has(otherUsername)) {
            recordNodes.set(otherUsername, {
              put: jest.fn((payload) => {
                if (!store.socialRelations[username]) {
                  store.socialRelations[username] = {};
                }
                if (payload === null) {
                  delete store.socialRelations[username][otherUsername];
                } else {
                  store.socialRelations[username][otherUsername] = payload;
                }
                emitSocialRelation(username, otherUsername);
              }),
              on: jest.fn((callback) => {
                if (!socialRelationListeners.has(username)) {
                  socialRelationListeners.set(username, { map: [], record: new Map() });
                }
                if (!socialRelationListeners.get(username).record.has(otherUsername)) {
                  socialRelationListeners.get(username).record.set(otherUsername, []);
                }
                socialRelationListeners.get(username).record.get(otherUsername).push(callback);
                callback(store.socialRelations[username]?.[otherUsername]);
              }),
              off: jest.fn()
            });
          }

          return recordNodes.get(otherUsername);
        }),
        map: jest.fn(() => ({
          on: jest.fn((callback) => {
            if (!socialRelationListeners.has(username)) {
              socialRelationListeners.set(username, { map: [], record: new Map() });
            }
            socialRelationListeners.get(username).map.push(callback);
            Object.entries(store.socialRelations[username] || {}).forEach(([otherUsername, payload]) => {
              callback(payload, otherUsername);
            });
          }),
          off: jest.fn()
        })),
        off: jest.fn()
      });
    }

    return socialRelationUserNodes.get(username);
  }

  function getLastReadNode(username) {
    if (!lastReadNodes.has(username)) {
      lastReadNodes.set(username, {
        put: jest.fn((payload) => {
          if (payload === null) {
            delete store.lastRead[username];
          } else {
            store.lastRead[username] = payload;
          }
          emitLastRead(username);
        }),
        on: jest.fn((callback) => {
          if (!lastReadListeners.has(username)) {
            lastReadListeners.set(username, []);
          }
          lastReadListeners.get(username).push(callback);
          callback(store.lastRead[username]);
        }),
        off: jest.fn()
      });
    }

    return lastReadNodes.get(username);
  }

  function getWhisperTypingNode(pairId) {
    if (!whisperTypingNodes.has(pairId)) {
      whisperTypingNodes.set(pairId, {
        get: jest.fn((username) => ({
          put: jest.fn((payload) => {
            if (!store.whisperTyping[pairId]) {
              store.whisperTyping[pairId] = {};
            }
            if (payload === null) {
              delete store.whisperTyping[pairId][username];
            } else {
              store.whisperTyping[pairId][username] = payload;
            }
            emitWhisperTyping(pairId, username);
          })
        })),
        map: jest.fn(() => ({
          on: jest.fn((callback) => {
            if (!whisperTypingListeners.has(pairId)) {
              whisperTypingListeners.set(pairId, []);
            }
            whisperTypingListeners.get(pairId).push(callback);
            Object.entries(store.whisperTyping[pairId] || {}).forEach(([username, payload]) => {
              callback(payload, username);
            });
          }),
          off: jest.fn()
        })),
        off: jest.fn()
      });
    }

    return whisperTypingNodes.get(pairId);
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

  const appearancesRoot = {
    get: jest.fn((username) => getAppearanceNode(username))
  };

  const emotesRoot = {
    get: jest.fn((roomId) => getEmoteNode(roomId))
  };

  const whispersRoot = {
    get: jest.fn((pairId) => getWhisperNode(pairId))
  };

  const speechRoot = {
    get: jest.fn((roomId) => getSpeechNode(roomId))
  };

  const invitesRoot = {
    get: jest.fn((username) => getInviteNode(username))
  };

  const socialPrefsRoot = {
    get: jest.fn((username) => getSocialPrefsNode(username))
  };

  const socialRelationsRoot = {
    get: jest.fn((username) => getSocialRelationUserNode(username))
  };

  const lastReadRoot = {
    get: jest.fn((username) => getLastReadNode(username))
  };

  const whisperTypingRoot = {
    get: jest.fn((pairId) => getWhisperTypingNode(pairId))
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
        if (key === 'CHABLO_AVATARS') return appearancesRoot;
        if (key === 'CHABLO_EMOTES') return emotesRoot;
        if (key === 'CHABLO_SPEECH') return speechRoot;
        if (key === 'CHABLO_WHISPERS') return whispersRoot;
        if (key === 'CHABLO_INVITES') return invitesRoot;
        if (key === 'CHABLO_SOCIAL_PREFS') return socialPrefsRoot;
        if (key === 'CHABLO_SOCIAL_RELATIONS') return socialRelationsRoot;
        if (key === 'CHABLO_LAST_READ') return lastReadRoot;
        if (key === 'CHABLO_WHISPER_TYPING') return whisperTypingRoot;
        return undefined;
      })
    },
    getPositionNode,
    getFriendUserNode,
    getRoomChatNode,
    getHotspotPresenceNode,
    getRoomActivityNode,
    getRoomStateNode,
    getAppearanceNode,
    getEmoteNode,
    getSpeechNode,
    getWhisperNode,
    getInviteNode,
    getSocialPrefsNode,
    getSocialRelationUserNode,
    getLastReadNode,
    getWhisperTypingNode
  };
}

function clickLauncher(label) {
  const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${escapeRegex(label)}(?:\\b|\\s|$)`, 'i') }));
}

function openAvatarMenuItem(label) {
  fireEvent.click(screen.getByRole('button', { name: 'Open avatar menu' }));
  fireEvent.click(screen.getByRole('menuitem', { name: label }));
}

function clickWindowTab(label) {
  const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  fireEvent.click(screen.getByRole('tab', { name: new RegExp(`^${escapeRegex(label)}(?:\\b|\\s|$)`, 'i') }));
}

function clickNavigatorRoom(roomName, buttonName = 'Ga kijken') {
  const row = screen.getByText(roomName).closest('article');
  if (!row) {
    throw new Error(`Navigator row not found for room ${roomName}`);
  }
  fireEvent.click(within(row).getByRole('button', { name: buttonName }));
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

    clickLauncher('Console');
    clickWindowTab('Friends');
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

    clickLauncher('Console');
    clickWindowTab('Friends');
    fireEvent.click(screen.getByRole('button', { name: 'Ga naar kamer' }));
    expect(await screen.findByRole('heading', { name: 'De Bar' })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Zeg iets in De Bar'), {
      target: { value: 'Iedereen hier lijkt AFK.' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Iedereen hier lijkt AFK.')).toBeInTheDocument();

    const roomChatNode = api.getRoomChatNode('bar');
    const putCalls = roomChatNode.get.mock.results.map((result) => result.value.put.mock.calls).flat();
    expect(putCalls).toEqual(expect.arrayContaining([
      [expect.objectContaining({
        van: 'alice',
        tekst: 'Iedereen hier lijkt AFK.'
      })]
    ]));
    expect(api.getSpeechNode('bar').get('alice').put).toHaveBeenCalledWith(expect.objectContaining({
      by: 'alice',
      roomId: 'bar',
      text: 'Iedereen hier lijkt AFK.'
    }));
  });

  test('renders and switches to the motelgang, arcade and laundry rooms', async () => {
    const now = Date.now();
    const api = createGunApiMock({
      positions: {
        alice: { room: 'receptie', x: 9, y: 7, lastSeen: now }
      }
    });

    render(<ChabloMotelView currentUser="alice" gunApi={api.gunApi} />);

    clickLauncher('Navigator');
    clickNavigatorRoom('Motelgang');
    expect(await screen.findByRole('heading', { name: 'Motelgang' })).toBeInTheDocument();
    clickLauncher('Hand');
    expect(screen.getAllByRole('button', { name: 'Ga naar het kamerbord' }).length).toBeGreaterThan(0);

    clickNavigatorRoom('Arcade');
    expect(await screen.findByRole('heading', { name: 'Arcade' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Bekijk highscores' }).length).toBeGreaterThan(0);

    clickNavigatorRoom('Laundry');
    expect(await screen.findByRole('heading', { name: 'Laundry' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Ga naar de machines' }).length).toBeGreaterThan(0);
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

      clickLauncher('Hand');
      fireEvent.click(screen.getByRole('button', { name: 'Ga naar de lounge' }));

      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(screen.getByText('15, 9')).toBeInTheDocument();
      expect(screen.getAllByText('Loungehoek').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/sofa om dramatisch te zitten wachten/i).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: 'Hang rond in de lounge' }).length).toBeGreaterThan(0);

      fireEvent.click(screen.getAllByRole('button', { name: 'Hang rond in de lounge' })[0]);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/loungehoek/i);
      });
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

      clickLauncher('Navigator');
      clickNavigatorRoom('De Bar');
      expect(await screen.findByRole('heading', { name: 'De Bar' })).toBeInTheDocument();

      clickLauncher('Hand');
      fireEvent.click(screen.getByRole('button', { name: 'Ga naar de bar' }));

      act(() => {
        jest.advanceTimersByTime(1600);
      });

      expect(screen.getByText('9, 9')).toBeInTheDocument();
      fireEvent.click(screen.getAllByRole('button', { name: 'Bestel iets aan de bar' })[0]);

      expect(screen.getByPlaceholderText('Zeg iets in De Bar')).toHaveValue('Nog iemand iets van de bar?');
      expect(screen.getByRole('tab', { name: 'Say' })).toHaveAttribute('aria-selected', 'true');

      await waitFor(() => {
        expect(api.getRoomStateNode('bar').get).toHaveBeenCalledWith('Bar');
      });
      const barRoomStatePuts = api.getRoomStateNode('bar').get.mock.results
        .map((result) => result.value.put.mock.calls)
        .flat();
      expect(barRoomStatePuts).toEqual(expect.arrayContaining([
        [expect.objectContaining({
          hotspotLabel: 'Bartoog',
          sceneEffect: 'bar-rush',
          sceneAccent: '#ff9468',
          stageNote: 'Last call',
          stateBadge: 'Bar live',
          stateSummary: expect.stringMatching(/^House special:/),
          participantCount: 1,
          participantLabel: 'Aan de bar',
          prompt: 'Drop de volgende bestelling in de room chat.'
        })]
      ]));
    } finally {
      jest.useRealTimers();
    }
  });

  test('opens the wardrobe hotspot and previews, randomizes, resets and saves avatar appearance', async () => {
    jest.useFakeTimers();
    const dateNowSpy = jest.spyOn(Date, 'now');
    try {
      const now = 171234;
      dateNowSpy.mockReturnValue(now);
      const api = createGunApiMock({
        positions: {
          alice: { room: 'receptie', x: 9, y: 7, lastSeen: now }
        },
        appearances: {
          alice: { bodyShape: 'square', updatedAt: now }
        }
      });

      render(<ChabloMotelView currentUser="alice" gunApi={api.gunApi} />);

      clickLauncher('Navigator');
      clickNavigatorRoom('Motelgang');
      expect(await screen.findByRole('heading', { name: 'Motelgang' })).toBeInTheDocument();

      clickLauncher('Hand');
      fireEvent.click(screen.getByRole('button', { name: 'Ga naar de spiegel' }));
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      fireEvent.click(screen.getAllByRole('button', { name: 'Open wardrobe' })[0]);

      expect(await screen.findByText('Live preview')).toBeInTheDocument();
      expect(screen.getByText('Huidige vorm: square')).toBeInTheDocument();
      expect(screen.queryByRole('list', { name: 'Top' })).toBeNull();
      expect(screen.queryByRole('list', { name: 'Bottom' })).toBeNull();
      expect(screen.queryByRole('list', { name: 'Shoes' })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Vorm: Driehoek' }));
      expect(screen.getByText('Huidige vorm: triangle')).toBeInTheDocument();

      dateNowSpy.mockReturnValue(now + 1000);
      fireEvent.click(screen.getByRole('button', { name: 'Randomize' }));
      const randomizedAppearance = createRandomChabloAvatarAppearance(`alice:${now + 1000}`);
      expect(screen.getByText(`Huidige vorm: ${randomizedAppearance.bodyShape}`)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
      const resetAppearance = createDefaultChabloAvatarAppearance('alice');
      expect(screen.getByText(`Huidige vorm: ${resetAppearance.bodyShape}`)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Vorm: Driehoek' }));
      dateNowSpy.mockReturnValue(now + 2000);
      fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));

      expect(api.getAppearanceNode('alice').put).toHaveBeenCalledWith(expect.objectContaining({
        bodyShape: 'triangle',
        updatedAt: now + 2000
      }));
      expect(screen.getByText('Je motel-look is opgeslagen.')).toBeInTheDocument();
    } finally {
      dateNowSpy.mockRestore();
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
            stateBadge: 'Check-in',
            stateSummary: 'bob houdt de balie even bezet.',
            participantCount: 3,
            participantLabel: 'Lobby aandacht',
            prompt: 'Vraag aan de balie wie er net is binnengevallen.',
            spotlight: 'Er ligt een nieuw briefje op het motelbord.',
            updatedAt: now
          }
        }
      }
    });

    render(<ChabloMotelView currentUser="alice" gunApi={api.gunApi} />);

    openAvatarMenuItem('Bulletin');
    clickWindowTab('Activiteit');
    expect(await screen.findByText('Live room activity')).toBeInTheDocument();
    expect(screen.getByText('bob bekijkt balie.')).toBeInTheDocument();
    clickWindowTab('State');
    expect(screen.getByText('Gedeelde room status')).toBeInTheDocument();
    expect(screen.getByText('Het motelbord is weer even het centrum van de lobby.')).toBeInTheDocument();
    expect(screen.getByText('bob houdt de balie even bezet.')).toBeInTheDocument();
    expect(screen.getByText('Lobby aandacht: 3')).toBeInTheDocument();
    expect(screen.getByText('Vraag aan de balie wie er net is binnengevallen.')).toBeInTheDocument();

    clickLauncher('Hand');
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

      clickLauncher('Hand');
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
          kind: 'feedback',
          sceneEffect: 'generic',
          stageNote: 'lounge',
          stateBadge: 'Live',
          participantLabel: 'In de buurt'
        })]
      ]));
    } finally {
      jest.useRealTimers();
    }
  });

  test('shows unread badges for room chat, whispers and invites', async () => {
    const now = Date.now();
    const api = createGunApiMock({
      positions: {
        alice: { room: 'receptie', x: 9, y: 7, lastSeen: now },
        bob: { room: 'receptie', x: 10, y: 7, lastSeen: now }
      },
      roomChat: {
        bar: {
          '1': { van: 'bob', tekst: 'kom naar de bar', timestamp: now }
        }
      },
      whispers: {
        'alice::bob': {
          '10-bob': { from: 'bob', to: 'alice', text: 'psst', timestamp: now }
        }
      },
      invites: {
        alice: {
          inv1: {
            from: 'bob',
            to: 'alice',
            roomId: 'bar',
            roomName: 'De Bar',
            note: 'kom naar de bar',
            status: 'pending',
            createdAt: now,
            updatedAt: now
          }
        }
      },
      lastRead: {
        alice: {
          rooms: {},
          whispers: {},
          invites: 0
        }
      }
    });

    render(<ChabloMotelView currentUser="alice" gunApi={api.gunApi} />);

    clickLauncher('Navigator');
    expect(await screen.findByLabelText('1 ongelezen roomberichten')).toBeInTheDocument();
    expect(screen.getByLabelText('2 ongelezen sociale meldingen')).toBeInTheDocument();
  });

  test('writes self and targeted emotes to Gun without creating unread badges', async () => {
    const now = Date.now();
    const api = createGunApiMock({
      positions: {
        alice: { room: 'receptie', x: 9, y: 7, lastSeen: now },
        bob: { room: 'receptie', x: 10, y: 7, lastSeen: now }
      }
    });

    render(<ChabloMotelView currentUser="alice" gunApi={api.gunApi} />);

    openAvatarMenuItem('Habmoji');
    fireEvent.click(screen.getByRole('button', { name: 'Zelf-emote Zwaai' }));

    expect(api.getEmoteNode('receptie').get('alice').put).toHaveBeenCalledWith(expect.objectContaining({
      type: 'wave',
      label: 'WAVE',
      by: 'alice',
      roomId: 'receptie'
    }));
    expect(screen.queryByLabelText(/ongelezen sociale meldingen/i)).toBeNull();

    fireEvent.click(await screen.findByRole('button', { name: 'Avatar van bob' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Zwaai naar bob' })[0]);

    expect(api.getEmoteNode('receptie').get('alice').put).toHaveBeenLastCalledWith(expect.objectContaining({
      type: 'wave',
      targetUsername: 'bob'
    }));
  });

  test('filters muted user emotes from the stage and hides targeted emote actions', async () => {
    const now = Date.now();
    const api = createGunApiMock({
      positions: {
        alice: { room: 'receptie', x: 9, y: 7, lastSeen: now },
        bob: { room: 'receptie', x: 10, y: 7, lastSeen: now }
      },
      emotes: {
        receptie: {
          bob: {
            type: 'wave',
            label: 'WAVE',
            by: 'bob',
            roomId: 'receptie',
            issuedAt: now,
            expiresAt: now + 2400
          }
        }
      },
      socialRelations: {
        alice: {
          bob: { muted: true, blocked: false, updatedAt: now }
        }
      }
    });

    render(<ChabloMotelView currentUser="alice" gunApi={api.gunApi} />);

    expect(screen.queryByText('Emote bob: WAVE')).toBeNull();

    fireEvent.click(await screen.findByRole('button', { name: 'Avatar van bob' }));
    expect(screen.queryByRole('button', { name: 'Zwaai naar bob' })).toBeNull();
  });

  test('opens an inline whisper thread from an avatar and sends a whisper', async () => {
    const now = Date.now();
    const api = createGunApiMock({
      positions: {
        alice: { room: 'receptie', x: 9, y: 7, lastSeen: now },
        bob: { room: 'receptie', x: 10, y: 7, lastSeen: now }
      }
    });

    render(<ChabloMotelView currentUser="alice" gunApi={api.gunApi} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Avatar van bob' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fluister' }));

    const whisperComposer = screen.getByPlaceholderText('Fluister naar bob');
    fireEvent.change(whisperComposer, { target: { value: 'Niet naar de lobby kijken.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    const whisperPairNode = api.getWhisperNode('alice::bob');
    const whisperPuts = whisperPairNode.get.mock.results
      .map((result) => result.value.put.mock.calls)
      .flat();
    expect(whisperPuts).toEqual(expect.arrayContaining([
      [expect.objectContaining({
        from: 'alice',
        to: 'bob',
        text: 'Niet naar de lobby kijken.'
      })]
    ]));
  });

  test('accepts a room invite and jumps to the invited room', async () => {
    const now = Date.now();
    const api = createGunApiMock({
      positions: {
        alice: { room: 'receptie', x: 9, y: 7, lastSeen: now }
      },
      invites: {
        alice: {
          inv1: {
            from: 'bob',
            to: 'alice',
            roomId: 'bar',
            roomName: 'De Bar',
            note: 'Kom hierheen.',
            status: 'pending',
            createdAt: now,
            updatedAt: now
          }
        }
      }
    });

    render(<ChabloMotelView currentUser="alice" gunApi={api.gunApi} />);

    clickLauncher('Console');
    clickWindowTab('Invites');
    fireEvent.click(screen.getByRole('button', { name: 'Accepteer invite' }));

    expect(await screen.findByRole('heading', { name: 'De Bar' })).toBeInTheDocument();
    expect(api.getInviteNode('alice').get('inv1').put).toHaveBeenCalledWith(expect.objectContaining({
      status: 'accepted'
    }));
  });

  test('applies visibility, block and dnd settings only inside the Chablo social layer', async () => {
    const now = Date.now();
    const api = createGunApiMock({
      positions: {
        alice: { room: 'receptie', x: 9, y: 7, lastSeen: now },
        bob: { room: 'receptie', x: 10, y: 7, lastSeen: now },
        cara: { room: 'bar', x: 3, y: 3, lastSeen: now }
      },
      socialPrefs: {
        bob: {
          visibility: 'hidden',
          allowWhispers: true,
          allowInvites: true,
          dnd: false,
          updatedAt: now
        }
      }
    });

    render(<ChabloMotelView currentUser="alice" gunApi={api.gunApi} />);

    expect(await screen.findByRole('button', { name: 'Avatar van bob' })).toBeInTheDocument();

    clickLauncher('Console');
    const consoleWindow = screen.getByText('Habbo Console').closest('section');
    expect(within(consoleWindow).queryByText('bob')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Avatar van bob' }));
    fireEvent.click(screen.getByRole('button', { name: 'Blokkeer' }));
    expect(api.getSocialRelationUserNode('alice').get('bob').put).toHaveBeenCalledWith(expect.objectContaining({
      blocked: true
    }));
    expect(screen.queryByRole('button', { name: 'Fluister' })).toBeNull();

    clickWindowTab('Privacy');
    fireEvent.click(screen.getByRole('button', { name: 'hidden' }));
    expect(api.getSocialPrefsNode('alice').put).toHaveBeenCalledWith(expect.objectContaining({
      visibility: 'hidden'
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Niet storen: Uit' }));
    expect(api.getSocialPrefsNode('alice').put).toHaveBeenCalledWith(expect.objectContaining({
      dnd: true
    }));
  });
});
