import { useEffect, useRef } from 'react';
import { normalizeSocialRelation } from './chabloSocial';
import { WHISPER_TYPING_ACTIVE_MS } from './chabloLiveStateUtils';

export function useChabloSocialEffects({
  activeWhisperPairId,
  activeWhisperThread,
  currentRoom,
  currentUser,
  currentUserPrefs,
  hudChatMode,
  hudWhisperTarget,
  markInvitesRead,
  markRoomRead,
  markWhisperRead,
  outgoingRelationsByUsername,
  pendingInvites,
  publishWhisperTyping,
  roomChatInput,
  setActiveWhisperPairId,
  setFeedback,
  whisperThreads,
  whisperThreadsWithDraft,
  windowStateById
}) {
  const socialFeedbackRef = useRef({
    whisperByPairId: {},
    inviteById: {}
  });
  const whisperTypingTimeoutRef = useRef(null);

  useEffect(() => {
    if (windowStateById.chatHistory?.open && windowStateById.chatHistory.activeSubview === 'room') {
      markRoomRead(currentRoom);
    }
  }, [currentRoom, markRoomRead, windowStateById.chatHistory]);

  useEffect(() => {
    if (windowStateById.console?.open && windowStateById.console.activeSubview === 'invites') {
      markInvitesRead();
    }
  }, [markInvitesRead, windowStateById.console]);

  useEffect(() => {
    if (
      activeWhisperPairId
      && (
        (windowStateById.chatHistory?.open && windowStateById.chatHistory.activeSubview === 'whispers')
        || (windowStateById.console?.open && windowStateById.console.activeSubview === 'whispers')
      )
    ) {
      markWhisperRead(activeWhisperPairId);
    }
  }, [activeWhisperPairId, markWhisperRead, whisperThreadsWithDraft, windowStateById.chatHistory, windowStateById.console]);

  useEffect(() => {
    if (!activeWhisperThread || hudChatMode !== 'whisper' || hudWhisperTarget !== activeWhisperThread.partner) {
      if (whisperTypingTimeoutRef.current) {
        window.clearTimeout(whisperTypingTimeoutRef.current);
        whisperTypingTimeoutRef.current = null;
      }
      return;
    }

    publishWhisperTyping(activeWhisperThread.pairId, roomChatInput.trim().length > 0);
    if (whisperTypingTimeoutRef.current) {
      window.clearTimeout(whisperTypingTimeoutRef.current);
      whisperTypingTimeoutRef.current = null;
    }

    if (roomChatInput.trim().length > 0) {
      whisperTypingTimeoutRef.current = window.setTimeout(() => {
        publishWhisperTyping(activeWhisperThread.pairId, false);
        whisperTypingTimeoutRef.current = null;
      }, WHISPER_TYPING_ACTIVE_MS - 400);
    }
  }, [activeWhisperThread, hudChatMode, hudWhisperTarget, publishWhisperTyping, roomChatInput]);

  useEffect(() => () => {
    if (whisperTypingTimeoutRef.current) {
      window.clearTimeout(whisperTypingTimeoutRef.current);
      whisperTypingTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (activeWhisperPairId && !whisperThreadsWithDraft.find((thread) => thread.pairId === activeWhisperPairId)) {
      setActiveWhisperPairId(null);
    }
  }, [activeWhisperPairId, setActiveWhisperPairId, whisperThreadsWithDraft]);

  useEffect(() => {
    if (!currentUserPrefs.dnd) {
      return;
    }
    socialFeedbackRef.current.whisperByPairId = {};
    socialFeedbackRef.current.inviteById = {};
  }, [currentUserPrefs.dnd]);

  useEffect(() => {
    if (currentUserPrefs.dnd) {
      return;
    }

    whisperThreads.forEach((thread) => {
      const lastMessage = thread.lastMessage;
      if (!lastMessage || lastMessage.from === currentUser) {
        return;
      }
      if (normalizeSocialRelation(outgoingRelationsByUsername[thread.partner]).muted) {
        return;
      }
      const lastSeenTimestamp = socialFeedbackRef.current.whisperByPairId[thread.pairId] || 0;
      if (lastMessage.timestamp <= lastSeenTimestamp) {
        return;
      }
      socialFeedbackRef.current.whisperByPairId[thread.pairId] = lastMessage.timestamp;
      setFeedback(`${thread.partner} fluistert: ${lastMessage.text.slice(0, 48)}`);
    });
  }, [currentUser, currentUserPrefs.dnd, outgoingRelationsByUsername, setFeedback, whisperThreads]);

  useEffect(() => {
    if (currentUserPrefs.dnd) {
      return;
    }

    pendingInvites.forEach((invite) => {
      if (normalizeSocialRelation(outgoingRelationsByUsername[invite.from]).muted) {
        return;
      }
      const lastSeenTimestamp = socialFeedbackRef.current.inviteById[invite.id] || 0;
      const inviteTimestamp = invite.updatedAt || invite.createdAt || 0;
      if (inviteTimestamp <= lastSeenTimestamp) {
        return;
      }
      socialFeedbackRef.current.inviteById[invite.id] = inviteTimestamp;
      setFeedback(`${invite.from} nodigt je uit naar ${invite.roomName}.`);
    });
  }, [currentUserPrefs.dnd, outgoingRelationsByUsername, pendingInvites, setFeedback]);
}
