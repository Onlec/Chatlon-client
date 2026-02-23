import React, { useEffect, useState, useReducer, useRef, useCallback } from 'react';
import { gun, user } from '../../gun';
import { getContactPairId } from '../../utils/chatUtils';
import { useWebRTC } from '../../hooks/useWebRTC';
import CallPanel from '../CallPanel';
import { encryptMessage, decryptMessage, warmupEncryption } from '../../utils/encryption';
import { useSounds } from '../../hooks/useSounds';
import { useAvatar } from '../../contexts/AvatarContext';
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
// 0. PRESENCE HELPER
// ============================================
const PRESENCE_MAP = {
  online:  { color: '#00A400', label: 'Online' },
  away:    { color: '#FFAA00', label: 'Afwezig' },
  busy:    { color: '#CC0000', label: 'Bezet' },
  offline: { color: '#8C8C8C', label: 'Offline' },
};

function getPresence(raw) {
  return PRESENCE_MAP[raw?.status] || PRESENCE_MAP.offline;
}

// ============================================
// 2. HOOFDCOMPONENT
// ============================================
// Canonical runtime path:
// ConversationPane owns live session/stream lifecycle end-to-end.
// Historical split runtime hooks under ./conversation/ are intentionally retired
// to avoid divergence between test helpers and production behavior.
function ConversationPane({ contactName, lastNotificationTime, clearNotificationTime, contactPresenceData }) {
  const { playSound } = useSounds();
  const [state, dispatch] = useReducer(conversationReducer, createInitialConversationState());
  const [messageText, setMessageText] = useState('');
  const [displayLimit, setDisplayLimit] = useState(5);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isShaking, setIsShaking] = useState(false);
  const [canNudge, setCanNudge] = useState(true);
  const [showEmoticonPicker, setShowEmoticonPicker] = useState(false);
  const [isContactTyping, setIsContactTyping] = useState(false);
  const contactPresence = contactPresenceData ?? null;
  const { getDisplayName } = useAvatar();

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
    <div className={`chat-conversation ${isShaking ? 'nudge-active' : ''}`}>
      <ChatTopMenu />
      <ChatToolbar onNudge={sendNudge} canNudge={canNudge} onStartCall={startCall} callState={callState} />
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
                <span className="chat-contact-header-status-dot" style={{ backgroundColor: getPresence(contactPresence).color }} />
                <span className="chat-contact-header-status-label">{getPresence(contactPresence).label}</span>
              </div>
              {contactPresence?.personalMessage && (
                <div className="chat-contact-header-msg">{contactPresence.personalMessage}</div>
              )}
            </div>
          </div>
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

