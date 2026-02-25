import React, { useEffect, useState, useReducer, useRef, useCallback } from 'react';
import { gun, user } from '../../gun';
import { getContactPairId } from '../../utils/chatUtils';
import { useWebRTC } from '../../hooks/useWebRTC';
import CallPanel from '../CallPanel';
import { encryptMessage, decryptMessage, warmupEncryption } from '../../utils/encryption';
import { useSounds } from '../../hooks/useSounds';
import { useAvatar } from '../../contexts/AvatarContext';
import { getPresenceStatus } from '../../utils/presenceUtils';
import {
  conversationReducer,
  createInitialConversationState
} from './conversation/conversationState';
import { startSessionBootstrap } from './conversation/sessionController';
import { startConversationStreams } from './conversation/streamController';
import {
  countNonLegacyMessages,
  computeVisibleTarget,
  getLoadOlderLimit,
  shouldAutoScroll,
  NEAR_BOTTOM_THRESHOLD_PX
} from './conversation/windowPolicy';
import ChatTopMenu from './conversation/ChatTopMenu';
import ChatToolbar from './conversation/ChatToolbar';
import ChatMessage from './conversation/ChatMessage';
import ChatInput from './conversation/ChatInput';
import AvatarDisplay from './conversation/AvatarDisplay';

// ============================================
// 2. HOOFDCOMPONENT
// ============================================
// Canonical runtime path:
// ConversationPane owns live session/stream lifecycle end-to-end.
// Historical split runtime hooks under ./conversation/ are intentionally retired
// to avoid divergence between test helpers and production behavior.
function ConversationPane({
  contactName,
  lastNotificationTime,
  clearNotificationTime,
  contactPresenceData,
  onOpenGamePane,
  hasOpenGamePane = false
}) {
  const { playSound } = useSounds();
  const [state, dispatch] = useReducer(conversationReducer, createInitialConversationState());
  const [messageText, setMessageText] = useState('');
  const [displayLimit, setDisplayLimit] = useState(5);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isShaking, setIsShaking] = useState(false);
  const [canNudge, setCanNudge] = useState(true);
  const [showEmoticonPicker, setShowEmoticonPicker] = useState(false);
  const [isContactTyping, setIsContactTyping] = useState(false);
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [pendingOutgoingInvite, setPendingOutgoingInvite] = useState(null);
  const [hasGameInviteLock, setHasGameInviteLock] = useState(false);
  const contactPresence = contactPresenceData ?? null;
  const computedPresence = getPresenceStatus(contactPresence);
  const { getDisplayName } = useAvatar();

  const processedGameInviteRef = useRef(new Set());
  const gameInvitesByIdRef = useRef(new Map());
  const messagesAreaRef = useRef(null);
  const emoticonPickerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastProcessedNudge = useRef(Date.now());
  const lastTypingSignal = useRef(0);
  const windowOpenTimeRef = useRef(Date.now());
  const prevMsgCountRef = useRef(0);
  const sessionInitAttemptedRef = useRef(false);
  const sessionGenerationRef = useRef(0);
  const sessionCreateTimeoutRef = useRef(null);
  const currentSessionIdRef = useRef(null);
  const boundaryRef = useRef(lastNotificationTime ? (lastNotificationTime - 2000) : (windowOpenTimeRef.current - 1000));
  const streamGenerationRef = useRef(0);
  const shakeTimeoutRef = useRef(null);
  const currentUser = user.is?.alias;
  const lastTypingSoundRef = useRef(0);
  const playSoundRef = useRef(playSound);
  const hasLoadedOlderRef = useRef(false);
  const currentUserAliasRef = useRef(currentUser);

  const {
    callState,
    isMuted,
    callDuration,
    remoteAudioRef,
    startCall,
    acceptCall,
    rejectCall,
    hangUp,
    toggleMute
  } = useWebRTC(currentUser, contactName);

  // --- Gun.js Handlers ---
  const sendMessage = useCallback(async () => {
    if (!messageText.trim() || !currentSessionId) return;
    const sender = user.is?.alias;
    const now = Date.now();
    const messageKey = `${sender}_${now}_${Math.random().toString(36).substr(2, 9)}`;

    // Encrypt content voor verzending
    const encryptedContent = await encryptMessage(messageText, contactName);

    gun.get(currentSessionId).get(messageKey).put({
      sender,
      content: encryptedContent,
      timestamp: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeRef: now
    });

    gun.get(`TYPING_${currentSessionId}`).put({ user: sender, isTyping: false, timestamp: now });
    setMessageText('');
  }, [messageText, currentSessionId, contactName]);

  const sendNudge = useCallback(() => {
    if (!canNudge || !currentSessionId) return;
    const sender = user.is?.alias;
    setCanNudge(false);
    playSound('nudge');
    const nudgeTime = Date.now();
    const nudgeKey = `${sender}_nudge_${nudgeTime}`;

    // Sla op in chat-node zodat beide partijen het zien in de geschiedenis
    gun.get(currentSessionId).get(nudgeKey).put({
      sender,
      content: '__nudge__',
      type: 'nudge',
      timestamp: new Date(nudgeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeRef: nudgeTime,
    });

    gun.get(`NUDGE_${currentSessionId}`).put({ time: nudgeTime, from: sender });
    setTimeout(() => setCanNudge(true), 5000);
  }, [canNudge, currentSessionId, playSound]);

  const sendGameInvite = useCallback((gameType = 'tictactoe') => {
    if (!currentUser || !contactName) return;
    if (hasOpenGamePane || hasGameInviteLock || incomingInvite || pendingOutgoingInvite) {
      return;
    }
    const pairId = getContactPairId(currentUser, contactName);
    const now = Date.now();
    const gameSessionId = `GAME_${pairId}_${now}`;
    const requestId = `${currentUser}_${gameType}_${now}`;
    gun.get(`GAME_INVITES_${pairId}`).get(requestId).put({
      requestId,
      inviter: currentUser,
      invitee: contactName,
      gameType,
      gameSessionId,
      createdAt: now,
      updatedAt: now,
      status: 'pending'
    });
    gun.get(`GAME_STATE_${gameSessionId}`).put({
      board: '_________',
      currentTurn: currentUser,
      winner: '',
      player1: currentUser,
      player2: contactName,
      status: 'active'
    });
    // Systeembericht in chat (zelfde patroon als nudge)
    if (currentSessionId) {
      const msgKey = `${currentUser}_gameinvite_${now}`;
      gun.get(currentSessionId).get(msgKey).put({
        sender: currentUser,
        content: '__gameinvite__',
        type: 'gameinvite',
        gameType,
        timestamp: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timeRef: now,
      });
    }
    setPendingOutgoingInvite({ requestId, gameType, gameSessionId });
  }, [currentUser, contactName, currentSessionId, hasOpenGamePane, hasGameInviteLock, incomingInvite, pendingOutgoingInvite]);

  const acceptGameInvite = useCallback(() => {
    if (!incomingInvite || !currentUser || !contactName) return;
    const pairId = getContactPairId(currentUser, contactName);
    const now = Date.now();
    gun.get(`GAME_INVITES_${pairId}`).get(incomingInvite.requestId).put({
      requestId: incomingInvite.requestId,
      inviter: incomingInvite.inviter,
      invitee: currentUser,
      gameType: incomingInvite.gameType,
      gameSessionId: incomingInvite.gameSessionId,
      createdAt: incomingInvite.timestamp || now,
      status: 'accepted',
      updatedAt: now
    });
    if (typeof onOpenGamePane === 'function') {
      onOpenGamePane(contactName, incomingInvite.gameSessionId, incomingInvite.gameType);
    }
    // Systeembericht: acceptatie
    if (currentSessionId) {
      const msgKey = `${currentUser}_gameaccept_${now}`;
      gun.get(currentSessionId).get(msgKey).put({
        sender: currentUser,
        content: '__gameaccept__',
        type: 'gameaccept',
        gameType: incomingInvite.gameType,
        timestamp: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timeRef: now,
      });
    }
    setIncomingInvite(null);
  }, [incomingInvite, currentUser, contactName, onOpenGamePane, currentSessionId]);

  const declineGameInvite = useCallback(() => {
    if (!currentUser || !contactName || !incomingInvite) return;
    const pairId = getContactPairId(currentUser, contactName);
    const now = Date.now();
    gun.get(`GAME_INVITES_${pairId}`).get(incomingInvite.requestId).put({
      requestId: incomingInvite.requestId,
      inviter: incomingInvite.inviter,
      invitee: currentUser,
      gameType: incomingInvite.gameType,
      gameSessionId: incomingInvite.gameSessionId,
      createdAt: incomingInvite.timestamp || now,
      status: 'declined',
      updatedAt: now
    });
    // Systeembericht: weigering
    if (currentSessionId && incomingInvite) {
      const msgKey = `${currentUser}_gamedecline_${now}`;
      gun.get(currentSessionId).get(msgKey).put({
        sender: currentUser,
        content: '__gamedecline__',
        type: 'gamedecline',
        gameType: incomingInvite.gameType,
        timestamp: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timeRef: now,
      });
    }
    setIncomingInvite(null);
  }, [currentUser, contactName, currentSessionId, incomingInvite]);

  const cancelGameInvite = useCallback(() => {
    if (!currentUser || !contactName || !pendingOutgoingInvite?.requestId) return;
    const pairId = getContactPairId(currentUser, contactName);
    gun.get(`GAME_INVITES_${pairId}`).get(pendingOutgoingInvite.requestId).put({
      requestId: pendingOutgoingInvite.requestId,
      inviter: currentUser,
      invitee: contactName,
      gameType: pendingOutgoingInvite.gameType,
      gameSessionId: pendingOutgoingInvite.gameSessionId,
      status: 'cancelled',
      updatedAt: Date.now()
    });
    setPendingOutgoingInvite(null);
  }, [currentUser, contactName, pendingOutgoingInvite]);

  const openGamePaneIfActive = useCallback((targetContactName, gameSessionId, gameType) => {
    if (!gameSessionId || typeof onOpenGamePane !== 'function') return;
    gun.get(`GAME_STATE_${gameSessionId}`).once((state) => {
      if (!state || state.status !== 'active') return;
      onOpenGamePane(targetContactName, gameSessionId, gameType);
    });
  }, [onOpenGamePane]);

  // --- Effects (Sessie & Listeners) ---
  useEffect(() => {
    playSoundRef.current = playSound;
  }, [playSound]);

  useEffect(() => {
    currentUserAliasRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    const sender = user.is?.alias;
    if (!sender || !contactName) return;

    return startSessionBootstrap({
      gun,
      sender,
      contactName,
      sessionGenerationRef,
      sessionInitAttemptedRef,
      sessionCreateTimeoutRef,
      currentSessionIdRef,
      onSessionResolved: (normalizedId) => {
        setCurrentSessionId((prev) => (prev === normalizedId ? prev : normalizedId));
      },
      onResetForContact: () => {
        setCurrentSessionId(null);
        dispatch({ type: 'RESET' });
        setDisplayLimit(5);
        hasLoadedOlderRef.current = false;
        prevMsgCountRef.current = 0;
        windowOpenTimeRef.current = Date.now();
        // Snapshot boundary policy:
        // lastNotificationTime is captured at conversation open/reset.
        // While the same pane remains open, we do not live-update this boundary.
        // This keeps legacy vs new split stable during an active session.
        boundaryRef.current = lastNotificationTime
          ? (lastNotificationTime - 2000)
          : (windowOpenTimeRef.current - 1000);

        if (typeof clearNotificationTime === 'function') {
          clearNotificationTime(contactName);
        }
      }
    });
  }, [contactName]);

  // Warmup encryptie bij openen conversatie
  useEffect(() => {
    if (contactName) {
      warmupEncryption(contactName);
    }
  }, [contactName]);

  // Game invite listener
  useEffect(() => {
    if (!contactName || !currentUser) return;
    processedGameInviteRef.current = new Set();
    gameInvitesByIdRef.current = new Map();

    const recomputeInviteLock = () => {
      const invites = Array.from(gameInvitesByIdRef.current.values());
      const hasPending = invites.some((invite) => invite?.status === 'pending');
      setHasGameInviteLock(hasPending);
    };

    const pairId = getContactPairId(currentUser, contactName);
    const node = gun.get(`GAME_INVITES_${pairId}`);
    const handler = node.map().on((data, requestId) => {
      if (!data || !requestId) return;

      const previous = gameInvitesByIdRef.current.get(requestId) || {};
      const merged = {
        ...previous,
        ...data,
        requestId
      };
      if (!merged.status) return;

      const createdAt = Number(merged.createdAt || 0);
      const updatedAt = Number(merged.updatedAt || createdAt || 0);
      const eventTime = updatedAt || createdAt;
      if (!eventTime) return;
      if (Date.now() - eventTime > 300000) return; // stale guard: 5 minuten

      // Gun fires .on() repeatedly per peer; dedupe by request+status+updatedAt
      const eventKey = `${requestId}_${merged.status}_${eventTime}`;
      if (processedGameInviteRef.current.has(eventKey)) return;
      processedGameInviteRef.current.add(eventKey);
      if (processedGameInviteRef.current.size > 200) {
        processedGameInviteRef.current.clear();
        processedGameInviteRef.current.add(eventKey);
      }

      gameInvitesByIdRef.current.set(requestId, {
        requestId,
        inviter: merged.inviter,
        invitee: merged.invitee,
        gameType: merged.gameType,
        gameSessionId: merged.gameSessionId,
        status: merged.status,
        createdAt,
        updatedAt: eventTime
      });
      recomputeInviteLock();

      if (merged.inviter === currentUser) {
        // Eigen uitnodiging: status update van de andere kant
        if (merged.status === 'accepted') {
          setPendingOutgoingInvite(null);
          openGamePaneIfActive(contactName, merged.gameSessionId, merged.gameType);
        } else if (merged.status === 'declined' || merged.status === 'cancelled') {
          setPendingOutgoingInvite(null);
        }
      } else {
        // Inkomende uitnodiging van contact
        if (merged.status === 'pending') {
          setIncomingInvite({
            requestId,
            inviter: merged.inviter,
            gameType: merged.gameType,
            gameSessionId: merged.gameSessionId,
            timestamp: eventTime
          });
        } else {
          setIncomingInvite(null);
        }
      }
    });
    return () => {
      handler?.off?.();
      gameInvitesByIdRef.current.clear();
      setHasGameInviteLock(false);
    };
  }, [contactName, currentUser, openGamePaneIfActive]);

  useEffect(() => {
    if (!currentSessionId) return;

    return startConversationStreams({
      gun,
      currentSessionId,
      contactName,
      boundaryRef,
      streamGenerationRef,
      lastProcessedNudgeRef: lastProcessedNudge,
      shakeTimeoutRef,
      typingTimeoutRef,
      playSoundRef,
      onMessage: (message) => {
        dispatch({ type: 'UPSERT_MESSAGE', payload: message });
      },
      onShakeChange: setIsShaking,
      onTypingChange: setIsContactTyping,
      decryptMessage,
      currentUserAliasRef
    });
  }, [currentSessionId, contactName]);

  // Scroll effect
  useEffect(() => {
    const messagesNode = messagesAreaRef.current;
    const wasNearBottom = messagesNode
      ? ((messagesNode.scrollHeight - messagesNode.scrollTop - messagesNode.clientHeight) <= NEAR_BOTTOM_THRESHOLD_PX)
      : true;

    if (state.messages.length > prevMsgCountRef.current) {
      // Keep window predictable: always 5 legacy + all non-legacy messages.
      // This prevents double-count growth during async/batched hydration.
      const nonLegacyCount = countNonLegacyMessages(state.messages);
      const visibleTarget = computeVisibleTarget(state.messages.length, nonLegacyCount);
      if (visibleTarget > displayLimit) {
        setDisplayLimit(visibleTarget);
      }
    }

    if (state.messages.length < prevMsgCountRef.current) {
      hasLoadedOlderRef.current = false;
    }

    prevMsgCountRef.current = state.messages.length;

    if (!messagesNode) return;
    if (shouldAutoScroll({ wasNearBottom, hasLoadedOlder: hasLoadedOlderRef.current })) {
      messagesNode.scrollTop = messagesNode.scrollHeight;
    }
  }, [state.messages]);

  return (
    <div className={`chat-conversation ${isShaking ? 'chat-input-tool--nudge-active' : ''}`}>
      <ChatTopMenu />
      <ChatToolbar
        onNudge={sendNudge}
        canNudge={canNudge}
        onStartCall={startCall}
        callState={callState}
        onOpenGames={sendGameInvite}
        hasPendingGameInvite={Boolean(hasOpenGamePane || pendingOutgoingInvite || incomingInvite || hasGameInviteLock)}
      />
      <CallPanel
        callState={callState}
        contactName={contactName}
        isMuted={isMuted}
        callDuration={callDuration}
        onAccept={() => {
          const callNode = gun.get('CALLS').get(getContactPairId(currentUser, contactName));
          callNode.once((data) => {
            if (data && data.sdp) acceptCall(data.sdp);
          });
        }}
        onReject={rejectCall}
        onHangUp={hangUp}
        onToggleMute={toggleMute}
        remoteAudioRef={remoteAudioRef}
      />
      <div className="chat-chat-container">
        <div className="chat-left-column">
          <div className="chat-contact-header">
            <span className="chat-contact-header-from">Naar:</span>
            <div className="chat-contact-header-right">
              <div className="chat-contact-header-name-row">
                <span className="chat-contact-header-name">{getDisplayName(contactName)}</span>
                <span className="chat-contact-header-status-dot" style={{ backgroundColor: computedPresence.color }} />
                <span className="chat-contact-header-status-label">{computedPresence.label}</span>
              </div>
              {contactPresence?.personalMessage && (
                <div className="chat-contact-header-msg">{contactPresence.personalMessage}</div>
              )}
            </div>
          </div>
          {incomingInvite && (
            <div className="game-invite-bar">
              <span>{'\u{1F3B2}'} {getDisplayName(contactName)} wil Tic Tac Toe spelen</span>
              <button onClick={acceptGameInvite}>Accepteren</button>
              <button onClick={declineGameInvite}>Weigeren</button>
            </div>
          )}
          {pendingOutgoingInvite && (
            <div className="game-invite-bar game-invite-bar--pending">
              <span>{'\u{1F3B2}'} Wachten op reactie van {getDisplayName(contactName)}...</span>
              <button onClick={cancelGameInvite}>Annuleren</button>
            </div>
          )}
          <div className="chat-messages-display" ref={messagesAreaRef}>
            {state.messages.length > displayLimit && (
              <button className="load-more-btn" onClick={() => {
                hasLoadedOlderRef.current = true;
                setDisplayLimit((p) => getLoadOlderLimit(p));
              }}>
                --- Laad oudere berichten ({state.messages.length - displayLimit} resterend) ---
              </button>
            )}
            {state.messages.slice(-displayLimit).map((msg, i, arr) => (
              <ChatMessage key={msg.id} msg={msg} prevMsg={arr[i - 1]} currentUser={user.is?.alias} />
            ))}
          </div>
          <div className="typing-indicator-bar">
            {isContactTyping && <em>{getDisplayName(contactName)} is aan het typen...</em>}
          </div>
          <ChatInput
            value={messageText}
            onChange={(val) => {
              // Play typing sound on new character
              if (val.length > messageText.length) {
                const now = Date.now();
                if (now - lastTypingSoundRef.current > 100) {
                  playSound('typing');
                  lastTypingSoundRef.current = now;
                }
              }

              setMessageText(val);
              if (!currentSessionId) return;
              const now = Date.now();
              if (now - lastTypingSignal.current > 1000) {
                gun.get(`TYPING_${currentSessionId}`).put({ user: user.is?.alias, isTyping: val.length > 0, timestamp: now });
                lastTypingSignal.current = now;
              }
            }}
            onSend={sendMessage}
            onNudge={sendNudge}
            canNudge={canNudge}
            showPicker={showEmoticonPicker}
            setShowPicker={setShowEmoticonPicker}
            pickerRef={emoticonPickerRef}
            insertEmoticon={(emo) => setMessageText((prev) => prev + emo + ' ')}
            isSessionReady={Boolean(currentSessionId)}
          />
        </div>

        <div className="chat-right-column">
          <AvatarDisplay name={contactName} />
          <AvatarDisplay name={user.is?.alias} isSelf />
        </div>
      </div>
    </div>
  );
}

export default ConversationPane;

