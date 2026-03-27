import { useCallback, useEffect, useRef } from 'react';
import {
  getWhisperPairId,
  normalizeSocialPrefs,
  normalizeSocialRelation
} from './chabloSocial';
import {
  CHABLO_EMOTE_TTL_MS,
  getChabloEmote
} from './chabloEmotes';
import {
  CHABLO_SPEECH_TTL_MS,
  getLatestInviteTimestamp
} from './chabloLiveStateUtils';
import { getChabloRoom } from './rooms';

export function useChabloSocialActions({
  activeWhisperThread,
  applyLocalLastReadState,
  applyLocalOutgoingRelation,
  applyLocalSocialPrefs,
  changeRoom,
  currentRoom,
  currentRoomMeta,
  currentUser,
  currentUserPrefs,
  friendEntries,
  focusChatComposer,
  getSafeRoomTarget,
  gunApi,
  hudChatMode,
  hudWhisperTarget,
  incomingRelationsByUsername,
  lastReadState,
  openWindow,
  outgoingRelationsByUsername,
  pendingInvites,
  roomChatInput,
  roomChatMessagesByRoomId,
  setActiveWhisperPairId,
  setFeedback,
  setHudChatMode,
  setHudWhisperTarget,
  setRoomChatInput,
  setSelectedAvatar,
  whisperMessagesByPairId
}) {
  const lastReadRef = useRef(lastReadState);

  useEffect(() => {
    lastReadRef.current = lastReadState;
  }, [lastReadState]);

  const persistLastRead = useCallback((updater) => {
    applyLocalLastReadState((previous) => {
      const nextValue = typeof updater === 'function'
        ? updater(previous)
        : updater;
      lastReadRef.current = nextValue;
      gunApi?.get?.('CHABLO_LAST_READ')?.get?.(currentUser)?.put?.(nextValue);
      return nextValue;
    });
  }, [applyLocalLastReadState, currentUser, gunApi]);

  const markRoomRead = useCallback((roomId) => {
    if (!roomId) {
      return;
    }
    const latestTimestamp = (roomChatMessagesByRoomId[roomId] || []).reduce((latest, message) => (
      Math.max(latest, Number(message.timestamp) || 0)
    ), 0);
    if (latestTimestamp <= (lastReadRef.current.rooms?.[roomId] || 0)) {
      return;
    }
    persistLastRead((previous) => ({
      ...previous,
      rooms: {
        ...previous.rooms,
        [roomId]: latestTimestamp
      }
    }));
  }, [persistLastRead, roomChatMessagesByRoomId]);

  const markWhisperRead = useCallback((pairId) => {
    if (!pairId) {
      return;
    }
    const messages = whisperMessagesByPairId[pairId] || [];
    const latestTimestamp = messages.reduce((latest, message) => (
      Math.max(latest, Number(message.timestamp) || 0)
    ), 0);
    if (latestTimestamp <= (lastReadRef.current.whispers?.[pairId] || 0)) {
      return;
    }
    persistLastRead((previous) => ({
      ...previous,
      whispers: {
        ...previous.whispers,
        [pairId]: latestTimestamp
      }
    }));
  }, [persistLastRead, whisperMessagesByPairId]);

  const markInvitesRead = useCallback(() => {
    const latestTimestamp = getLatestInviteTimestamp(pendingInvites);
    if (latestTimestamp <= (lastReadRef.current.invites || 0)) {
      return;
    }
    persistLastRead((previous) => ({
      ...previous,
      invites: latestTimestamp
    }));
  }, [pendingInvites, persistLastRead]);

  const updateSocialPrefs = useCallback((partialPrefs) => {
    const nextPrefs = normalizeSocialPrefs({
      ...currentUserPrefs,
      ...partialPrefs,
      updatedAt: Date.now()
    });
    gunApi?.get?.('CHABLO_SOCIAL_PREFS')?.get?.(currentUser)?.put?.(nextPrefs);
    applyLocalSocialPrefs(currentUser, nextPrefs);
    setFeedback('Je Chablo-voorkeuren zijn bijgewerkt.');
  }, [applyLocalSocialPrefs, currentUser, currentUserPrefs, gunApi, setFeedback]);

  const setRelationState = useCallback((username, partialRelation) => {
    if (!username || username === currentUser) {
      return;
    }
    const nextRelation = normalizeSocialRelation({
      ...normalizeSocialRelation(outgoingRelationsByUsername[username]),
      ...partialRelation,
      updatedAt: Date.now()
    });
    gunApi?.get?.('CHABLO_SOCIAL_RELATIONS')?.get?.(currentUser)?.get?.(username)?.put?.(nextRelation);
    applyLocalOutgoingRelation(username, nextRelation);
  }, [applyLocalOutgoingRelation, currentUser, gunApi, outgoingRelationsByUsername]);

  const publishWhisperTyping = useCallback((pairId, isActive) => {
    if (!pairId) {
      return;
    }
    gunApi?.get?.('CHABLO_WHISPER_TYPING')?.get?.(pairId)?.get?.(currentUser)?.put?.({
      active: isActive,
      updatedAt: Date.now()
    });
  }, [currentUser, gunApi]);

  const openWhisperThread = useCallback((username) => {
    if (!username || username === currentUser) {
      return;
    }
    const nextPairId = getWhisperPairId(currentUser, username);
    setActiveWhisperPairId(nextPairId);
    setHudChatMode('whisper');
    setHudWhisperTarget(username);
    setSelectedAvatar(username);
    openWindow('chatHistory', { subview: 'whispers' });
    markWhisperRead(nextPairId);
    focusChatComposer();
  }, [currentUser, focusChatComposer, markWhisperRead, openWindow, setActiveWhisperPairId, setHudChatMode, setHudWhisperTarget, setSelectedAvatar]);

  const sendRoomInvite = useCallback((targetUsername) => {
    if (!targetUsername || targetUsername === currentUser) {
      return;
    }
    const timestamp = Date.now();
    const inviteId = `${timestamp}-${currentUser}-${currentRoom}`;
    gunApi?.get?.('CHABLO_INVITES')?.get?.(targetUsername)?.get?.(inviteId)?.put?.({
      from: currentUser,
      to: targetUsername,
      roomId: currentRoom,
      roomName: currentRoomMeta.name,
      note: `${currentUser} nodigt je uit naar ${currentRoomMeta.name}.`,
      status: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp
    });
    setFeedback(`Uitnodiging gestuurd naar ${targetUsername}.`);
  }, [currentRoom, currentRoomMeta.name, currentUser, gunApi, setFeedback]);

  const sendEmote = useCallback((type, targetUsername = null) => {
    const emoteConfig = getChabloEmote(type);
    if (!emoteConfig) {
      return;
    }

    if (targetUsername) {
      const outgoingRelation = normalizeSocialRelation(outgoingRelationsByUsername[targetUsername]);
      const incomingRelation = normalizeSocialRelation(incomingRelationsByUsername[targetUsername]);
      if (outgoingRelation.blocked || outgoingRelation.muted || incomingRelation.blocked) {
        return;
      }
    }

    const issuedAt = Date.now();
    gunApi?.get?.('CHABLO_EMOTES')?.get?.(currentRoom)?.get?.(currentUser)?.put?.({
      type: emoteConfig.type,
      label: emoteConfig.label,
      by: currentUser,
      roomId: currentRoom,
      issuedAt,
      expiresAt: issuedAt + CHABLO_EMOTE_TTL_MS,
      ...(targetUsername ? { targetUsername } : {})
    });
  }, [currentRoom, currentUser, gunApi, incomingRelationsByUsername, outgoingRelationsByUsername]);

  const acceptInvite = useCallback((invite) => {
    if (!invite?.id || !invite.roomId) {
      return;
    }
    const { roomId, position: nextPosition } = getSafeRoomTarget(invite.roomId);
    gunApi?.get?.('CHABLO_INVITES')?.get?.(currentUser)?.get?.(invite.id)?.put?.({
      ...invite,
      status: 'accepted',
      updatedAt: Date.now()
    });
    markInvitesRead();
    changeRoom(roomId, nextPosition);
    openWindow('chatHistory', { subview: 'room' });
    setFeedback(`Je springt naar ${invite.roomName || getChabloRoom(roomId).name}.`);
  }, [changeRoom, currentUser, getSafeRoomTarget, gunApi, markInvitesRead, openWindow, setFeedback]);

  const rejectInvite = useCallback((invite) => {
    if (!invite?.id) {
      return;
    }
    gunApi?.get?.('CHABLO_INVITES')?.get?.(currentUser)?.get?.(invite.id)?.put?.({
      ...invite,
      status: 'rejected',
      updatedAt: Date.now()
    });
    setFeedback(`Uitnodiging van ${invite.from} geweigerd.`);
  }, [currentUser, gunApi, setFeedback]);

  const handleFriendRequest = useCallback((targetUsername) => {
    if (!targetUsername || targetUsername === currentUser) {
      return;
    }

    const existingEntry = friendEntries.find((entry) => entry.username === targetUsername);
    if (existingEntry?.status === 'accepted') {
      setFeedback(`${targetUsername} staat al in je motelvrienden.`);
      return;
    }

    const payload = {
      status: 'pending',
      since: Date.now(),
      metIn: currentRoom,
      initiator: currentUser
    };

    gunApi?.get?.('CHABLO_FRIENDS')?.get?.(currentUser)?.get?.(targetUsername)?.put?.(payload);
    gunApi?.get?.('CHABLO_FRIENDS')?.get?.(targetUsername)?.get?.(currentUser)?.put?.(payload);
    setFeedback(`Vriendschapsverzoek gestuurd naar ${targetUsername}.`);
  }, [currentRoom, currentUser, friendEntries, gunApi, setFeedback]);

  const acceptFriendRequest = useCallback((friendUsername) => {
    const nextPayload = {
      status: 'accepted',
      since: Date.now(),
      metIn: currentRoom,
      initiator: currentUser
    };

    gunApi?.get?.('CHABLO_FRIENDS')?.get?.(currentUser)?.get?.(friendUsername)?.put?.(nextPayload);
    gunApi?.get?.('CHABLO_FRIENDS')?.get?.(friendUsername)?.get?.(currentUser)?.put?.(nextPayload);
    setFeedback(`${friendUsername} is nu een Chablo-vriend.`);
  }, [currentRoom, currentUser, gunApi, setFeedback]);

  const rejectFriendRequest = useCallback((friendUsername) => {
    gunApi?.get?.('CHABLO_FRIENDS')?.get?.(currentUser)?.get?.(friendUsername)?.put?.(null);
    gunApi?.get?.('CHABLO_FRIENDS')?.get?.(friendUsername)?.get?.(currentUser)?.put?.(null);
    setFeedback(`Verzoek van ${friendUsername} geweigerd.`);
  }, [currentUser, gunApi, setFeedback]);

  const submitHudChat = useCallback((event) => {
    event.preventDefault();
    const trimmedMessage = roomChatInput.trim();
    if (!trimmedMessage) {
      return;
    }

    if (hudChatMode === 'whisper') {
      const whisperTarget = hudWhisperTarget || activeWhisperThread?.partner;
      if (!whisperTarget) {
        setFeedback('Kies eerst een avatar of whisper-thread.');
        return;
      }

      const pairId = getWhisperPairId(currentUser, whisperTarget);
      const timestamp = Date.now();
      gunApi?.get?.('CHABLO_WHISPERS')?.get?.(pairId)?.get?.(`${timestamp}-${currentUser}`)?.put?.({
        from: currentUser,
        to: whisperTarget,
        text: trimmedMessage.slice(0, 180),
        timestamp
      });
      setActiveWhisperPairId(pairId);
      setHudWhisperTarget(whisperTarget);
      openWindow('chatHistory', { subview: 'whispers' });
      publishWhisperTyping(pairId, false);
      markWhisperRead(pairId);
      setRoomChatInput('');
      return;
    }

    const timestamp = Date.now();
    gunApi?.get?.('CHABLO_ROOM_CHAT')?.get?.(currentRoom)?.get?.(String(timestamp))?.put?.({
      van: currentUser,
      tekst: trimmedMessage.slice(0, 100),
      timestamp
    });
    gunApi?.get?.('CHABLO_SPEECH')?.get?.(currentRoom)?.get?.(currentUser)?.put?.({
      by: currentUser,
      roomId: currentRoom,
      text: trimmedMessage.slice(0, 100),
      issuedAt: timestamp,
      expiresAt: timestamp + CHABLO_SPEECH_TTL_MS
    });
    setRoomChatInput('');
    markRoomRead(currentRoom);
  }, [
    activeWhisperThread,
    currentRoom,
    currentUser,
    gunApi,
    hudChatMode,
    hudWhisperTarget,
    markRoomRead,
    markWhisperRead,
    openWindow,
    publishWhisperTyping,
    roomChatInput,
    setActiveWhisperPairId,
    setFeedback,
    setHudWhisperTarget,
    setRoomChatInput
  ]);

  return {
    acceptFriendRequest,
    acceptInvite,
    handleFriendRequest,
    markInvitesRead,
    markRoomRead,
    markWhisperRead,
    openWhisperThread,
    persistLastRead,
    publishWhisperTyping,
    rejectFriendRequest,
    rejectInvite,
    sendEmote,
    sendRoomInvite,
    setRelationState,
    submitHudChat,
    updateSocialPrefs
  };
}
