import { useCallback } from 'react';
import {
  createDefaultChabloAvatarAppearance,
  createRandomChabloAvatarAppearance,
  normalizeChabloAvatarAppearance
} from './chabloAvatarAppearance';
import { buildSharedRoomStatePayload as getSharedRoomStatePayload } from './chabloRoomStateConfig';
import { getChabloRoom } from './rooms';

export function useChabloHotspotInteractions({
  activeHotspot,
  applyLocalAvatarAppearance,
  changeRoom,
  closeWindow,
  currentRoom,
  currentUser,
  effectiveCurrentUserAppearance,
  focusChatComposer,
  getSafeRoomTarget,
  gunApi,
  hotspotPresenceById,
  latestHotspotActivityById,
  moveToTile,
  openWindow,
  roomActionState,
  roomStateByHotspotId,
  savedCurrentUserAppearance,
  setFeedback,
  setHudChatMode,
  setHudWhisperTarget,
  setIsAvatarMenuOpen,
  setRoomActionState,
  setRoomChatInput,
  setSelectedAvatar,
  setSelectedHotspotId,
  setWardrobeDraftAppearance,
  wardrobeDraftAppearance
}) {
  const publishRoomActivity = useCallback((hotspot, actionType, summary) => {
    if (!hotspot || !summary) {
      return;
    }
    const timestamp = Date.now();
    const activityId = `${timestamp}-${currentUser}-${hotspot.id}`;
    gunApi?.get?.('CHABLO_ROOM_ACTIVITY')?.get?.(currentRoom)?.get?.(activityId)?.put?.({
      by: currentUser,
      room: currentRoom,
      hotspotId: hotspot.id,
      hotspotLabel: hotspot.label,
      actionType,
      summary,
      timestamp
    });
  }, [currentRoom, currentUser, gunApi]);

  const publishRoomState = useCallback((hotspot, actionType) => {
    if (!hotspot) {
      return;
    }
    const visitors = hotspotPresenceById[hotspot.id] || [];
    const usernames = new Set([currentUser]);
    visitors.forEach((entry) => {
      if (entry?.username) {
        usernames.add(entry.username);
      }
    });
    const nextState = getSharedRoomStatePayload(hotspot, actionType, currentUser, {
      participantCount: Math.max(1, usernames.size)
    });
    gunApi?.get?.('CHABLO_ROOM_STATE')?.get?.(currentRoom)?.get?.(hotspot.id)?.put?.({
      hotspotLabel: hotspot.label,
      title: nextState.title,
      text: nextState.text,
      detail: nextState.detail,
      by: currentUser,
      kind: nextState.kind,
      sceneEffect: nextState.sceneEffect,
      sceneAccent: nextState.sceneAccent,
      stageNote: nextState.stageNote,
      stateBadge: nextState.stateBadge,
      stateSummary: nextState.stateSummary,
      participantCount: nextState.participantCount,
      participantLabel: nextState.participantLabel,
      prompt: nextState.prompt,
      spotlight: nextState.spotlight,
      updatedAt: Date.now()
    });
  }, [currentRoom, currentUser, gunApi, hotspotPresenceById]);

  const openWardrobe = useCallback((hotspot) => {
    setSelectedAvatar(null);
    setIsAvatarMenuOpen(false);
    setWardrobeDraftAppearance(savedCurrentUserAppearance);
    setRoomActionState({
      kind: 'wardrobe',
      title: hotspot?.action?.title || hotspot?.label || 'Wardrobe spiegel',
      text: hotspot?.action?.text || hotspot?.description || 'Stel je motel-look samen en zie hem live in de kamer.',
      source: hotspot?.label || 'Wardrobe spiegel'
    });
    openWindow('wardrobe');
  }, [openWindow, savedCurrentUserAppearance, setIsAvatarMenuOpen, setRoomActionState, setSelectedAvatar, setWardrobeDraftAppearance]);

  const updateWardrobeField = useCallback((field, value) => {
    setWardrobeDraftAppearance((previous) => normalizeChabloAvatarAppearance({
      ...(previous || effectiveCurrentUserAppearance),
      [field]: value
    }, currentUser));
  }, [currentUser, effectiveCurrentUserAppearance, setWardrobeDraftAppearance]);

  const resetWardrobeDraft = useCallback(() => {
    setWardrobeDraftAppearance(createDefaultChabloAvatarAppearance(currentUser));
  }, [currentUser, setWardrobeDraftAppearance]);

  const randomizeWardrobeDraft = useCallback(() => {
    setWardrobeDraftAppearance(createRandomChabloAvatarAppearance(`${currentUser}:${Date.now()}`));
  }, [currentUser, setWardrobeDraftAppearance]);

  const saveWardrobeAppearance = useCallback(() => {
    const nextAppearance = normalizeChabloAvatarAppearance({
      ...(wardrobeDraftAppearance || effectiveCurrentUserAppearance),
      updatedAt: Date.now()
    }, currentUser);

    gunApi?.get?.('CHABLO_AVATARS')?.get?.(currentUser)?.put?.(nextAppearance);
    applyLocalAvatarAppearance(currentUser, nextAppearance);
    setWardrobeDraftAppearance(nextAppearance);
    setFeedback('Je motel-look is opgeslagen.');
  }, [applyLocalAvatarAppearance, currentUser, effectiveCurrentUserAppearance, gunApi, setFeedback, setWardrobeDraftAppearance, wardrobeDraftAppearance]);

  const closeWardrobe = useCallback(() => {
    closeWindow('wardrobe');
    if (roomActionState?.kind === 'wardrobe') {
      setRoomActionState(null);
    }
    setWardrobeDraftAppearance(null);
  }, [closeWindow, roomActionState?.kind, setRoomActionState, setWardrobeDraftAppearance]);

  const executeHotspotAction = useCallback((hotspot) => {
    if (!hotspot) {
      return;
    }

    const action = hotspot.action;
    if (!action?.type) {
      if (hotspot.feedback) {
        setFeedback(hotspot.feedback);
      }
      openWindow('backpack', { subview: 'hotspots' });
      publishRoomState(hotspot, 'feedback');
      publishRoomActivity(hotspot, 'feedback', `${currentUser} hangt rond bij ${hotspot.label.toLowerCase()}.`);
      return;
    }

    if (action.type === 'bulletin') {
      setRoomActionState({
        kind: action.type,
        title: action.title || hotspot.label,
        text: action.text || hotspot.description || '',
        source: hotspot.label
      });
      openWindow('bulletin', { subview: 'activity' });
      setFeedback(action.message || hotspot.feedback || `${hotspot.label} geopend.`);
      publishRoomState(hotspot, action.type);
      publishRoomActivity(
        hotspot,
        action.type,
        `${currentUser} bekijkt ${hotspot.label.toLowerCase()}.`
      );
      return;
    }

    if (action.type === 'prefill-chat') {
      const nextText = action.text || '';
      setHudChatMode('say');
      setHudWhisperTarget(null);
      setRoomChatInput(nextText);
      setRoomActionState({
        kind: action.type,
        title: action.title || hotspot.label,
        text: nextText,
        source: hotspot.label
      });
      openWindow('chatHistory', { subview: 'room' });
      focusChatComposer();
      setFeedback(action.message || hotspot.feedback || `${hotspot.label} heeft iets klaargezet in de room chat.`);
      publishRoomState(hotspot, action.type);
      publishRoomActivity(
        hotspot,
        action.type,
        `${currentUser} zet een roomlijn klaar bij ${hotspot.label.toLowerCase()}.`
      );
      return;
    }

    if (action.type === 'room-jump' && action.roomId) {
      const { roomId: jumpRoom, position: jumpPosition } = getSafeRoomTarget(action.roomId);
      setRoomActionState({
        kind: action.type,
        title: action.title || hotspot.label,
        text: action.text || `Je springt door naar ${getChabloRoom(jumpRoom).name}.`,
        source: hotspot.label
      });
      setFeedback(action.message || `Je gaat naar ${getChabloRoom(jumpRoom).name}.`);
      publishRoomState(hotspot, action.type);
      publishRoomActivity(
        hotspot,
        action.type,
        `${currentUser} gebruikt ${hotspot.label.toLowerCase()} richting ${getChabloRoom(jumpRoom).name}.`
      );
      changeRoom(jumpRoom, jumpPosition);
      return;
    }

    if (action.type === 'open-wardrobe') {
      openWardrobe(hotspot);
      setFeedback(action.message || hotspot.feedback || 'Wardrobe geopend.');
      publishRoomState(hotspot, action.type);
      publishRoomActivity(
        hotspot,
        action.type,
        `${currentUser} experimenteert met een nieuwe motel-look.`
      );
      return;
    }

    setRoomActionState({
      kind: action.type,
      title: action.title || hotspot.label,
      text: action.text || hotspot.description || hotspot.feedback || '',
      source: hotspot.label
    });
    openWindow('backpack', { subview: 'hotspots' });
    setFeedback(action.message || action.text || hotspot.feedback || `${hotspot.label} actief.`);
    publishRoomState(hotspot, action.type);
    publishRoomActivity(
      hotspot,
      action.type,
      `${currentUser} activeert ${hotspot.label.toLowerCase()}.`
    );
  }, [changeRoom, currentUser, focusChatComposer, getSafeRoomTarget, openWardrobe, openWindow, publishRoomActivity, publishRoomState, setFeedback, setHudChatMode, setHudWhisperTarget, setRoomActionState, setRoomChatInput]);

  const moveToHotspot = useCallback((hotspot) => {
    if (!hotspot) {
      return;
    }
    setSelectedAvatar(null);
    setSelectedHotspotId(hotspot.id);
    setRoomActionState(null);
    moveToTile(hotspot.target);
  }, [moveToTile, setRoomActionState, setSelectedAvatar, setSelectedHotspotId]);

  const handleHotspotActivate = useCallback((hotspot) => {
    if (!hotspot) {
      return;
    }

    setSelectedAvatar(null);
    setSelectedHotspotId(hotspot.id);

    if (activeHotspot?.id === hotspot.id) {
      executeHotspotAction(hotspot);
      return;
    }

    moveToHotspot(hotspot);
  }, [activeHotspot?.id, executeHotspotAction, moveToHotspot, setSelectedAvatar, setSelectedHotspotId]);

  const getHotspotButtonLabel = useCallback((hotspot, isActive) => {
    if (!isActive) {
      return hotspot.actionLabel || `Ga naar ${hotspot.label}`;
    }
    return hotspot.action?.buttonLabel || hotspot.actionLabel || `Gebruik ${hotspot.label}`;
  }, []);

  const getHotspotPresenceText = useCallback((hotspot) => {
    const visitors = hotspotPresenceById[hotspot.id] || [];
    if (!visitors.length) {
      return null;
    }
    if (visitors.length === 1) {
      return `Nu hier: ${visitors[0].username}`;
    }
    if (visitors.length === 2) {
      return `Nu hier: ${visitors[0].username} en ${visitors[1].username}`;
    }
    return `Nu hier: ${visitors[0].username}, ${visitors[1].username} +${visitors.length - 2}`;
  }, [hotspotPresenceById]);

  const getHotspotActivityText = useCallback((hotspot) => {
    const latestActivity = latestHotspotActivityById[hotspot.id];
    if (!latestActivity?.summary) {
      return null;
    }
    return `Laatste: ${latestActivity.summary}`;
  }, [latestHotspotActivityById]);

  const getHotspotStateText = useCallback((hotspot) => {
    const latestState = roomStateByHotspotId[hotspot.id];
    if (!latestState?.text) {
      return null;
    }
    return `Status: ${latestState.text}`;
  }, [roomStateByHotspotId]);

  return {
    closeWardrobe,
    executeHotspotAction,
    getHotspotActivityText,
    getHotspotButtonLabel,
    getHotspotPresenceText,
    getHotspotStateText,
    handleHotspotActivate,
    moveToHotspot,
    openWardrobe,
    randomizeWardrobeDraft,
    resetWardrobeDraft,
    saveWardrobeAppearance,
    updateWardrobeField
  };
}

export default useChabloHotspotInteractions;
