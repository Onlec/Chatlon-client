import React, { useEffect, useState, useReducer, useRef } from 'react';
import { gun, user } from './gun';
import { convertEmoticons, getEmoticonCategories } from './emoticons';
import { getContactPairId } from './utils/chatUtils';

const reducer = (state, action) => {
  // FIX: Support voor RESET action
  if (action.type === 'RESET') {
    return { messages: [], messageMap: {} };
  }
  
  // FIX: Support voor SET_MESSAGES action (bulk load)
  if (action.type === 'SET_MESSAGES') {
    const newMessageMap = {};
    action.messages.forEach(msg => {
      newMessageMap[msg.id] = msg;
    });
    const sortedMessages = Object.values(newMessageMap).sort((a, b) => a.timeRef - b.timeRef);
    return { messageMap: newMessageMap, messages: sortedMessages };
  }
  
  // Default: add single message
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
  const [sessionStartTime, setSessionStartTime] = useState(null); // FIX: Track wanneer sessie startte
  const sessionListenerRef = useRef(null);
  const chatListenerRef = useRef(null);
  const hasInitializedSession = useRef(false);
  const mountTimeRef = useRef(Date.now()); // FIX: Track mount time

  useEffect(() => {
    if (user.is) {
      setUsername(user.is.alias);
    }

    const currentUser = user.is?.alias;
    if (!currentUser) return;

    // GUARD: Voorkom dubbele execution door React Strict Mode
    if (hasInitializedSession.current) {
      console.log('[ConversationPane] Session already initialized, skipping');
      return;
    }

    const pairId = getContactPairId(currentUser, contactName);
    const mountTime = Date.now();
    mountTimeRef.current = mountTime;
    
    console.log('[ConversationPane] Opening chat with:', contactName);
    console.log('[ConversationPane] Mount time:', mountTime);

    // Markeer als geïnitialiseerd
    hasInitializedSession.current = true;

    // FIX: Reset messages bij nieuwe sessie
    dispatch({ type: 'RESET' });

    // FIX: Gebruik .on() in plaats van .once() om sessie updates te volgen
    const activeSessionNode = gun.get('ACTIVE_SESSIONS').get(pairId);
    
    const handleSessionUpdate = (sessionData) => {
      const now = Date.now();
      
      if (sessionData && sessionData.sessionId) {
        // Er bestaat een actieve sessie
        const existingSessionId = sessionData.sessionId;
        
        // Parse openBy van JSON string naar array
        let openByArray = [];
        try {
          openByArray = sessionData.openBy ? JSON.parse(sessionData.openBy) : [];
        } catch (e) {
          openByArray = Array.isArray(sessionData.openBy) ? sessionData.openBy : [sessionData.openBy];
        }
        
        console.log('[ConversationPane] Session update:', existingSessionId);
        console.log('[ConversationPane] Currently open by:', openByArray);
        
        // FIX: Check of dit een NIEUWE sessie is (niet onze eigen net aangemaakte)
        const sessionTimestamp = parseInt(existingSessionId.split('_').pop()) || 0;
        
        // Als de sessie is aangemaakt NA onze mount, en we zitten er niet in, join
        if (!openByArray.includes(currentUser)) {
          openByArray.push(currentUser);
          
          const sessionNode = gun.get('ACTIVE_SESSIONS').get(pairId);
          sessionNode.get('sessionId').put(existingSessionId);
          sessionNode.get('openBy').put(JSON.stringify(openByArray));
          sessionNode.get('lastActivity').put(now);
          
          console.log('[ConversationPane] Joined existing session');
        }
        
        // Update state alleen als sessie veranderd is
        setCurrentSessionId(prev => {
          if (prev !== existingSessionId) {
            console.log('[ConversationPane] Switching to session:', existingSessionId);
            // FIX: Reset messages bij sessie switch
            dispatch({ type: 'RESET' });
            setSessionStartTime(sessionTimestamp);
            return existingSessionId;
          }
          return prev;
        });
        
      } else {
        // Geen actieve sessie - maak nieuwe
        const newSessionId = `CHAT_${pairId}_${now}`;
        console.log('[ConversationPane] Creating new session:', newSessionId);
        
        setCurrentSessionId(newSessionId);
        setSessionStartTime(now);
        
        // FIX: Reset messages voor nieuwe sessie
        dispatch({ type: 'RESET' });
        
        const sessionNode = gun.get('ACTIVE_SESSIONS').get(pairId);
        sessionNode.get('sessionId').put(newSessionId);
        sessionNode.get('openBy').put(JSON.stringify([currentUser]));
        sessionNode.get('lastActivity').put(now);
        
        console.log('[ConversationPane] Created new session');
      }
    };

    // FIX: Kleine delay, dan start listening
    const initTimeout = setTimeout(() => {
      // Eerst een check doen
      activeSessionNode.once(handleSessionUpdate);
      
      // Dan blijven luisteren naar updates
      activeSessionNode.on((data) => {
        // Alleen reageren op echte updates (niet onze eigen writes)
        if (data && data.sessionId) {
          handleSessionUpdate(data);
        }
      });
    }, 100);

    // Store session listener cleanup
    sessionListenerRef.current = () => {
      activeSessionNode.off();
    };

    // Cleanup bij unmount
    return () => {
      clearTimeout(initTimeout);
      hasInitializedSession.current = false;
      
      if (currentUser && pairId) {
        console.log('[ConversationPane] Closing chat, removing self from openBy');
        
        // Haal jezelf uit de openBy array
        gun.get('ACTIVE_SESSIONS').get(pairId).once((sessionData) => {
          if (sessionData && sessionData.openBy) {
            let openByArray = [];
            try {
              openByArray = JSON.parse(sessionData.openBy);
            } catch (e) {
              openByArray = Array.isArray(sessionData.openBy) ? sessionData.openBy : [sessionData.openBy];
            }
            
            const updatedOpenBy = openByArray.filter(u => u !== currentUser);
            
            if (updatedOpenBy.length > 0) {
              const sessionNode = gun.get('ACTIVE_SESSIONS').get(pairId);
              sessionNode.get('sessionId').put(sessionData.sessionId);
              sessionNode.get('openBy').put(JSON.stringify(updatedOpenBy));
              sessionNode.get('lastActivity').put(Date.now());
              
              console.log('[ConversationPane] Removed self, session still active by:', updatedOpenBy);
            } else {
              // FIX: Markeer sessie als gesloten, maar verwijder niet
              // Dit voorkomt dat oude berichten weer verschijnen
              gun.get('ACTIVE_SESSIONS').get(pairId).put({
                sessionId: null,
                openBy: null,
                lastActivity: Date.now(),
                closedAt: Date.now()
              });
              console.log('[ConversationPane] Session closed (no one left)');
            }
          }
        });
      }
      
      // Cleanup listeners
      if (chatListenerRef.current) {
        chatListenerRef.current();
      }
      if (sessionListenerRef.current) {
        sessionListenerRef.current();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [contactName]);

  // Luister naar berichten in de huidige sessie
  useEffect(() => {
    if (!currentSessionId || !user.is || !sessionStartTime) return;

    const currentUser = user.is.alias;
    console.log('[ConversationPane] Setting up message listener for session:', currentSessionId);
    console.log('[ConversationPane] Session start time:', sessionStartTime);

    // Cleanup oude listener
    if (chatListenerRef.current) {
      chatListenerRef.current();
      chatListenerRef.current = null;
    }

    const chatNode = gun.get(currentSessionId);
    
    // FIX: Track welke message IDs we al hebben verwerkt
    const processedMessages = new Set();
    
    chatNode.map().on((data, id) => {
      if (!data || !data.content || !data.timeRef) return;
      
      // FIX: Skip als al verwerkt
      if (processedMessages.has(id)) return;
      processedMessages.add(id);
      
      // FIX: Filter berichten die VOOR de sessie start time zijn
      // Dit voorkomt dat oude berichten van een vorige sessie verschijnen
      // We gebruiken een kleine marge (1 seconde) voor clock sync issues
      const messageTime = data.timeRef;
      if (messageTime < sessionStartTime - 1000) {
        console.log('[ConversationPane] Skipping old message:', messageTime, '<', sessionStartTime);
        return;
      }
      
      console.log('[ConversationPane] Received message:', data.sender, data.content.substring(0, 20));
      
      dispatch({ 
        id, 
        sender: data.sender, 
        content: data.content, 
        timestamp: data.timestamp, 
        timeRef: data.timeRef 
      });
    });

    // Nudge listener voor deze sessie
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

    // Typing indicator voor deze sessie
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

    // Store cleanup functie
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
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentSessionId, sessionStartTime, contactName]);

  useEffect(() => {
    if (!messagesAreaRef.current) return;
    messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
  }, [state.messages]);

  // Close emoticon picker when clicking outside
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
    
    console.log('[ConversationPane] Sending message to session:', currentSessionId);
    
    // FIX: Gebruik unieke key voor bericht
    const messageKey = `${currentUser}_${now}_${Math.random().toString(36).substr(2, 9)}`;
    
    gun.get(currentSessionId).get(messageKey).put({
      sender: currentUser,
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeRef: now
    });
    
    // Stop typing indicator bij verzenden
    gun.get(`TYPING_${currentSessionId}`).put({
      user: currentUser,
      isTyping: false,
      timestamp: now
    });
    
    // Update lastActivity van sessie
    const pairId = getContactPairId(currentUser, contactName);
    gun.get('ACTIVE_SESSIONS').get(pairId).get('lastActivity').put(now);
    
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
    
    // Stuur typing signal (throttled - max 1x per seconde)
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

      {/* Toolbar met icoontjes */}
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

      {/* Main chat area - 2 kolommen */}
      <div className="chat-chat-container">
        {/* Linker kolom - Messages */}
        <div className="chat-left-column">
          {/* Messages display */}
          <div className="chat-messages-display" ref={messagesAreaRef}>
            {state.messages.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '11px', fontStyle: 'italic' }}>
                Je bent nu in gesprek met {contactName}
                {currentSessionId && (
                  <div style={{ marginTop: '5px', fontSize: '9px', color: '#999' }}>
                    Nieuwe sessie gestart
                  </div>
                )}
              </div>
            )}
            {state.messages.map((msg) => {
              return (
                <div key={msg.id} style={{ 
                  marginBottom: '8px', 
                  fontSize: '12px'
                }}>
                  <div style={{ 
                    color: '#666', 
                    fontSize: '10px', 
                    marginBottom: '2px'
                  }}>
                    <strong>{msg.sender}</strong> zegt ({msg.timestamp}):
                  </div>
                  <div style={{ 
                    paddingLeft: '10px', 
                    wordWrap: 'break-word',
                    color: '#000'
                  }}>
                    {convertEmoticons(msg.content)}
                  </div>
                </div>
              );
            })}
            {isContactTyping && (
              <div className="typing-indicator">
                <em>{contactName} is aan het typen...</em>
              </div>
            )}
          </div>

          {/* Input area met toolbar */}
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