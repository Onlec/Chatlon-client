import { act, renderHook } from '@testing-library/react';
import { useChabloSocialEffects } from './useChabloSocialEffects';

describe('useChabloSocialEffects', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('marks room and invite reads when the matching windows are open', () => {
    const markRoomRead = jest.fn();
    const markInvitesRead = jest.fn();

    renderHook(() => useChabloSocialEffects({
      activeWhisperPairId: null,
      activeWhisperThread: null,
      currentRoom: 'arcade',
      currentUser: 'alice',
      currentUserPrefs: { dnd: false },
      hudChatMode: 'say',
      hudWhisperTarget: null,
      markInvitesRead,
      markRoomRead,
      markWhisperRead: jest.fn(),
      outgoingRelationsByUsername: {},
      pendingInvites: [],
      publishWhisperTyping: jest.fn(),
      roomChatInput: '',
      setActiveWhisperPairId: jest.fn(),
      setFeedback: jest.fn(),
      whisperThreads: [],
      whisperThreadsWithDraft: [],
      windowStateById: {
        chatHistory: { open: true, activeSubview: 'room' },
        console: { open: true, activeSubview: 'invites' }
      }
    }));

    expect(markRoomRead).toHaveBeenCalledWith('arcade');
    expect(markInvitesRead).toHaveBeenCalledTimes(1);
  });

  test('publishes whisper typing and clears it after the timeout', () => {
    const publishWhisperTyping = jest.fn();

    renderHook(() => useChabloSocialEffects({
      activeWhisperPairId: 'alice::bob',
      activeWhisperThread: { pairId: 'alice::bob', partner: 'bob' },
      currentRoom: 'receptie',
      currentUser: 'alice',
      currentUserPrefs: { dnd: false },
      hudChatMode: 'whisper',
      hudWhisperTarget: 'bob',
      markInvitesRead: jest.fn(),
      markRoomRead: jest.fn(),
      markWhisperRead: jest.fn(),
      outgoingRelationsByUsername: {},
      pendingInvites: [],
      publishWhisperTyping,
      roomChatInput: 'psst',
      setActiveWhisperPairId: jest.fn(),
      setFeedback: jest.fn(),
      whisperThreads: [],
      whisperThreadsWithDraft: [{ pairId: 'alice::bob' }],
      windowStateById: {
        chatHistory: { open: false, activeSubview: 'room' },
        console: { open: false, activeSubview: 'users' }
      }
    }));

    expect(publishWhisperTyping).toHaveBeenCalledWith('alice::bob', true);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(publishWhisperTyping).toHaveBeenCalledWith('alice::bob', false);
  });

  test('suppresses whisper and invite feedback while DND is active', () => {
    const setFeedback = jest.fn();

    renderHook(() => useChabloSocialEffects({
      activeWhisperPairId: null,
      activeWhisperThread: null,
      currentRoom: 'receptie',
      currentUser: 'alice',
      currentUserPrefs: { dnd: true },
      hudChatMode: 'say',
      hudWhisperTarget: null,
      markInvitesRead: jest.fn(),
      markRoomRead: jest.fn(),
      markWhisperRead: jest.fn(),
      outgoingRelationsByUsername: {},
      pendingInvites: [{ id: 'invite-1', from: 'bob', roomName: 'Bar', createdAt: 100, updatedAt: 100 }],
      publishWhisperTyping: jest.fn(),
      roomChatInput: '',
      setActiveWhisperPairId: jest.fn(),
      setFeedback,
      whisperThreads: [{ pairId: 'alice::bob', partner: 'bob', lastMessage: { from: 'bob', text: 'hoi', timestamp: 120 } }],
      whisperThreadsWithDraft: [],
      windowStateById: {
        chatHistory: { open: false, activeSubview: 'room' },
        console: { open: false, activeSubview: 'users' }
      }
    }));

    expect(setFeedback).not.toHaveBeenCalled();
  });
});
