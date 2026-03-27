import { useMemo } from 'react';
import {
  buildVisibleRoomPresence,
  buildWhisperThreads,
  getUnreadEntriesCount,
  getWhisperPairId,
  getWhisperPartner,
  normalizeSocialPrefs,
  normalizeSocialRelation
} from './chabloSocial';
import { isChabloEmoteFresh } from './chabloEmotes';
import { normalizeChabloAvatarAppearance } from './chabloAvatarAppearance';
import {
  createSafeDictionary,
  safeDictionaryEntries
} from './chabloSafeStore';
import {
  describeParticipants,
  isPositionFresh,
  isSpeechFresh
} from './chabloLiveStateUtils';

export function useChabloSocialState({
  acceptedFriends,
  activeWhisperPairId,
  allPositions,
  avatarAppearancesByUsername,
  currentRoom,
  currentRoomMeta,
  currentUser,
  emoteEntriesByUsername,
  emoteRenderNow,
  friendEntries,
  highlightedHotspot,
  hotspotPresenceEntries,
  inviteEntries,
  incomingRelationsByUsername,
  lastReadState,
  otherOccupants,
  outgoingRelationsByUsername,
  roomActivityEntries,
  roomChatMessagesByRoomId,
  roomIds,
  roomStateEntries,
  selectedAvatar,
  selectedHotspotId,
  socialPrefsByUsername,
  speechEntriesByUsername,
  typingByPairId,
  whisperMessagesByPairId,
  wardrobeDraftAppearance,
  isWardrobeOpen,
  getDefaultAppearance
}) {
  const acceptedFriendUsernames = useMemo(
    () => new Set(
      friendEntries
        .filter((entry) => entry.status === 'accepted')
        .map((entry) => entry.username)
    ),
    [friendEntries]
  );

  const selectedFriendship = useMemo(
    () => friendEntries.find((entry) => entry.username === selectedAvatar) || null,
    [friendEntries, selectedAvatar]
  );

  const hotspotPresenceById = useMemo(() => (
    hotspotPresenceEntries.reduce((next, entry) => {
      if (!next[entry.hotspotId]) {
        next[entry.hotspotId] = [];
      }
      next[entry.hotspotId].push(entry);
      return next;
    }, createSafeDictionary())
  ), [hotspotPresenceEntries]);

  const latestHotspotActivityById = useMemo(() => (
    roomActivityEntries.reduce((next, entry) => {
      if (!entry.hotspotId || next[entry.hotspotId]) {
        return next;
      }
      next[entry.hotspotId] = entry;
      return next;
    }, createSafeDictionary())
  ), [roomActivityEntries]);

  const roomStateByHotspotId = useMemo(() => (
    roomStateEntries.reduce((next, entry) => {
      next[entry.hotspotId] = entry;
      return next;
    }, createSafeDictionary())
  ), [roomStateEntries]);

  const candidateSocialUsernames = useMemo(() => (
    Array.from(new Set([
      currentUser,
      selectedAvatar,
      ...Object.keys(allPositions || {}),
      ...friendEntries.map((entry) => entry.username),
      ...inviteEntries.map((entry) => entry.from),
      ...Object.keys(outgoingRelationsByUsername || {}),
      ...Object.keys(incomingRelationsByUsername || {}),
      ...Object.keys(lastReadState.whispers || {}).map((pairId) => getWhisperPartner(pairId, currentUser))
    ].filter(Boolean))).sort((left, right) => left.localeCompare(right))
  ), [
    allPositions,
    currentUser,
    friendEntries,
    incomingRelationsByUsername,
    inviteEntries,
    lastReadState.whispers,
    outgoingRelationsByUsername,
    selectedAvatar
  ]);

  const candidateAppearanceUsernames = useMemo(() => (
    Array.from(new Set([
      currentUser,
      selectedAvatar,
      ...Object.keys(allPositions || {})
    ].filter(Boolean))).sort((left, right) => left.localeCompare(right))
  ), [allPositions, currentUser, selectedAvatar]);

  const whisperPairIds = useMemo(() => (
    Array.from(new Set([
      ...candidateSocialUsernames
        .filter((username) => username !== currentUser)
        .map((username) => getWhisperPairId(currentUser, username)),
      ...Object.keys(lastReadState.whispers || {})
    ].filter(Boolean))).sort((left, right) => left.localeCompare(right))
  ), [candidateSocialUsernames, currentUser, lastReadState.whispers]);

  const visiblePresenceByRoom = useMemo(() => (
    buildVisibleRoomPresence({
      rooms: roomIds,
      allPositions,
      currentUser,
      socialPrefsByUsername,
      outgoingRelationsByUsername,
      incomingRelationsByUsername,
      acceptedFriendUsernames,
      isPositionFresh
    })
  ), [
    acceptedFriendUsernames,
    allPositions,
    currentUser,
    incomingRelationsByUsername,
    outgoingRelationsByUsername,
    roomIds,
    socialPrefsByUsername
  ]);

  const pendingInvites = useMemo(() => (
    inviteEntries.filter((entry) => (
      entry.status === 'pending'
      && !normalizeSocialRelation(outgoingRelationsByUsername[entry.from]).blocked
      && !normalizeSocialRelation(incomingRelationsByUsername[entry.from]).blocked
    ))
  ), [incomingRelationsByUsername, inviteEntries, outgoingRelationsByUsername]);

  const whisperThreads = useMemo(() => (
    buildWhisperThreads({
      whisperMessagesByPairId,
      currentUser,
      lastReadWhispers: lastReadState.whispers,
      socialPrefsByUsername,
      outgoingRelationsByUsername,
      incomingRelationsByUsername,
      acceptedFriendUsernames
    })
  ), [
    acceptedFriendUsernames,
    currentUser,
    incomingRelationsByUsername,
    lastReadState.whispers,
    outgoingRelationsByUsername,
    socialPrefsByUsername,
    whisperMessagesByPairId
  ]);

  const whisperThreadsWithDraft = useMemo(() => {
    if (!activeWhisperPairId || whisperThreads.find((thread) => thread.pairId === activeWhisperPairId)) {
      return whisperThreads;
    }

    const partner = getWhisperPartner(activeWhisperPairId, currentUser);
    if (!partner) {
      return whisperThreads;
    }

    const prefs = normalizeSocialPrefs(socialPrefsByUsername[partner]);
    const outgoingRelation = normalizeSocialRelation(outgoingRelationsByUsername[partner]);
    const incomingRelation = normalizeSocialRelation(incomingRelationsByUsername[partner]);
    const draftThread = {
      pairId: activeWhisperPairId,
      partner,
      messages: [],
      lastMessage: null,
      unreadCount: 0,
      canWhisper: !outgoingRelation.blocked
        && !incomingRelation.blocked
        && prefs.allowWhispers
        && prefs.visibility !== 'hidden'
        && (
          prefs.visibility === 'full'
          || acceptedFriendUsernames.has(partner)
        )
    };

    return [draftThread, ...whisperThreads];
  }, [
    acceptedFriendUsernames,
    activeWhisperPairId,
    currentUser,
    incomingRelationsByUsername,
    outgoingRelationsByUsername,
    socialPrefsByUsername,
    whisperThreads
  ]);

  const activeWhisperThread = useMemo(
    () => whisperThreadsWithDraft.find((thread) => thread.pairId === activeWhisperPairId) || null,
    [activeWhisperPairId, whisperThreadsWithDraft]
  );

  const activeWhisperTypingUsers = useMemo(() => {
    if (!activeWhisperThread) {
      return [];
    }
    return Object.keys(typingByPairId[activeWhisperThread.pairId] || {}).sort((left, right) => left.localeCompare(right));
  }, [activeWhisperThread, typingByPairId]);

  const roomUnreadCountsById = useMemo(() => (
    roomIds.reduce((next, room) => {
      next[room.id] = getUnreadEntriesCount(
        roomChatMessagesByRoomId[room.id] || [],
        Number(lastReadState.rooms[room.id]) || 0,
        currentUser
      );
      return next;
    }, createSafeDictionary())
  ), [currentUser, lastReadState.rooms, roomChatMessagesByRoomId, roomIds]);

  const whisperUnreadCount = useMemo(
    () => whisperThreads.reduce((total, thread) => total + thread.unreadCount, 0),
    [whisperThreads]
  );

  const inviteUnreadCount = useMemo(
    () => getUnreadEntriesCount(pendingInvites, lastReadState.invites, currentUser),
    [currentUser, lastReadState.invites, pendingInvites]
  );

  const socialUnreadCount = whisperUnreadCount + inviteUnreadCount;

  const mutedUsernames = useMemo(() => (
    safeDictionaryEntries(outgoingRelationsByUsername)
      .filter(([, relation]) => normalizeSocialRelation(relation).muted)
      .map(([username]) => username)
  ), [outgoingRelationsByUsername]);

  const currentUserPrefs = normalizeSocialPrefs(socialPrefsByUsername[currentUser]);

  const activeEmotesByUsername = useMemo(() => {
    const now = emoteRenderNow;

    return safeDictionaryEntries(emoteEntriesByUsername).reduce((next, [username, entry]) => {
      if (!isChabloEmoteFresh(entry, now)) {
        return next;
      }

      if (username !== currentUser) {
        const outgoingRelation = normalizeSocialRelation(outgoingRelationsByUsername[username]);
        const incomingRelation = normalizeSocialRelation(incomingRelationsByUsername[username]);
        if (outgoingRelation.blocked || incomingRelation.blocked || outgoingRelation.muted) {
          return next;
        }
      }

      next[username] = entry;
      return next;
    }, createSafeDictionary());
  }, [currentUser, emoteEntriesByUsername, emoteRenderNow, incomingRelationsByUsername, outgoingRelationsByUsername]);

  const activeSpeechByUsername = useMemo(() => (
    safeDictionaryEntries(speechEntriesByUsername).reduce((next, [username, entry]) => {
      if (isSpeechFresh(entry, emoteRenderNow)) {
        next[username] = entry;
      }
      return next;
    }, createSafeDictionary())
  ), [emoteRenderNow, speechEntriesByUsername]);

  const savedCurrentUserAppearance = useMemo(
    () => normalizeChabloAvatarAppearance(avatarAppearancesByUsername[currentUser], currentUser),
    [avatarAppearancesByUsername, currentUser]
  );

  const effectiveCurrentUserAppearance = useMemo(
    () => normalizeChabloAvatarAppearance(
      isWardrobeOpen && wardrobeDraftAppearance ? wardrobeDraftAppearance : savedCurrentUserAppearance,
      currentUser
    ),
    [currentUser, isWardrobeOpen, savedCurrentUserAppearance, wardrobeDraftAppearance]
  );

  const stageAppearanceByUsername = useMemo(() => {
    const next = createSafeDictionary([
      [currentUser, effectiveCurrentUserAppearance]
    ]);

    otherOccupants.forEach((occupant) => {
      next[occupant.username] = normalizeChabloAvatarAppearance(
        avatarAppearancesByUsername[occupant.username],
        occupant.username
      );
    });

    return next;
  }, [avatarAppearancesByUsername, currentUser, effectiveCurrentUserAppearance, otherOccupants]);

  const visibleAcceptedFriends = useMemo(() => (
    acceptedFriends.filter((entry) => {
      const friendUsername = entry.username;
      return !normalizeSocialRelation(outgoingRelationsByUsername[friendUsername]).blocked
        && !normalizeSocialRelation(incomingRelationsByUsername[friendUsername]).blocked
        && (
          normalizeSocialPrefs(socialPrefsByUsername[friendUsername]).visibility === 'full'
          || (
            normalizeSocialPrefs(socialPrefsByUsername[friendUsername]).visibility === 'friends'
            && acceptedFriendUsernames.has(friendUsername)
          )
        );
    })
  ), [
    acceptedFriendUsernames,
    acceptedFriends,
    incomingRelationsByUsername,
    outgoingRelationsByUsername,
    socialPrefsByUsername
  ]);

  const selectedAvatarPosition = useMemo(
    () => otherOccupants.find((occupant) => occupant.username === selectedAvatar) || null,
    [otherOccupants, selectedAvatar]
  );

  const selectedAvatarPrefs = normalizeSocialPrefs(
    selectedAvatar ? socialPrefsByUsername[selectedAvatar] : undefined
  );
  const selectedOutgoingRelation = normalizeSocialRelation(
    selectedAvatar ? outgoingRelationsByUsername[selectedAvatar] : undefined
  );
  const selectedIncomingRelation = normalizeSocialRelation(
    selectedAvatar ? incomingRelationsByUsername[selectedAvatar] : undefined
  );
  const selectedAvatarBlocked = Boolean(
    selectedOutgoingRelation.blocked || selectedIncomingRelation.blocked
  );
  const selectedAvatarMuted = selectedOutgoingRelation.muted;
  const selectedAvatarCanWhisper = Boolean(
    selectedAvatar
    && !selectedAvatarBlocked
    && selectedAvatarPrefs.allowWhispers
    && selectedAvatarPrefs.visibility !== 'hidden'
    && (
      selectedAvatarPrefs.visibility === 'full'
      || acceptedFriendUsernames.has(selectedAvatar)
    )
  );
  const selectedAvatarCanInvite = Boolean(
    selectedAvatar
    && !selectedAvatarBlocked
    && selectedAvatarPrefs.allowInvites
    && selectedAvatarPrefs.visibility !== 'hidden'
    && (
      selectedAvatarPrefs.visibility === 'full'
      || acceptedFriendUsernames.has(selectedAvatar)
    )
  );
  const selectedAvatarCanEmote = Boolean(
    selectedAvatar
    && !selectedAvatarBlocked
    && !selectedAvatarMuted
  );

  const currentRoomPresence = useMemo(
    () => visiblePresenceByRoom.find((entry) => entry.roomId === currentRoom) || {
      roomId: currentRoom,
      roomName: currentRoomMeta.name,
      usernames: [],
      count: 0
    },
    [currentRoom, currentRoomMeta.name, visiblePresenceByRoom]
  );

  const socialState = {
    acceptedFriendUsernames,
    activeEmotesByUsername,
    activeSpeechByUsername,
    activeWhisperThread,
    activeWhisperTypingUsers,
    candidateAppearanceUsernames,
    candidateSocialUsernames,
    currentRoomPresence,
    currentUserPrefs,
    effectiveCurrentUserAppearance,
    highlightedHotspot,
    hotspotPresenceById,
    inviteUnreadCount,
    latestHotspotActivityById,
    mutedUsernames,
    pendingInvites,
    roomStateByHotspotId,
    roomUnreadCountsById,
    savedCurrentUserAppearance,
    selectedAvatarBlocked,
    selectedAvatarCanEmote,
    selectedAvatarCanInvite,
    selectedAvatarCanWhisper,
    selectedAvatarMuted,
    selectedAvatarPosition,
    selectedAvatarPrefs,
    selectedFriendship,
    socialUnreadCount,
    stageAppearanceByUsername,
    visibleAcceptedFriends,
    visiblePresenceByRoom,
    whisperPairIds,
    whisperThreads,
    whisperThreadsWithDraft,
    whisperUnreadCount
  };

  return socialState;
}

export { describeParticipants, isPositionFresh };
