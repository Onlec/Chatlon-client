import { act, renderHook } from '@testing-library/react';
import { DEFAULT_CHABLO_LAST_READ, getWhisperPairId } from './chabloSocial';
import { useChabloSocialActions } from './useChabloSocialActions';
import { createGunApiTreeMock } from './chabloTestUtils';

function createHookProps(overrides = {}) {
  const { gunApi, getNode } = createGunApiTreeMock();
  let localLastReadState = DEFAULT_CHABLO_LAST_READ;

  const props = {
    activeWhisperThread: null,
    applyLocalLastReadState: jest.fn((updater) => {
      localLastReadState = typeof updater === 'function'
        ? updater(localLastReadState)
        : updater;
    }),
    applyLocalOutgoingRelation: jest.fn(),
    applyLocalSocialPrefs: jest.fn(),
    changeRoom: jest.fn(),
    currentRoom: 'receptie',
    currentRoomMeta: { name: 'Receptie' },
    currentUser: 'alice',
    currentUserPrefs: {},
    friendEntries: [],
    focusChatComposer: jest.fn(),
    getSafeRoomTarget: jest.fn((roomId) => ({ roomId, position: { x: 7, y: 9 } })),
    gunApi,
    hudChatMode: 'say',
    hudWhisperTarget: null,
    incomingRelationsByUsername: {},
    lastReadState: localLastReadState,
    openWindow: jest.fn(),
    outgoingRelationsByUsername: {},
    pendingInvites: [],
    roomChatInput: '',
    roomChatMessagesByRoomId: {
      receptie: [
        { timestamp: 110 },
        { timestamp: 275 }
      ]
    },
    setActiveWhisperPairId: jest.fn(),
    setFeedback: jest.fn(),
    setHudChatMode: jest.fn(),
    setHudWhisperTarget: jest.fn(),
    setRoomChatInput: jest.fn(),
    setSelectedAvatar: jest.fn(),
    whisperMessagesByPairId: {},
    ...overrides
  };

  return {
    getLocalLastReadState: () => localLastReadState,
    getNode,
    props
  };
}

describe('useChabloSocialActions', () => {
  test('marks room and whisper history as read using the latest timestamps', () => {
    const whisperPairId = getWhisperPairId('alice', 'bob');
    const { getLocalLastReadState, getNode, props } = createHookProps({
      whisperMessagesByPairId: {
        [whisperPairId]: [
          { timestamp: 320 },
          { timestamp: 640 }
        ]
      }
    });

    const { result } = renderHook(() => useChabloSocialActions(props));

    act(() => {
      result.current.markRoomRead('receptie');
      result.current.markWhisperRead(whisperPairId);
    });

    expect(getLocalLastReadState().rooms.receptie).toBe(275);
    expect(getLocalLastReadState().whispers[whisperPairId]).toBe(640);
    expect(getNode('CHABLO_LAST_READ', 'alice').put).toHaveBeenLastCalledWith(expect.objectContaining({
      rooms: expect.objectContaining({ receptie: 275 }),
      whispers: expect.objectContaining({ [whisperPairId]: 640 })
    }));
  });

  test('accepts invites through the same Gun nodes and room jump flow as before', () => {
    const invite = {
      id: 'invite-1',
      from: 'bob',
      roomId: 'bar',
      roomName: 'Bar',
      status: 'pending',
      createdAt: 100,
      updatedAt: 100
    };
    const { getNode, props } = createHookProps({
      pendingInvites: [invite]
    });

    const { result } = renderHook(() => useChabloSocialActions(props));

    act(() => {
      result.current.acceptInvite(invite);
    });

    expect(getNode('CHABLO_INVITES', 'alice', 'invite-1').put).toHaveBeenCalledWith(expect.objectContaining({
      status: 'accepted'
    }));
    expect(props.changeRoom).toHaveBeenCalledWith('bar', { x: 7, y: 9 });
    expect(props.openWindow).toHaveBeenCalledWith('chatHistory', { subview: 'room' });
    expect(props.setFeedback).toHaveBeenCalledWith('Je springt naar Bar.');
  });
});
