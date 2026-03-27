import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gun } from '../../../gun';
import ChabloPhaserStage from './chablo/ChabloPhaserStage';
import {
  CHABLO_ROOMS,
  DEFAULT_CHABLO_ROOM_ID,
  getChabloRoom,
  getChabloRoomSpawnPosition
} from './chablo/rooms';
import {
  normalizeRoomPosition
} from './chablo/movement';
import {
  getWhisperPairId
} from './chablo/chabloSocial';
import {
  describeParticipants,
  isPositionFresh
} from './chablo/chabloLiveStateUtils';
import ChabloAvatarContextCard from './chablo/ChabloAvatarContextCard';
import ChabloHud from './chablo/ChabloHud';
import { ChabloWindow } from './chablo/ChabloWindowChrome';
import {
  ChabloBackpackPanel,
  ChabloBulletinPanel,
  ChabloChatHistoryPanel,
  ChabloConsolePanel,
  ChabloHabmojiPanel,
  ChabloNavigatorPanel,
  ChabloPlaceholderPanel,
  ChabloWardrobePanel,
  ChabloWhisperWorkspace
} from './chablo/ChabloWindowPanels';
import { createInitialWindowState } from './chablo/chabloWindowConfig';
import { useChabloHudState } from './chablo/useChabloHudState';
import { useChabloHotspotInteractions } from './chablo/useChabloHotspotInteractions';
import { useChabloHotspotState } from './chablo/useChabloHotspotState';
import { useChabloLiveState } from './chablo/useChabloLiveState';
import { useChabloMovementController } from './chablo/useChabloMovementController';
import { useChabloPresenceSync } from './chablo/useChabloPresenceSync';
import { useChabloSocialActions } from './chablo/useChabloSocialActions';
import { useChabloSocialEffects } from './chablo/useChabloSocialEffects';
import { useChabloSocialState } from './chablo/useChabloSocialState';

const HEARTBEAT_MS = 10000;
export const DEFAULT_CHABLO_ROOMS = CHABLO_ROOMS;

function getSafeRoomTarget(roomId) {
  const nextRoom = getChabloRoom(roomId);
  return {
    roomId: nextRoom.id,
    position: getChabloRoomSpawnPosition(nextRoom.id)
  };
}

export function ChabloMotelView({
  currentUser = 'guest',
  onOpenConversation,
  gunApi = gun
}) {
  const [currentRoom, setCurrentRoom] = useState(DEFAULT_CHABLO_ROOM_ID);
  const [position, setPosition] = useState(() => getChabloRoomSpawnPosition(DEFAULT_CHABLO_ROOM_ID));
  const [activeWhisperPairId, setActiveWhisperPairId] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [roomChatInput, setRoomChatInput] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [stageEngineState, setStageEngineState] = useState('loading');
  const [emoteRenderNow, setEmoteRenderNow] = useState(() => Date.now());
  const {
    avatarButtonRef,
    avatarMenuRef,
    closeWindow,
    focusWindow,
    hudChatMode,
    hudWhisperTarget,
    isAvatarMenuOpen,
    openWindow,
    setHudChatMode,
    setHudWhisperTarget,
    setIsAvatarMenuOpen,
    setWindowSubview,
    updateWindowPosition,
    viewportRef,
    windowStateById
  } = useChabloHudState(createInitialWindowState);
  const feedbackTimerRef = useRef(null);
  const roomChatInputRef = useRef(null);
  const setFeedback = useCallback((message) => {
    setFeedbackMessage(message);
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedbackMessage('');
      feedbackTimerRef.current = null;
    }, 2200);
  }, []);
  const roomIds = useMemo(
    () => DEFAULT_CHABLO_ROOMS.map((room) => room.id),
    []
  );
  const {
    allPositions,
    applyLocalAvatarAppearance,
    applyLocalLastReadState,
    applyLocalOutgoingRelation,
    applyLocalSocialPrefs,
    avatarAppearancesByUsername,
    emoteEntriesByUsername,
    friendEntries,
    hotspotPresenceEntries,
    incomingRelationsByUsername,
    inviteEntries,
    lastReadState,
    outgoingRelationsByUsername,
    roomActivityEntries,
    roomChatMessagesByRoomId,
    roomStateEntries,
    socialPrefsByUsername,
    speechEntriesByUsername,
    typingByPairId,
    whisperMessagesByPairId
  } = useChabloLiveState({
    activeWhisperPairId,
    currentRoom,
    currentUser,
    gunApi,
    roomIds,
    selectedAvatar,
    getDefaultPosition: getChabloRoomSpawnPosition,
    normalizePosition: normalizeRoomPosition
  });

  const currentRoomMeta = useMemo(
    () => getChabloRoom(currentRoom),
    [currentRoom]
  );
  const {
    activeHotspot,
    highlightedHotspot,
    roomActionState,
    selectedHotspotId,
    setRoomActionState,
    setSelectedHotspotId,
    setWardrobeDraftAppearance,
    wardrobeDraftAppearance
  } = useChabloHotspotState({
    currentRoom,
    currentRoomMeta,
    position,
    setFeedback
  });

  const otherOccupants = useMemo(() => (
    Object.entries(allPositions)
      .filter(([username, occupant]) => (
        username !== currentUser
        && occupant?.room === currentRoom
        && isPositionFresh(occupant)
      ))
      .map(([username, occupant]) => ({
        username,
        ...normalizeRoomPosition(
          occupant?.room || currentRoom,
          occupant,
          getChabloRoomSpawnPosition(occupant?.room || currentRoom)
        )
      }))
      .sort((left, right) => left.username.localeCompare(right.username))
  ), [allPositions, currentRoom, currentUser]);

  const roomMessages = useMemo(
    () => roomChatMessagesByRoomId[currentRoom] || [],
    [currentRoom, roomChatMessagesByRoomId]
  );
  const incomingRequests = friendEntries.filter((entry) => (
    entry.status === 'pending' && entry.initiator && entry.initiator !== currentUser
  ));
  const acceptedFriends = friendEntries.filter((entry) => entry.status === 'accepted');
  const isWardrobeOpen = Boolean(windowStateById.wardrobe?.open);
  const {
    activeEmotesByUsername,
    activeSpeechByUsername,
    activeWhisperThread,
    activeWhisperTypingUsers,
    currentRoomPresence,
    currentUserPrefs,
    effectiveCurrentUserAppearance,
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
    selectedFriendship,
    socialUnreadCount,
    stageAppearanceByUsername,
    visibleAcceptedFriends,
    visiblePresenceByRoom,
    whisperThreads,
    whisperThreadsWithDraft,
    whisperUnreadCount
  } = useChabloSocialState({
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
    roomIds: DEFAULT_CHABLO_ROOMS,
    roomStateEntries,
    selectedAvatar,
    selectedHotspotId,
    socialPrefsByUsername,
    speechEntriesByUsername,
    typingByPairId,
    whisperMessagesByPairId,
    wardrobeDraftAppearance,
    isWardrobeOpen
  });
  const openWindowEntries = useMemo(() => (
    Object.values(windowStateById)
      .filter((entry) => entry.open)
      .sort((left, right) => left.zIndex - right.zIndex)
  ), [windowStateById]);

  const focusChatComposer = useCallback(() => {
    window.setTimeout(() => {
      const textarea = roomChatInputRef.current;
      if (!textarea) {
        return;
      }
      textarea.focus();
      const length = textarea.value.length;
      textarea.setSelectionRange?.(length, length);
    }, 0);
  }, []);

  useEffect(() => () => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }
  }, []);

  useEffect(() => {
    setEmoteRenderNow(Date.now());
  }, [emoteEntriesByUsername, speechEntriesByUsername]);

  useEffect(() => {
    const nextExpiry = [...Object.values(emoteEntriesByUsername), ...Object.values(speechEntriesByUsername)].reduce((soonest, entry) => {
      const expiresAt = Number(entry?.expiresAt) || 0;
      if (expiresAt <= emoteRenderNow) {
        return soonest;
      }
      return soonest ? Math.min(soonest, expiresAt) : expiresAt;
    }, 0);

    if (!nextExpiry) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setEmoteRenderNow(Date.now());
    }, Math.max(24, nextExpiry - emoteRenderNow + 24));

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [emoteEntriesByUsername, emoteRenderNow, speechEntriesByUsername]);

  useChabloPresenceSync({
    activeHotspot,
    currentRoom,
    currentUser,
    gunApi,
    heartbeatMs: HEARTBEAT_MS,
    position
  });

  useEffect(() => {
    if (selectedAvatar && !otherOccupants.find((occupant) => occupant.username === selectedAvatar)) {
      setSelectedAvatar(null);
    }
  }, [otherOccupants, selectedAvatar]);

  const applyRoomChange = useCallback((nextRoom, nextPosition) => {
    const normalizedRoom = getChabloRoom(nextRoom).id;
    if (normalizedRoom === currentRoom && !nextPosition) {
      return;
    }
    const normalizedPosition = normalizeRoomPosition(
      normalizedRoom,
      nextPosition || getChabloRoomSpawnPosition(normalizedRoom),
      getChabloRoomSpawnPosition(normalizedRoom)
    );
    if (
      normalizedRoom === currentRoom
      && normalizedPosition.x === position.x
      && normalizedPosition.y === position.y
    ) {
      return;
    }
    setCurrentRoom(normalizedRoom);
    setPosition(normalizedPosition);
    setSelectedAvatar(null);
    setSelectedHotspotId(null);
    setRoomActionState(null);
  }, [currentRoom, position.x, position.y, setRoomActionState, setSelectedHotspotId]);

  const {
    beginDirectionalMove,
    endDirectionalMove,
    moveToTile,
    cancelMovement
  } = useChabloMovementController({
    currentRoom,
    position,
    setPosition,
    changeRoom: applyRoomChange
  });

  const changeRoom = useCallback((nextRoom, nextPosition) => {
    cancelMovement();
    applyRoomChange(nextRoom, nextPosition);
  }, [applyRoomChange, cancelMovement]);
  const {
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
  } = useChabloHotspotInteractions({
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
  });
  const createDpadHandlers = useCallback((deltaX, deltaY) => ({
    onPointerDown: (event) => {
      event.preventDefault();
      beginDirectionalMove(deltaX, deltaY);
    },
    onPointerUp: endDirectionalMove,
    onPointerLeave: endDirectionalMove,
    onPointerCancel: endDirectionalMove,
    onBlur: endDirectionalMove
  }), [beginDirectionalMove, endDirectionalMove]);

  const {
    acceptFriendRequest,
    acceptInvite,
    handleFriendRequest,
    markInvitesRead,
    markRoomRead,
    markWhisperRead,
    openWhisperThread,
    publishWhisperTyping,
    rejectFriendRequest,
    rejectInvite,
    sendEmote,
    sendRoomInvite,
    setRelationState,
    submitHudChat,
    updateSocialPrefs
  } = useChabloSocialActions({
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
  });

  useChabloSocialEffects({
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
  });

  const showStageBootOverlay = stageEngineState === 'loading';
  const handleSelectAvatar = useCallback((username) => {
    setSelectedAvatar(username);
  }, []);

  const handleCloseWindow = useCallback((windowId) => {
    if (windowId === 'wardrobe') {
      closeWardrobe();
      return;
    }
    closeWindow(windowId);
  }, [closeWardrobe, closeWindow]);

  const handleOpenNavigatorRoom = useCallback((roomId) => {
    changeRoom(roomId);
    openWindow('chatHistory', { subview: 'room' });
  }, [changeRoom, openWindow]);

  const handleSelectWhisperThread = useCallback((thread) => {
    if (!thread?.pairId) {
      return;
    }
    setActiveWhisperPairId(thread.pairId);
    setHudWhisperTarget(thread.partner);
    setHudChatMode('whisper');
    markWhisperRead(thread.pairId);
  }, [markWhisperRead, setHudChatMode, setHudWhisperTarget]);

  const handleHudSayMode = useCallback(() => {
    setHudChatMode('say');
    setHudWhisperTarget(null);
    focusChatComposer();
  }, [focusChatComposer, setHudChatMode, setHudWhisperTarget]);

  const handleHudWhisperMode = useCallback((targetUsername = null) => {
    const nextTarget = targetUsername || hudWhisperTarget || activeWhisperThread?.partner || (selectedAvatarCanWhisper ? selectedAvatar : null);
    setHudChatMode('whisper');
    if (nextTarget) {
      const nextPairId = getWhisperPairId(currentUser, nextTarget);
      setHudWhisperTarget(nextTarget);
      setActiveWhisperPairId(nextPairId);
      markWhisperRead(nextPairId);
      openWindow('chatHistory', { subview: 'whispers' });
    } else {
      openWindow('console', { subview: 'whispers' });
      setFeedback('Kies eerst iemand om naar te fluisteren.');
    }
    focusChatComposer();
  }, [activeWhisperThread?.partner, currentUser, focusChatComposer, hudWhisperTarget, markWhisperRead, openWindow, selectedAvatar, selectedAvatarCanWhisper, setFeedback, setHudChatMode, setHudWhisperTarget]);

  const handleAvatarMenuAction = useCallback((item) => {
    setIsAvatarMenuOpen(false);
    if (!item) {
      return;
    }
    if (item.windowId === 'wardrobe') {
      openWardrobe();
      return;
    }
    openWindow(item.windowId, item.subview ? { subview: item.subview } : undefined);
  }, [openWardrobe, openWindow, setIsAvatarMenuOpen]);

  const handleToggleAvatarMenu = useCallback(() => {
    setIsAvatarMenuOpen((previous) => !previous);
  }, [setIsAvatarMenuOpen]);

  const handleHudLauncherOpen = useCallback((launcher) => {
    openWindow(launcher.windowId, launcher.subview ? { subview: launcher.subview } : undefined);
  }, [openWindow]);

  const renderWhisperWorkspace = (windowId) => (
    <ChabloWhisperWorkspace
      activeWhisperPairId={activeWhisperPairId}
      activeWhisperThread={activeWhisperThread}
      activeWhisperTypingUsers={activeWhisperTypingUsers}
      currentUser={currentUser}
      handleHudWhisperMode={handleHudWhisperMode}
      handleSelectWhisperThread={handleSelectWhisperThread}
      openWindow={openWindow}
      whisperThreadsWithDraft={whisperThreadsWithDraft}
      windowId={windowId}
    />
  );

  const renderWindowContent = (windowEntry) => {
    const activeSubview = windowEntry.activeSubview;
    switch (windowEntry.id) {
      case 'navigator':
        return (
          <ChabloNavigatorPanel
            currentRoom={currentRoom}
            rooms={DEFAULT_CHABLO_ROOMS}
            roomUnreadCountsById={roomUnreadCountsById}
            visiblePresenceByRoom={visiblePresenceByRoom}
            onOpenRoom={handleOpenNavigatorRoom}
          />
        );
      case 'console':
        return (
          <ChabloConsolePanel
            acceptFriendRequest={acceptFriendRequest}
            acceptInvite={acceptInvite}
            activeSubview={activeSubview}
            allPositions={allPositions}
            currentUserPrefs={currentUserPrefs}
            handleOpenNavigatorRoom={handleOpenNavigatorRoom}
            incomingRequests={incomingRequests}
            inviteUnreadCount={inviteUnreadCount}
            openWhisperThread={openWhisperThread}
            pendingInvites={pendingInvites}
            rejectFriendRequest={rejectFriendRequest}
            rejectInvite={rejectInvite}
            setWindowSubview={setWindowSubview}
            updateSocialPrefs={updateSocialPrefs}
            visibleAcceptedFriends={visibleAcceptedFriends}
            visiblePresenceByRoom={visiblePresenceByRoom}
            whisperUnreadCount={whisperUnreadCount}
            whisperWorkspace={renderWhisperWorkspace('console')}
          />
        );
      case 'chatHistory':
        return (
          <ChabloChatHistoryPanel
            activeSubview={activeSubview}
            currentRoom={currentRoom}
            roomMessages={roomMessages}
            roomUnreadCountsById={roomUnreadCountsById}
            setWindowSubview={setWindowSubview}
            whisperUnreadCount={whisperUnreadCount}
            whisperWorkspace={renderWhisperWorkspace('chatHistory')}
          />
        );
      case 'bulletin':
        return (
          <ChabloBulletinPanel
            activeSubview={activeSubview}
            roomActivityEntries={roomActivityEntries}
            roomStateEntries={roomStateEntries}
            setWindowSubview={setWindowSubview}
          />
        );
      case 'wardrobe':
        return (
          <ChabloWardrobePanel
            effectiveCurrentUserAppearance={effectiveCurrentUserAppearance}
            onRandomize={randomizeWardrobeDraft}
            onReset={resetWardrobeDraft}
            onSave={saveWardrobeAppearance}
            onUpdateField={updateWardrobeField}
          />
        );
      case 'backpack':
        return (
          <ChabloBackpackPanel
            activeHotspot={activeHotspot}
            activeSubview={activeSubview}
            currentRoomHotspots={currentRoomMeta.hotspots || []}
            executeHotspotAction={executeHotspotAction}
            getHotspotActivityText={getHotspotActivityText}
            getHotspotButtonLabel={getHotspotButtonLabel}
            getHotspotPresenceText={getHotspotPresenceText}
            getHotspotStateText={getHotspotStateText}
            handleHotspotActivate={handleHotspotActivate}
            highlightedHotspot={highlightedHotspot}
            moveToHotspot={moveToHotspot}
            roomActionState={roomActionState}
            setWindowSubview={setWindowSubview}
          />
        );
      case 'habmoji':
        return (
          <ChabloHabmojiPanel
            selectedAvatar={selectedAvatar}
            selectedAvatarCanEmote={selectedAvatarCanEmote}
            sendEmote={sendEmote}
          />
        );
      default:
        return <ChabloPlaceholderPanel title={windowEntry.title} />;
    }
  };

  return (
    <div className="chablo-page">
      {feedbackMessage ? <div className="chablo-feedback chablo-feedback--floating" role="status">{feedbackMessage}</div> : null}
      <div className="chablo-room-first">
        <section ref={viewportRef} className="chablo-room-viewport">
          <div className="chablo-room-marquee">
            <div>
              <div className="chablo-wordmark">Chablo Motel</div>
              <h2>{currentRoomMeta.name}</h2>
              <p>{currentRoomMeta.description}</p>
            </div>
            <div className="chablo-room-marquee__meta">
              <span>{position.x}, {position.y}</span>
              <strong>{otherOccupants.length + 1}</strong>
              <span>avatars in deze kamer</span>
              <span>{currentRoomPresence.count > 0 ? describeParticipants(currentRoomPresence.usernames, '') : 'Niemand zichtbaar'}</span>
            </div>
          </div>

          <div className="chablo-stage-frame chablo-stage-frame--room-first">
            {showStageBootOverlay ? (
              <div className="chablo-boot-overlay" aria-live="polite">
                <div className="chablo-boot-overlay__card">
                  <div className="chablo-boot-overlay__eyebrow">Chablo Motel</div>
                  <strong>Hotel wordt klaargezet...</strong>
                  <p>De lobbylampen warmen op, de neon springt aan en de avatars druppelen binnen.</p>
                </div>
              </div>
            ) : null}
            <ChabloPhaserStage
              activeHotspotId={highlightedHotspot?.id || null}
              activeEmotesByUsername={activeEmotesByUsername}
              activeSpeechByUsername={activeSpeechByUsername}
              appearanceByUsername={stageAppearanceByUsername}
              currentRoomMeta={currentRoomMeta}
              currentUser={currentUser}
              mutedUsernames={mutedUsernames}
              onEngineStateChange={setStageEngineState}
              onDirectionStart={beginDirectionalMove}
              onDirectionStop={endDirectionalMove}
              onHotspotActivate={handleHotspotActivate}
              onTileActivate={moveToTile}
              onSelectAvatar={handleSelectAvatar}
              otherOccupants={otherOccupants}
              position={position}
              roomStateByHotspotId={roomStateByHotspotId}
              selectedAvatar={selectedAvatar}
            />
          </div>

          {selectedAvatar && selectedAvatarPosition ? (
            <ChabloAvatarContextCard
              currentRoomName={currentRoomMeta.name}
              onClose={() => setSelectedAvatar(null)}
              onFriendRequest={handleFriendRequest}
              onOpenConversation={onOpenConversation}
              onOpenWhisper={openWhisperThread}
              onSendEmote={sendEmote}
              onSendInvite={sendRoomInvite}
              onSetRelationState={setRelationState}
              selectedAvatar={selectedAvatar}
              selectedAvatarBlocked={selectedAvatarBlocked}
              selectedAvatarCanEmote={selectedAvatarCanEmote}
              selectedAvatarCanInvite={selectedAvatarCanInvite}
              selectedAvatarCanWhisper={selectedAvatarCanWhisper}
              selectedAvatarMuted={selectedAvatarMuted}
              selectedAvatarPosition={selectedAvatarPosition}
              selectedFriendship={selectedFriendship}
            />
          ) : null}
          <div className="chablo-windows-layer">
            {openWindowEntries.map((windowEntry) => (
              <ChabloWindow key={windowEntry.id} windowId={windowEntry.id} title={windowEntry.title} state={windowEntry} viewportRef={viewportRef} onFocus={focusWindow} onClose={handleCloseWindow} onMove={updateWindowPosition}>
                {renderWindowContent(windowEntry)}
              </ChabloWindow>
            ))}
          </div>
        </section>

        <ChabloHud
          avatarButtonRef={avatarButtonRef}
          avatarMenuRef={avatarMenuRef}
          createDpadHandlers={createDpadHandlers}
          currentRoomName={currentRoomMeta.name}
          currentUser={currentUser}
          effectiveCurrentUserAppearance={effectiveCurrentUserAppearance}
          hudChatMode={hudChatMode}
          hudWhisperTarget={hudWhisperTarget}
          isAvatarMenuOpen={isAvatarMenuOpen}
          onAvatarMenuAction={handleAvatarMenuAction}
          onChatInputChange={(event) => setRoomChatInput(event.target.value)}
          onLauncherOpen={handleHudLauncherOpen}
          onSayMode={handleHudSayMode}
          onSubmitChat={submitHudChat}
          onToggleAvatarMenu={handleToggleAvatarMenu}
          onWhisperMode={handleHudWhisperMode}
          roomChatInput={roomChatInput}
          roomChatInputRef={roomChatInputRef}
          socialUnreadCount={socialUnreadCount}
          windowStateById={windowStateById}
        />
      </div>
    </div>
  );
}

export default ChabloMotelView;


