import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_CHABLO_LAST_READ,
  getWhisperPairId,
  getWhisperPartner,
  normalizeInviteEntries,
  normalizeLastReadState,
  normalizeSocialPrefs,
  normalizeSocialRelation,
  normalizeWhisperMessages
} from './chabloSocial';
import {
  normalizeChabloEmoteEntries
} from './chabloEmotes';
import {
  normalizeChabloAvatarAppearance
} from './chabloAvatarAppearance';
import {
  CHABLO_SPEECH_TTL_MS,
  normalizeFriendEntries,
  normalizeHotspotPresenceEntries,
  normalizeRoomActivityEntries,
  normalizeRoomMessages,
  normalizeRoomStateEntries,
  normalizeSpeechEntries,
  normalizeWhisperTypingEntries,
  sanitizeGunNode
} from './chabloLiveStateUtils';
import {
  createSafeDictionary,
  safeDictionaryEntries,
  safeDictionaryKeys,
  updateSafeDictionary
} from './chabloSafeStore';
import {
  useGunMapState,
  useGunMultiMapState,
  useGunRecordState,
  useGunRecordValue
} from './useGunSyncState';

export function useChabloLiveState({
  activeWhisperPairId,
  currentRoom,
  currentUser,
  gunApi,
  roomIds,
  selectedAvatar,
  getDefaultPosition,
  normalizePosition
}) {
  const positionsEntries = useGunMapState({
    gunApi,
    rootKey: 'CHABLO_POSITION',
    deps: [gunApi]
  });
  const friendsEntries = useGunMapState({
    gunApi,
    rootKey: 'CHABLO_FRIENDS',
    path: [currentUser],
    deps: [currentUser, gunApi]
  });
  const roomChatEntriesByRoomId = useGunMultiMapState({
    gunApi,
    rootKey: 'CHABLO_ROOM_CHAT',
    scopes: roomIds,
    deps: [gunApi]
  });
  const hotspotPresenceEntriesByUsername = useGunMapState({
    gunApi,
    rootKey: 'CHABLO_HOTSPOT_PRESENCE',
    path: [currentRoom],
    deps: [currentRoom, currentUser, gunApi]
  });
  const roomActivityEntriesById = useGunMapState({
    gunApi,
    rootKey: 'CHABLO_ROOM_ACTIVITY',
    path: [currentRoom],
    deps: [currentRoom, gunApi]
  });
  const roomStateEntriesByHotspotId = useGunMapState({
    gunApi,
    rootKey: 'CHABLO_ROOM_STATE',
    path: [currentRoom],
    deps: [currentRoom, gunApi]
  });
  const emoteEntriesByUsernameRaw = useGunMapState({
    gunApi,
    rootKey: 'CHABLO_EMOTES',
    path: [currentRoom],
    deps: [currentRoom, gunApi]
  });
  const speechEntriesByUsernameRaw = useGunMapState({
    gunApi,
    rootKey: 'CHABLO_SPEECH',
    path: [currentRoom],
    deps: [currentRoom, gunApi]
  });
  const inviteEntriesById = useGunMapState({
    gunApi,
    rootKey: 'CHABLO_INVITES',
    path: [currentUser],
    deps: [currentUser, gunApi]
  });
  const outgoingRelationRecordsByUsername = useGunMapState({
    gunApi,
    rootKey: 'CHABLO_SOCIAL_RELATIONS',
    path: [currentUser],
    deps: [currentUser, gunApi]
  });
  const lastReadRecord = useGunRecordValue({
    gunApi,
    rootKey: 'CHABLO_LAST_READ',
    path: [currentUser],
    deps: [currentUser, gunApi]
  });

  const [lastReadState, setLastReadState] = useState(DEFAULT_CHABLO_LAST_READ);
  const [avatarAppearancesByUsername, setAvatarAppearancesByUsername] = useState(() => createSafeDictionary());
  const [socialPrefsByUsername, setSocialPrefsByUsername] = useState(() => createSafeDictionary());
  const [outgoingRelationsByUsername, setOutgoingRelationsByUsername] = useState(() => createSafeDictionary());

  const allPositions = useMemo(() => (
    safeDictionaryEntries(positionsEntries).reduce((next, [username, incomingPosition]) => {
      const roomId = incomingPosition.room || currentRoom;
      next[username] = {
        ...incomingPosition,
        ...normalizePosition(
          roomId,
          incomingPosition,
          getDefaultPosition(roomId)
        )
      };
      return next;
    }, createSafeDictionary())
  ), [currentRoom, getDefaultPosition, normalizePosition, positionsEntries]);

  const friendEntries = useMemo(
    () => normalizeFriendEntries(friendsEntries),
    [friendsEntries]
  );

  const roomChatMessagesByRoomId = useMemo(() => (
    roomIds.reduce((next, roomId) => {
      next[roomId] = normalizeRoomMessages(roomChatEntriesByRoomId[roomId]);
      return next;
    }, createSafeDictionary())
  ), [roomChatEntriesByRoomId, roomIds]);

  const hotspotPresenceEntries = useMemo(
    () => normalizeHotspotPresenceEntries(hotspotPresenceEntriesByUsername, currentUser),
    [currentUser, hotspotPresenceEntriesByUsername]
  );

  const roomActivityEntries = useMemo(
    () => normalizeRoomActivityEntries(roomActivityEntriesById),
    [roomActivityEntriesById]
  );

  const roomStateEntries = useMemo(
    () => normalizeRoomStateEntries(roomStateEntriesByHotspotId),
    [roomStateEntriesByHotspotId]
  );

  const emoteEntriesByUsername = useMemo(
    () => normalizeChabloEmoteEntries(emoteEntriesByUsernameRaw, currentRoom),
    [currentRoom, emoteEntriesByUsernameRaw]
  );

  const speechEntriesByUsername = useMemo(
    () => normalizeSpeechEntries(speechEntriesByUsernameRaw, currentRoom),
    [currentRoom, speechEntriesByUsernameRaw]
  );

  const inviteEntries = useMemo(
    () => normalizeInviteEntries(inviteEntriesById),
    [inviteEntriesById]
  );

  const normalizedOutgoingRelationsByUsername = useMemo(() => (
    safeDictionaryEntries(outgoingRelationRecordsByUsername).reduce((next, [username, relation]) => {
      next[username] = normalizeSocialRelation(relation);
      return next;
    }, createSafeDictionary())
  ), [outgoingRelationRecordsByUsername]);

  useEffect(() => {
    setLastReadState(normalizeLastReadState(lastReadRecord || DEFAULT_CHABLO_LAST_READ));
  }, [lastReadRecord]);

  useEffect(() => {
    setOutgoingRelationsByUsername(normalizedOutgoingRelationsByUsername);
  }, [normalizedOutgoingRelationsByUsername]);

  const candidateSocialUsernames = useMemo(() => (
    Array.from(new Set([
      currentUser,
      selectedAvatar,
      ...safeDictionaryKeys(allPositions),
      ...friendEntries.map((entry) => entry.username),
      ...inviteEntries.map((entry) => entry.from),
      ...safeDictionaryKeys(outgoingRelationsByUsername),
      ...Object.keys(lastReadState.whispers || {}).map((pairId) => getWhisperPartner(pairId, currentUser))
    ].filter(Boolean))).sort((left, right) => left.localeCompare(right))
  ), [
    allPositions,
    currentUser,
    friendEntries,
    inviteEntries,
    lastReadState.whispers,
    outgoingRelationsByUsername,
    selectedAvatar
  ]);

  const candidateAppearanceUsernames = useMemo(() => (
    Array.from(new Set([
      currentUser,
      selectedAvatar,
      ...safeDictionaryKeys(allPositions)
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

  const avatarRecordsByUsername = useGunRecordState({
    gunApi,
    rootKey: 'CHABLO_AVATARS',
    keys: candidateAppearanceUsernames,
    deps: [candidateAppearanceUsernames.join('|'), gunApi]
  });
  const socialPrefsRecordsByUsername = useGunRecordState({
    gunApi,
    rootKey: 'CHABLO_SOCIAL_PREFS',
    keys: candidateSocialUsernames,
    deps: [candidateSocialUsernames.join('|'), gunApi]
  });
  const incomingRelationRecordsByUsername = useGunRecordState({
    gunApi,
    rootKey: 'CHABLO_SOCIAL_RELATIONS',
    keys: candidateSocialUsernames.filter((username) => username && username !== currentUser),
    getPathForKey: (username) => [username, currentUser],
    deps: [candidateSocialUsernames.join('|'), currentUser, gunApi]
  });
  const whisperEntriesByPairId = useGunMultiMapState({
    gunApi,
    rootKey: 'CHABLO_WHISPERS',
    scopes: whisperPairIds,
    deps: [whisperPairIds.join('|'), gunApi]
  });
  const typingEntriesByUsername = useGunMapState({
    gunApi,
    rootKey: 'CHABLO_WHISPER_TYPING',
    path: activeWhisperPairId ? [activeWhisperPairId] : [],
    deps: [activeWhisperPairId, currentUser, gunApi],
    enabled: Boolean(activeWhisperPairId)
  });

  const normalizedAvatarAppearancesByUsername = useMemo(() => (
    candidateAppearanceUsernames.reduce((next, username) => {
      next[username] = normalizeChabloAvatarAppearance(avatarRecordsByUsername[username], username);
      return next;
    }, createSafeDictionary())
  ), [avatarRecordsByUsername, candidateAppearanceUsernames]);

  const normalizedSocialPrefsByUsername = useMemo(() => (
    candidateSocialUsernames.reduce((next, username) => {
      next[username] = normalizeSocialPrefs(socialPrefsRecordsByUsername[username]);
      return next;
    }, createSafeDictionary())
  ), [candidateSocialUsernames, socialPrefsRecordsByUsername]);

  const normalizedIncomingRelationsByUsername = useMemo(() => (
    safeDictionaryEntries(incomingRelationRecordsByUsername).reduce((next, [username, relation]) => {
      next[username] = normalizeSocialRelation(relation);
      return next;
    }, createSafeDictionary())
  ), [incomingRelationRecordsByUsername]);

  const whisperMessagesByPairId = useMemo(() => (
    whisperPairIds.reduce((next, pairId) => {
      const normalizedMessages = normalizeWhisperMessages(whisperEntriesByPairId[pairId]);
      if (normalizedMessages.length > 0) {
        next[pairId] = normalizedMessages;
      }
      return next;
    }, createSafeDictionary())
  ), [whisperEntriesByPairId, whisperPairIds]);

  const typingByPairId = useMemo(() => {
    if (!activeWhisperPairId) {
      return createSafeDictionary();
    }

    return createSafeDictionary([
      [activeWhisperPairId, normalizeWhisperTypingEntries(typingEntriesByUsername, currentUser)]
    ]);
  }, [activeWhisperPairId, currentUser, typingEntriesByUsername]);

  useEffect(() => {
    setAvatarAppearancesByUsername(normalizedAvatarAppearancesByUsername);
  }, [normalizedAvatarAppearancesByUsername]);

  useEffect(() => {
    setSocialPrefsByUsername(normalizedSocialPrefsByUsername);
  }, [normalizedSocialPrefsByUsername]);

  const applyLocalAvatarAppearance = (username, appearance) => {
    setAvatarAppearancesByUsername((previous) => updateSafeDictionary(previous, username, normalizeChabloAvatarAppearance(appearance, username)));
  };

  const applyLocalSocialPrefs = (username, prefs) => {
    setSocialPrefsByUsername((previous) => updateSafeDictionary(previous, username, normalizeSocialPrefs(prefs)));
  };

  const applyLocalOutgoingRelation = (username, relation) => {
    setOutgoingRelationsByUsername((previous) => updateSafeDictionary(previous, username, normalizeSocialRelation(relation)));
  };

  const applyLocalLastReadState = (nextValue) => {
    setLastReadState((previous) => normalizeLastReadState(
      typeof nextValue === 'function' ? nextValue(previous) : nextValue
    ));
  };

  return {
    allPositions,
    applyLocalAvatarAppearance,
    applyLocalLastReadState,
    applyLocalOutgoingRelation,
    applyLocalSocialPrefs,
    avatarAppearancesByUsername,
    candidateAppearanceUsernames,
    candidateSocialUsernames,
    emoteEntriesByUsername,
    friendEntries,
    hotspotPresenceEntries,
    incomingRelationsByUsername: normalizedIncomingRelationsByUsername,
    inviteEntries,
    lastReadState,
    outgoingRelationsByUsername,
    roomActivityEntries,
    roomChatMessagesByRoomId,
    roomStateEntries,
    socialPrefsByUsername,
    speechEntriesByUsername,
    typingByPairId,
    whisperMessagesByPairId,
    whisperPairIds
  };
}

export { CHABLO_SPEECH_TTL_MS, sanitizeGunNode };
