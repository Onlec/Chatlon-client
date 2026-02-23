import React, { useEffect, useState, useReducer, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { gun, user } from '../../gun';
import { convertEmoticons, getEmoticonCategories } from '../../utils/emoticons';
import { getContactPairId } from '../../utils/chatUtils';
import { useWebRTC } from '../../hooks/useWebRTC';
import CallPanel from '../CallPanel';
import { encryptMessage, decryptMessage, warmupEncryption } from '../../utils/encryption';
import { useSounds } from '../../hooks/useSounds';
import { useAvatar } from '../../contexts/AvatarContext';

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
// 1. REDUCER (Berichten logica)
// ============================================
const reducer = (state, action) => {
  if (action.type === 'RESET') return { messages: [], messageMap: {} };
  const messageId = (typeof action.id === 'string' || typeof action.id === 'number')
    ? String(action.id)
    : '';
  if (!messageId || state.messageMap[messageId]) return state;

  const normalizedMessage = {
    ...action,
    id: messageId,
    timeRef: Number(action.timeRef) || Date.now()
  };

  const newMessageMap = { ...state.messageMap, [messageId]: normalizedMessage };
  const sortedMessages = Object.values(newMessageMap).sort((a, b) => {
    const delta = Number(a.timeRef || 0) - Number(b.timeRef || 0);
    if (delta !== 0) return delta;
    return String(a.id).localeCompare(String(b.id));
  });
  return { messageMap: newMessageMap, messages: sortedMessages };
};

// ============================================
// 2. HOOFDCOMPONENT
// ============================================
function ConversationPane({ contactName, lastNotificationTime, clearNotificationTime, contactPresenceData }) {
  const { playSound } = useSounds();
  const [state, dispatch] = useReducer(reducer, { messages: [], messageMap: {} });
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
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    const sender = user.is?.alias;
    if (!sender || !contactName) return;
    const sessionGeneration = sessionGenerationRef.current + 1;
    sessionGenerationRef.current = sessionGeneration;

    const pairId = getContactPairId(sender, contactName);
    const sessionRef = gun.get('ACTIVE_SESSIONS').get(pairId);
    const sessionIdNode = sessionRef.get('sessionId');

    sessionInitAttemptedRef.current = false;
    currentSessionIdRef.current = null;
    setCurrentSessionId(null);
    dispatch({ type: 'RESET' });
    setDisplayLimit(5);
    prevMsgCountRef.current = 0;
    windowOpenTimeRef.current = Date.now();
    boundaryRef.current = lastNotificationTime
      ? (lastNotificationTime - 2000)
      : (windowOpenTimeRef.current - 1000);

    if (typeof clearNotificationTime === 'function') {
      clearNotificationTime(contactName);
    }

    const applySessionId = (id) => {
      if (sessionGenerationRef.current !== sessionGeneration) return;
      const normalizedId = typeof id === 'string' && id.trim() ? id : null;

      if (normalizedId) {
        if (sessionCreateTimeoutRef.current) {
          clearTimeout(sessionCreateTimeoutRef.current);
          sessionCreateTimeoutRef.current = null;
        }
        sessionInitAttemptedRef.current = true;
        currentSessionIdRef.current = normalizedId;
        setCurrentSessionId((prev) => (prev === normalizedId ? prev : normalizedId));
        return;
      }

      if (sessionInitAttemptedRef.current || sessionCreateTimeoutRef.current) return;
      sessionInitAttemptedRef.current = true;

      // Gun can emit transient null before a real value arrives.
      // Delay creation briefly and cancel if a valid session appears.
      sessionCreateTimeoutRef.current = setTimeout(() => {
        sessionCreateTimeoutRef.current = null;
        if (sessionGenerationRef.current !== sessionGeneration) return;
        if (currentSessionIdRef.current) return;

        // Confirm with a fresh read before creating a new session ID.
        sessionIdNode.once((latestId) => {
          if (sessionGenerationRef.current !== sessionGeneration) return;
          const normalizedLatestId = typeof latestId === 'string' && latestId.trim()
            ? latestId.trim()
            : null;

          if (normalizedLatestId) {
            currentSessionIdRef.current = normalizedLatestId;
            setCurrentSessionId((prev) => (prev === normalizedLatestId ? prev : normalizedLatestId));
            return;
          }

          const newId = `CHAT_${pairId}_${Date.now()}`;
          currentSessionIdRef.current = newId;
          setCurrentSessionId(newId);
          sessionRef.put({ sessionId: newId, lastActivity: Date.now() });
        });
      }, 800);
    };

    const sessionSubscription = sessionIdNode.on(applySessionId);
    // Ensure first-load initialization for brand new pairs where `.on` can lag.
    sessionIdNode.once(applySessionId);

    return () => {
      sessionGenerationRef.current += 1;
      if (sessionSubscription && typeof sessionSubscription.off === 'function') {
        sessionSubscription.off();
      }
      sessionInitAttemptedRef.current = false;
      if (sessionCreateTimeoutRef.current) {
        clearTimeout(sessionCreateTimeoutRef.current);
        sessionCreateTimeoutRef.current = null;
      }
    };
  }, [contactName]);

  // Warmup encryptie bij openen conversatie
  useEffect(() => {
    if (contactName) {
      warmupEncryption(contactName);
    }
  }, [contactName]);

  useEffect(() => {
    if (!currentSessionId) return;

    const streamGeneration = streamGenerationRef.current + 1;
    streamGenerationRef.current = streamGeneration;

    const chatNode = gun.get(currentSessionId);
    const nudgeNode = gun.get(`NUDGE_${currentSessionId}`);
    const typingNode = gun.get(`TYPING_${currentSessionId}`);

    const chatSubscription = chatNode.map().on(async (data, id) => {
      if (!data?.sender) return;
      const boundary = boundaryRef.current;

      if (data.type === 'nudge') {
        if (streamGenerationRef.current !== streamGeneration) return;
        dispatch({ ...data, content: '', id, isLegacy: data.timeRef < boundary });
        return;
      }

      if (!data?.content || data.content === '__nudge__') return;
      if (streamGenerationRef.current !== streamGeneration) return;
      const decryptContact = data.sender === user.is?.alias ? contactName : data.sender;
      const decryptedContent = await decryptMessage(data.content, decryptContact);

      if (streamGenerationRef.current !== streamGeneration) return;
      dispatch({ ...data, content: decryptedContent, id, isLegacy: data.timeRef < boundary });
    });

    const nudgeSubscription = nudgeNode.on((data) => {
      if (streamGenerationRef.current !== streamGeneration) return;
      if (data?.time > lastProcessedNudge.current && data.from === contactName) {
        lastProcessedNudge.current = data.time;
        playSoundRef.current?.('nudge');
        if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
        setIsShaking(true);
        shakeTimeoutRef.current = setTimeout(() => {
          if (streamGenerationRef.current !== streamGeneration) return;
          setIsShaking(false);
          shakeTimeoutRef.current = null;
        }, 600);
      }
    });

    const typingSubscription = typingNode.on((data) => {
      if (streamGenerationRef.current !== streamGeneration) return;
      if (data && data.isTyping && data.user === contactName) {
        const now = Date.now();
        if (now - data.timestamp < 4000) {
          setIsContactTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            if (streamGenerationRef.current !== streamGeneration) return;
            setIsContactTyping(false);
            typingTimeoutRef.current = null;
          }, 3000);
        }
      } else if (data && !data.isTyping && data.user === contactName) {
        setIsContactTyping(false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    });

    return () => {
      streamGenerationRef.current += 1;
      if (chatSubscription && typeof chatSubscription.off === 'function') {
        chatSubscription.off();
      }
      if (nudgeSubscription && typeof nudgeSubscription.off === 'function') {
        nudgeSubscription.off();
      }
      if (typingSubscription && typeof typingSubscription.off === 'function') {
        typingSubscription.off();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (shakeTimeoutRef.current) {
        clearTimeout(shakeTimeoutRef.current);
        shakeTimeoutRef.current = null;
      }
    };
  }, [currentSessionId, contactName]);

  // Scroll effect
  useEffect(() => {
    if (state.messages.length > prevMsgCountRef.current && prevMsgCountRef.current !== 0) {
      const latestMsg = state.messages[state.messages.length - 1];
      if (latestMsg && !latestMsg.isLegacy) {
        setDisplayLimit((prev) => prev + 1);
      }
    }
    prevMsgCountRef.current = state.messages.length;
    if (messagesAreaRef.current) messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
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
              <button className="load-more-btn" onClick={() => setDisplayLimit((p) => p + 25)}>
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

// ============================================
// 3. SUB-COMPONENTEN (Gedefinieerd voor gebruik)
// ============================================

function ChatTopMenu() {
  return (
    <div className="chat-menubar">
      {['Bestand', 'Bewerken', 'Acties', 'Extra', 'Help'].map((m) => <span key={m} className="chat-menu-item">{m}</span>)}
    </div>
  );
}

function ChatToolbar({ onNudge, canNudge, onStartCall, callState }) {
  const tools = [
    { icon: '👥', label: 'Uitnodigen' },
    { icon: '📎', label: 'Bestand' },
    { icon: '🎥', label: 'Video' },
    { icon: '🎤', label: 'Spraak', onClick: onStartCall, disabled: callState !== 'idle' },
    { icon: '🎮', label: 'Activiteiten' },
    { icon: '🎲', label: 'Spelletjes' }
  ];
  return (
    <div className="chat-toolbar">
      {tools.map((t) => (
        <button
          key={t.label}
          className={`chat-toolbar-btn ${t.disabled ? 'disabled' : ''}`}
          onClick={t.onClick || undefined}
          disabled={t.disabled}
        >
          <span className="chat-toolbar-icon">{t.icon}</span>
          <span className="chat-toolbar-label">{t.label}</span>
        </button>
      ))}
      <div className="chat-toolbar-separator"></div>
      <button className="chat-toolbar-btn">🚫</button>
      <button className="chat-toolbar-btn">🖌️</button>
    </div>
  );
}

function ChatMessage({ msg, prevMsg, currentUser }) {
  const { getDisplayName } = useAvatar();
  const isFirstNew = prevMsg?.isLegacy && !msg.isLegacy;

  // Systeembericht (nudge melding) — opgeslagen in chat-node met type: 'nudge'
  if (msg.type === 'nudge') {
    const isSelf = msg.sender === currentUser;
    const name = getDisplayName(msg.sender);
    return (
      <>
        {isFirstNew && <div className="history-divider"><span>Laatst verzonden berichten</span></div>}
        <div className="chat-message-system">
          ⚡ {isSelf ? 'Je hebt een nudge gestuurd.' : <><strong>{name}</strong> heeft een nudge gestuurd.</>}
        </div>
      </>
    );
  }

  const selfClass = msg.sender === currentUser ? 'self' : 'contact';
  return (
    <>
      {isFirstNew && <div className="history-divider"><span>Laatst verzonden berichten</span></div>}
      <div className={`chat-message ${msg.isLegacy ? 'legacy' : ''} ${selfClass}`}>
        <div className="message-header"><strong>{getDisplayName(msg.sender)}</strong> zegt ({msg.timestamp}):</div>
        <div className="message-content">{convertEmoticons(msg.content)}</div>
      </div>
    </>
  );
}

function ChatInput({ value, onChange, onSend, onNudge, canNudge, showPicker, setShowPicker, pickerRef, insertEmoticon, isSessionReady }) {
  const emojiBtn = useRef(null);
  const [pickerPos, setPickerPos] = useState({ bottom: 0, left: 0 });

  const handleTogglePicker = () => {
    if (!showPicker && emojiBtn.current) {
      const rect = emojiBtn.current.getBoundingClientRect();
      setPickerPos({ bottom: window.innerHeight - rect.top + 4, left: rect.left });
    }
    setShowPicker(!showPicker);
  };

  return (
    <div className="chat-input-container">
      <div className="chat-input-toolbar">
        <button ref={emojiBtn} className="chat-input-tool" onClick={handleTogglePicker}>😊</button>
        {showPicker && ReactDOM.createPortal(
          <div
            className="emoticon-picker"
            ref={pickerRef}
            style={{ position: 'fixed', bottom: pickerPos.bottom, left: pickerPos.left }}
          >
            {Object.entries(getEmoticonCategories()).map(([cat, emos]) => (
              <div key={cat} className="emoticon-category">
                <div className="emoticon-grid">
                  {emos.map((e) => <button key={e.text} onClick={() => { insertEmoticon(e.text); setShowPicker(false); }}>{e.emoji}</button>)}
                </div>
              </div>
            ))}
          </div>,
          document.body
        )}
        <button className="chat-input-tool" onClick={onNudge} disabled={!canNudge}>⚡</button>
      </div>
      <div className="chat-input-body">
        <textarea
          className="chat-input-text"
          value={value}
          disabled={!isSessionReady}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        />
        <button className="chat-send-btn" onClick={onSend} disabled={!isSessionReady}>Verzenden</button>
      </div>
    </div>
  );
}

function AvatarDisplay({ name, isSelf }) {
  const { getAvatar } = useAvatar();
  return (
    <div className="chat-avatar-container" style={isSelf ? { marginTop: 'auto' } : {}}>
      <img src={getAvatar(name)} alt={name} className="chat-display-picture" />
    </div>
  );
}

export default ConversationPane;

