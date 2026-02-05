import React, { useEffect, useState, useReducer, useRef } from 'react';
import { gun, user } from './gun';
import { convertEmoticons, getEmoticonCategories } from './emoticons';
import { getContactPairId } from './utils/chatUtils';

const reducer = (state, action) => {
  if (action.type === 'RESET') {
    return { messages: [], messageMap: {} };
  }
  
  const message = action;
  if (state.messageMap[message.id]) return state;
  const newMessageMap = { ...state.messageMap, [message.id]: message };
  const sortedMessages = Object.values(newMessageMap).sort((a, b) => a.timeRef - b.timeRef);
  return { messageMap: newMessageMap, messages: sortedMessages };
};

function ConversationPane({ contactName }) {
  const [messageText, setMessageText] = useState('');
  const [state, dispatch] = useReducer(reducer, { messages: [], messageMap: {} });
  const messagesAreaRef = useRef(null);
  const lastProcessedNudge = useRef(Date.now());
  const [isShaking, setIsShaking] = useState(false);
  const [canNudge, setCanNudge] = useState(true);
  const [username, setUsername] = useState('');
  const [showEmoticonPicker, setShowEmoticonPicker] = useState(false);
  const emoticonPickerRef = useRef(null);
  const [isContactTyping, setIsContactTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const lastTypingSignal = useRef(0);
  
  // Sessie tracking
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const sessionStartTimeRef = useRef(null);
  const chatListenerRef = useRef(null);
  const sessionListenerRef = useRef(null);
  const hasInitializedRef = useRef(false);

  // Hoofdeffect: Sessie initialisatie - OPTIE A: Simpele "oudste wint" logica
  useEffect(() => {
    if (user.is) {
      setUsername(user.is.alias);
    }

    const currentUser = user.is?.alias;
    if (!currentUser) return;

    // Guard tegen dubbele initialisatie (React Strict Mode)
    if (hasInitializedRef.current) {
      console.log('[ConversationPane] Already initialized, skipping');
      return;
    }
    hasInitializedRef.current = true;

    const pairId = getContactPairId(currentUser, contactName);
    const now = Date.now();
    const mySessionId = `CHAT_${pairId}_${now}`;
    
    console.log('[ConversationPane] Opening chat with:', contactName);
    console.log('[ConversationPane] My proposed session:', mySessionId);

    // Reset messages - altijd schone lei bij openen
    dispatch({ type: 'RESET' });

    // Check bestaande sessie en bepaal welke wint (oudste)
    gun.get('ACTIVE_SESSIONS').get(pairId).once((existingSession) => {
      console.log('[ConversationPane] Existing session check:', existingSession);
      
      if (existingSession && existingSession.sessionId) {
        const existingTimestamp = parseInt(existingSession.sessionId.split('_').pop()) || 0;
        
        console.log('[ConversationPane] Comparing timestamps:', {
          existing: existingTimestamp,
          mine: now,
          existingIsOlder: existingTimestamp < now
        });
        
        if (existingTimestamp < now && existingTimestamp > 0) {
          // Bestaande sessie is ouder → join die
          console.log('[ConversationPane] ✅ Joining older session:', existingSession.sessionId);
          setCurrentSessionId(existingSession.sessionId);
          sessionStartTimeRef.current = existingTimestamp;
        } else {
          // Mijn sessie is ouder of gelijk → gebruik mijn sessie
          console.log('[ConversationPane] ✅ Using my session (older or no valid existing):', mySessionId);
          gun.get('ACTIVE_SESSIONS').get(pairId).put({ sessionId: mySessionId });
          setCurrentSessionId(mySessionId);
          sessionStartTimeRef.current = now;
        }
      } else {
        // Geen bestaande sessie → maak nieuwe
        console.log('[ConversationPane] ✅ No existing session, creating:', mySessionId);
        gun.get('ACTIVE_SESSIONS').get(pairId).put({ sessionId: mySessionId });
        setCurrentSessionId(mySessionId);
        sessionStartTimeRef.current = now;
      }
    });

    // Luister naar sessie updates (als andere user een nieuwere/oudere sessie maakt)
    const activeSessionNode = gun.get('ACTIVE_SESSIONS').get(pairId);
    
    activeSessionNode.on((sessionData) => {
      if (!sessionData || !sessionData.sessionId) return;
      
      const incomingSessionId = sessionData.sessionId;
      const incomingTimestamp = parseInt(incomingSessionId.split('_').pop()) || 0;
      
      setCurrentSessionId(current => {
        if (!current) return incomingSessionId;
        
        const currentTimestamp = parseInt(current.split('_').pop()) || 0;
        
        // Alleen switchen als incoming sessie OUDER is
        if (incomingTimestamp < currentTimestamp && incomingTimestamp > 0) {
          console.log('[ConversationPane] 🔄 Switching to older session:', incomingSessionId);
          sessionStartTimeRef.current = incomingTimestamp;
          dispatch({ type: 'RESET' }); // Reset bij sessie switch
          return incomingSessionId;
        }
        
        return current;
      });
    });

    sessionListenerRef.current = () => {
      activeSessionNode.off();
    };

    // Cleanup bij unmount - OPTIE A: Geen cleanup nodig!
    return () => {
      hasInitializedRef.current = false;
      
      if (sessionListenerRef.current) {
        sessionListenerRef.current();
        sessionListenerRef.current = null;
      }
      if (chatListenerRef.current) {
        chatListenerRef.current();
        chatListenerRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      console.log('[ConversationPane] Closed chat - no cleanup needed (Option A)');
    };
  }, [contactName]);

  // Effect: Luister naar berichten in de huidige sessie
  useEffect(() => {
    if (!currentSessionId || !user.is) {
      console.log('[ConversationPane] Message listener NOT starting - no session or user');
      return;
    }

    const currentUser = user.is.alias;
    const sessionStartTime = sessionStartTimeRef.current || Date.now();
    
    console.log('[ConversationPane] 🎧 Setting up message listener:', {
      currentSessionId,
      sessionStartTime,
      currentUser
    });

    // Cleanup oude listener
    if (chatListenerRef.current) {
      chatListenerRef.current();
      chatListenerRef.current = null;
    }

    const chatNode = gun.get(currentSessionId);
    const processedMessages = new Set();
    
    chatNode.map().on((data, id) => {
      if (!data || !data.content || !data.timeRef) return;
      
      if (processedMessages.has(id)) return;
      processedMessages.add(id);
      
      // Filter berichten van voor sessie start
      if (data.timeRef < sessionStartTime - 1000) {
        console.log('[ConversationPane] ⏭️ Skipping old message:', id);
        return;
      }
      
      console.log('[ConversationPane] ✅ New message:', data.sender, data.content.substring(0, 20));
      
      dispatch({ 
        id, 
        sender: data.sender, 
        content: data.content, 
        timestamp: data.timestamp, 
        timeRef: data.timeRef 
      });
    });

    // Nudge listener
    const nudgeNode = gun.get(`NUDGE_${currentSessionId}`);
    nudgeNode.on((data) => {
      if (data && data.time && data.time > lastProcessedNudge.current) {
        if (data.from === contactName) {
          lastProcessedNudge.current = data.time;
          new Audio('/nudge.mp3').play().catch(() => {});
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 600);
        }
      }
    });

    // Typing indicator
    const typingNode = gun.get(`TYPING_${currentSessionId}`);
    typingNode.on((data) => {
      if (data && data.isTyping && data.user === contactName) {
        const now = Date.now();
        if (now - data.timestamp < 4000) {
          setIsContactTyping(true);
          
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          
          typingTimeoutRef.current = setTimeout(() => {
            setIsContactTyping(false);
          }, 3000);
        }
      } else if (data && !data.isTyping && data.user === contactName) {
        setIsContactTyping(false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    });

    chatListenerRef.current = () => {
      chatNode.off();
      nudgeNode.off();
      typingNode.off();
    };

    return () => {
      if (chatListenerRef.current) {
        chatListenerRef.current();
        chatListenerRef.current = null;
      }
    };
  }, [currentSessionId, contactName]);

  // Auto-scroll bij nieuwe berichten
  useEffect(() => {
    if (!messagesAreaRef.current) return;
    messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
  }, [state.messages]);

  // Emoticon picker click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emoticonPickerRef.current && !emoticonPickerRef.current.contains(event.target)) {
        setShowEmoticonPicker(false);
      }
    };

    if (showEmoticonPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmoticonPicker]);

  const sendMessage = () => {
    if (!messageText.trim() || !currentSessionId) return;
    const currentUser = user.is?.alias;
    if (!currentUser) return;

    const now = Date.now();
    const messageKey = `${currentUser}_${now}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('[ConversationPane] Sending message to session:', currentSessionId);
    
    gun.get(currentSessionId).get(messageKey).put({
      sender: currentUser,
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeRef: now
    });
    
    // Stop typing indicator
    gun.get(`TYPING_${currentSessionId}`).put({
      user: currentUser,
      isTyping: false,
      timestamp: now
    });
    
    setMessageText('');
  };

  const sendNudge = () => {
    if (!canNudge || !currentSessionId) return;
    const currentUser = user.is?.alias;
    if (!currentUser) return;

    setCanNudge(false);
    
    gun.get(`NUDGE_${currentSessionId}`).put({ 
      time: Date.now(),
      from: currentUser 
    });
    
    setTimeout(() => setCanNudge(true), 5000);
  };

  const insertEmoticon = (emoticonText) => {
    setMessageText(prev => prev + emoticonText + ' ');
    setShowEmoticonPicker(false);
  };

  const handleTyping = (e) => {
    const newText = e.target.value;
    setMessageText(newText);
    
    const currentUser = user.is?.alias;
    if (!currentUser || !currentSessionId) return;
    
    const now = Date.now();
    
    if (now - lastTypingSignal.current > 1000) {
      gun.get(`TYPING_${currentSessionId}`).put({
        user: currentUser,
        isTyping: newText.length > 0,
        timestamp: now
      });
      lastTypingSignal.current = now;
    }
  };

  return (
    <div className={`chat-conversation ${isShaking ? 'nudge-active' : ''}`}>
      {/* Menubar */}
      <div className="chat-menubar">
        <span className="chat-menu-item">Bestand</span>
        <span className="chat-menu-item">Bewerken</span>
        <span className="chat-menu-item">Acties</span>
        <span className="chat-menu-item">Extra</span>
        <span className="chat-menu-item">Help</span>
      </div>

      {/* Toolbar */}
      <div className="chat-toolbar">
        <button className="chat-toolbar-btn" title="Uitnodigen">
          <span className="chat-toolbar-icon">👥</span>
          <span className="chat-toolbar-label">Uitnodigen</span>
        </button>
        <button className="chat-toolbar-btn" title="Bestand verzenden">
          <span className="chat-toolbar-icon">📎</span>
          <span className="chat-toolbar-label">Bestand</span>
        </button>
        <button className="chat-toolbar-btn" title="Video">
          <span className="chat-toolbar-icon">🎥</span>
          <span className="chat-toolbar-label">Video</span>
        </button>
        <button className="chat-toolbar-btn" title="Spraak">
          <span className="chat-toolbar-icon">🎤</span>
          <span className="chat-toolbar-label">Spraak</span>
        </button>
        <button className="chat-toolbar-btn" title="Activiteiten">
          <span className="chat-toolbar-icon">🎮</span>
          <span className="chat-toolbar-label">Activiteiten</span>
        </button>
        <button className="chat-toolbar-btn" title="Spelletjes">
          <span className="chat-toolbar-icon">🎲</span>
          <span className="chat-toolbar-label">Spelletjes</span>
        </button>
        <div className="chat-toolbar-separator"></div>
        <button className="chat-toolbar-btn" title="Blokkeren">
          <span className="chat-toolbar-icon">🚫</span>
        </button>
      </div>

      {/* Main chat area */}
      <div className="chat-chat-container">
        {/* Linker kolom - Messages */}
        <div className="chat-left-column">
          <div className="chat-messages-display" ref={messagesAreaRef}>
            {state.messages.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '11px', fontStyle: 'italic' }}>
                Je bent nu in gesprek met {contactName}
                {currentSessionId && (
                  <div style={{ marginTop: '5px', fontSize: '9px', color: '#999' }}>
                    Sessie: {currentSessionId.substring(currentSessionId.length - 13)}
                  </div>
                )}
              </div>
            )}
            {state.messages.map((msg) => (
              <div key={msg.id} style={{ marginBottom: '8px', fontSize: '12px' }}>
                <div style={{ color: '#666', fontSize: '10px', marginBottom: '2px' }}>
                  <strong>{msg.sender}</strong> zegt ({msg.timestamp}):
                </div>
                <div style={{ paddingLeft: '10px', wordWrap: 'break-word', color: '#000' }}>
                  {convertEmoticons(msg.content)}
                </div>
              </div>
            ))}
            {isContactTyping && (
              <div className="typing-indicator">
                <em>{contactName} is aan het typen...</em>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="chat-input-container">
            <div className="chat-input-toolbar">
              <button className="chat-input-tool" title="Lettertype">A</button>
              <div style={{ position: 'relative' }}>
                <button 
                  className="chat-input-tool" 
                  title="Emoticons"
                  onClick={() => setShowEmoticonPicker(!showEmoticonPicker)}
                >
                  😊
                </button>
                {showEmoticonPicker && (
                  <div className="emoticon-picker" ref={emoticonPickerRef}>
                    {Object.entries(getEmoticonCategories()).map(([category, emoticons]) => (
                      <div key={category} className="emoticon-category">
                        <div className="emoticon-category-title">{category}</div>
                        <div className="emoticon-grid">
                          {emoticons.map((emo) => (
                            <button
                              key={emo.text}
                              className="emoticon-item"
                              onClick={() => insertEmoticon(emo.text)}
                              title={emo.text}
                            >
                              {emo.emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button className="chat-input-tool" title="Knipoog">😉</button>
              <button className="chat-input-tool" title="Voice clip">🎤</button>
              <button className="chat-input-tool" title="Nudge" onClick={sendNudge} disabled={!canNudge}>⚡</button>
              <button className="chat-input-tool" title="Afbeelding">🖼️</button>
              <button className="chat-input-tool" title="Achtergrond">🎨</button>
            </div>
            <textarea 
              className="chat-input-text"
              value={messageText} 
              onChange={handleTyping}
              onKeyDown={(e) => { 
                if (e.key === 'Enter' && !e.shiftKey) { 
                  e.preventDefault(); 
                  sendMessage(); 
                } 
              }} 
              placeholder="Typ hier een bericht..."
            />
          </div>
        </div>

        {/* Rechter kolom - Avatars */}
        <div className="chat-right-column">
          <div className="chat-avatar-container">
            <div className="chat-avatar-label">Contact:</div>
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${contactName}`} 
              alt={contactName} 
              className="chat-display-picture"
            />
          </div>
          
          <div className="chat-avatar-container" style={{ marginTop: 'auto' }}>
            <div className="chat-avatar-label">Jij:</div>
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`} 
              alt={username} 
              className="chat-display-picture"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConversationPane;