import React, { useEffect, useState, useReducer, useRef, useCallback } from 'react';
import { gun, user } from './gun';
import { convertEmoticons, getEmoticonCategories } from './emoticons';
import { getContactPairId } from './utils/chatUtils';
import { log } from './utils/debug';
import { createListenerManager } from './utils/gunListenerManager';
import { useWebRTC } from './hooks/useWebRTC';
import CallPanel from './components/CallPanel';
import { encryptMessage, decryptMessage, warmupEncryption } from './utils/encryption';

// ============================================
// 1. REDUCER (Berichten logica)
// ============================================
const reducer = (state, action) => {
  if (action.type === 'RESET') return { messages: [], messageMap: {} };
  if (state.messageMap[action.id]) return state;

  const newMessageMap = { ...state.messageMap, [action.id]: action };
  const sortedMessages = Object.values(newMessageMap).sort((a, b) => a.timeRef - b.timeRef);
  return { messageMap: newMessageMap, messages: sortedMessages };
};

// ============================================
// 2. HOOFDCOMPONENT
// ============================================
function ConversationPane({ contactName, lastNotificationTime, clearNotificationTime }) {
  const [state, dispatch] = useReducer(reducer, { messages: [], messageMap: {} });
  const [messageText, setMessageText] = useState('');
  const [displayLimit, setDisplayLimit] = useState(5);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isShaking, setIsShaking] = useState(false);
  const [canNudge, setCanNudge] = useState(true);
  const [showEmoticonPicker, setShowEmoticonPicker] = useState(false);
  const [isContactTyping, setIsContactTyping] = useState(false);

  const messagesAreaRef = useRef(null);
  const emoticonPickerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastProcessedNudge = useRef(Date.now());
  const lastTypingSignal = useRef(0);
  const windowOpenTimeRef = useRef(Date.now());
  const prevMsgCountRef = useRef(0);
  const chatListenersRef = useRef(createListenerManager());
  const currentUser = user.is?.alias;
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
    const currentUser = user.is?.alias;
    const now = Date.now();
    const messageKey = `${currentUser}_${now}_${Math.random().toString(36).substr(2, 9)}`;

    // Encrypt content voor verzending
    const encryptedContent = await encryptMessage(messageText, contactName);

    gun.get(currentSessionId).get(messageKey).put({
      sender: currentUser,
      content: encryptedContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeRef: now
    });
    
    gun.get(`TYPING_${currentSessionId}`).put({ user: currentUser, isTyping: false, timestamp: now });
    setMessageText('');
  }, [messageText, currentSessionId, contactName]);

  const sendNudge = useCallback(() => {
    if (!canNudge || !currentSessionId) return;
    setCanNudge(false);
    gun.get(`NUDGE_${currentSessionId}`).put({ time: Date.now(), from: user.is?.alias });
    setTimeout(() => setCanNudge(true), 5000);
  }, [canNudge, currentSessionId]);

  // --- Effects (Sessie & Listeners) ---
  useEffect(() => {
    const currentUser = user.is?.alias;
    if (!currentUser || !contactName) return;
    const pairId = getContactPairId(currentUser, contactName);
    const sessionRef = gun.get('ACTIVE_SESSIONS').get(pairId);

    sessionRef.get('sessionId').once((id) => {
      if (id) {
        setCurrentSessionId(id);
      } else {
        const newId = `CHAT_${pairId}_${Date.now()}`;
        sessionRef.put({ sessionId: newId, lastActivity: Date.now() });
        setCurrentSessionId(newId);
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

    const chatNode = gun.get(currentSessionId);
    const nudgeNode = gun.get(`NUDGE_${currentSessionId}`);
    const typingNode = gun.get(`TYPING_${currentSessionId}`);

    chatNode.map().on(async (data, id) => {
      if (!data?.content) return;
      const boundary = lastNotificationTime ? (lastNotificationTime - 2000) : (windowOpenTimeRef.current - 1000);

      // Decrypt content — de afzender is het contact OF wijzelf
      const decryptContact = data.sender === user.is?.alias ? contactName : data.sender;
      const decryptedContent = await decryptMessage(data.content, decryptContact);

      dispatch({ ...data, content: decryptedContent, id, isLegacy: data.timeRef < boundary });
    });

    nudgeNode.on(data => {
      if (data?.time > lastProcessedNudge.current && data.from === contactName) {
        lastProcessedNudge.current = data.time;
        new Audio('/nudge.mp3').play().catch(() => {});
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 600);
      }
    });

  typingNode.on((data) => {
      if (data && data.isTyping && data.user === contactName) {
        const now = Date.now();
        if (now - data.timestamp < 4000) {
          setIsContactTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsContactTyping(false);
          }, 3000);
        }
      } else if (data && !data.isTyping && data.user === contactName) {
        setIsContactTyping(false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    });
    //chatListenersRef.current.add('chat', chatNode);
    chatListenersRef.current.add('nudge', nudgeNode);
    chatListenersRef.current.add('typing', typingNode);

    return () => { chatListenersRef.current.cleanup(); };
  }, [currentSessionId, contactName, lastNotificationTime]);

  // Scroll effect
  useEffect(() => {
    if (state.messages.length > prevMsgCountRef.current && prevMsgCountRef.current !== 0) {
      setDisplayLimit(prev => prev + 1);
    }
    prevMsgCountRef.current = state.messages.length;
    if (messagesAreaRef.current) messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
  }, [state.messages]);

  return (
    <div className={`chat-conversation ${isShaking ? 'nudge-active' : ''}`}>
      <ChatTopMenu />
        <ChatToolbar onNudge={sendNudge} canNudge={canNudge} onStartCall={startCall} callState={callState} />      <CallPanel
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
          <div className="chat-messages-display" ref={messagesAreaRef}>
            {state.messages.length > displayLimit && (
              <button className="load-more-btn" onClick={() => setDisplayLimit(p => p + 25)}>
                --- Laad oudere berichten ({state.messages.length - displayLimit} resterend) ---
              </button>
            )}
            {state.messages.slice(-displayLimit).map((msg, i, arr) => (
              <ChatMessage key={msg.id} msg={msg} prevMsg={arr[i-1]} />
            ))}
          </div>
          <div className="typing-indicator-bar">
            {isContactTyping && <em>{contactName} is aan het typen...</em>}
          </div>
          <ChatInput 
            value={messageText}
            onChange={(val) => {
              setMessageText(val);
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
            insertEmoticon={(emo) => setMessageText(prev => prev + emo + ' ')}
          />
        </div>

        <div className="chat-right-column">
          <AvatarDisplay label="Contact" name={contactName} />
          <AvatarDisplay label="Jij" name={user.is?.alias} isSelf />
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
      {['Bestand', 'Bewerken', 'Acties', 'Extra', 'Help'].map(m => <span key={m} className="chat-menu-item">{m}</span>)}
    </div>
  );
}

function ChatToolbar({ onNudge, canNudge, onStartCall, callState }) {  const tools = [
    { icon: '👥', label: 'Uitnodigen' },
    { icon: '📎', label: 'Bestand' },
    { icon: '🎥', label: 'Video' },
    { icon: '🎤', label: 'Spraak', onClick: onStartCall, disabled: callState !== 'idle' },
    { icon: '🎮', label: 'Activiteiten' },
    { icon: '🎲', label: 'Spelletjes' }
  ];
  return (
    <div className="chat-toolbar">
      {tools.map(t => (
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

function ChatMessage({ msg, prevMsg }) {
  const isFirstNew = prevMsg?.isLegacy && !msg.isLegacy;
  return (
    <>
      {isFirstNew && <div className="history-divider"><span>Laatst verzonden berichten</span></div>}
      <div className={`chat-message ${msg.isLegacy ? 'legacy' : ''}`}>
        <div className="message-header"><strong>{msg.sender}</strong> says ({msg.timestamp}):</div>
        <div className="message-content">{convertEmoticons(msg.content)}</div>
      </div>
    </>
  );
}

function ChatInput({ value, onChange, onSend, onNudge, canNudge, showPicker, setShowPicker, pickerRef, insertEmoticon }) {
  return (
    <div className="chat-input-container">
      <div className="chat-input-toolbar">
        <button className="chat-input-tool" onClick={() => setShowPicker(!showPicker)}>😊</button>
        {showPicker && (
          <div className="emoticon-picker" ref={pickerRef}>
            {Object.entries(getEmoticonCategories()).map(([cat, emos]) => (
              <div key={cat} className="emoticon-category">
                <div className="emoticon-grid">
                  {emos.map(e => <button key={e.text} onClick={() => { insertEmoticon(e.text); setShowPicker(false); }}>{e.emoji}</button>)}
                </div>
              </div>
            ))}
          </div>
        )}
        <button className="chat-input-tool" onClick={onNudge} disabled={!canNudge}>⚡</button>
      </div>
      <textarea 
        className="chat-input-text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
      />
    </div>
  );
}

function AvatarDisplay({ label, name, isSelf }) {
  return (
    <div className="chat-avatar-container" style={isSelf ? { marginTop: 'auto' } : {}}>
      <div className="chat-avatar-label">{label}:</div>
      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`} alt={name} className="chat-display-picture" />
    </div>
  );
}

export default ConversationPane;