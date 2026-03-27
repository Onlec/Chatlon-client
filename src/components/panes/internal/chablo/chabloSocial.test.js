import {
  buildVisibleRoomPresence,
  buildWhisperThreads,
  getUnreadEntriesCount,
  getWhisperPairId,
  getWhisperPartner,
  isChabloUserVisible,
  normalizeLastReadState
} from './chabloSocial';

describe('chabloSocial helpers', () => {
  test('builds a stable whisper pair id and partner lookup', () => {
    const pairId = getWhisperPairId('zoe', 'alice');

    expect(pairId).toBe('alice::zoe');
    expect(getWhisperPartner(pairId, 'alice')).toBe('zoe');
    expect(getWhisperPartner(pairId, 'zoe')).toBe('alice');
  });

  test('normalizes last-read state and counts unread entries after it', () => {
    const lastRead = normalizeLastReadState({
      rooms: { receptie: '12' },
      whispers: { 'alice::bob': '4' },
      invites: '7'
    });

    expect(lastRead).toEqual({
      rooms: { receptie: 12 },
      whispers: { 'alice::bob': 4 },
      invites: 7
    });

    expect(getUnreadEntriesCount([
      { from: 'alice', timestamp: 10 },
      { from: 'bob', timestamp: 11 },
      { from: 'cara', timestamp: 3 }
    ], 4, 'alice')).toBe(1);
  });

  test('filters room presence on visibility and block rules', () => {
    const acceptedFriendUsernames = new Set(['bob']);

    expect(isChabloUserVisible({
      username: 'bob',
      currentUser: 'alice',
      socialPrefs: { visibility: 'friends' },
      outgoingRelation: {},
      incomingRelation: {},
      acceptedFriendUsernames
    })).toBe(true);

    expect(isChabloUserVisible({
      username: 'cara',
      currentUser: 'alice',
      socialPrefs: { visibility: 'friends' },
      outgoingRelation: {},
      incomingRelation: {},
      acceptedFriendUsernames
    })).toBe(false);

    expect(isChabloUserVisible({
      username: 'dave',
      currentUser: 'alice',
      socialPrefs: { visibility: 'full' },
      outgoingRelation: { blocked: true },
      incomingRelation: {},
      acceptedFriendUsernames
    })).toBe(false);
  });

  test('builds visible room groups from presence data', () => {
    const now = Date.now();
    const result = buildVisibleRoomPresence({
      rooms: [
        { id: 'receptie', name: 'Lobby' },
        { id: 'bar', name: 'Bar' }
      ],
      allPositions: {
        alice: { room: 'receptie', lastSeen: now },
        bob: { room: 'receptie', lastSeen: now },
        cara: { room: 'bar', lastSeen: now }
      },
      currentUser: 'alice',
      socialPrefsByUsername: {
        bob: { visibility: 'full' },
        cara: { visibility: 'hidden' }
      },
      outgoingRelationsByUsername: {},
      incomingRelationsByUsername: {},
      acceptedFriendUsernames: new Set(),
      isPositionFresh: () => true
    });

    expect(result).toEqual([
      { roomId: 'receptie', roomName: 'Lobby', usernames: ['bob'], count: 1 },
      { roomId: 'bar', roomName: 'Bar', usernames: [], count: 0 }
    ]);
  });

  test('builds whisper threads with unread counts and filters blocked users', () => {
    const threads = buildWhisperThreads({
      whisperMessagesByPairId: {
        'alice::bob': {
          m1: { from: 'bob', to: 'alice', text: 'psst', timestamp: 10 },
          m2: { from: 'alice', to: 'bob', text: 'zeg', timestamp: 11 }
        },
        'alice::cara': {
          m3: { from: 'cara', to: 'alice', text: 'hoi', timestamp: 12 }
        }
      },
      currentUser: 'alice',
      lastReadWhispers: {
        'alice::bob': 9,
        'alice::cara': 0
      },
      socialPrefsByUsername: {
        bob: { allowWhispers: true, visibility: 'full' },
        cara: { allowWhispers: true, visibility: 'full' }
      },
      outgoingRelationsByUsername: {
        cara: { blocked: true }
      },
      incomingRelationsByUsername: {},
      acceptedFriendUsernames: new Set()
    });

    expect(threads).toHaveLength(1);
    expect(threads[0]).toMatchObject({
      pairId: 'alice::bob',
      partner: 'bob',
      unreadCount: 1,
      canWhisper: true
    });
  });
});
