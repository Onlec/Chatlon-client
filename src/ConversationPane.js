import React, { useEffect, useState, useReducer, useRef } from 'react';
import { gun, user } from './gun';
import { convertEmoticons, getEmoticonCategories } from './emoticons';

const reducer = (state, message) => {
  if (state.messageMap[message.id]) return state;
  const newMessageMap = { ...state.messageMap, [message.id]: message };
  const sortedMessages = Object.values(newMessageMap).sort((a, b) => a.timeRef - b.timeRef);
  return { messageMap: newMessageMap, messages: sortedMessages };
};

// Helper om consistente chat room ID te maken (alfabetisch gesorteerd)
const getChatRoomId = (user1, user2) => {
  const sorted = [user1, user2].sort();
  return `CHAT_${sorted[0]}_${sorted[1]}`;
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
  
  // TWEE TIMESTAMPS:
  const [sessionStartTime, setSessionStartTime] = useState(null); // Grens tussen oud/nieuw
  const [lastSeenMessageTime, setLastSeenMessageTime] = useState(null); // Voor "nieuwe berichten" streep
  const hasScrolledToNew = useRef(false);

  useEffect(() => {
    if (user.is) {
      setUsername(user.is.alias);
    }

    const currentUser = user.is?.alias;
    if (!currentUser) return;

    const chatRoomId = getChatRoomId(currentUser, contactName);
    
    // Laad last seen timestamp uit localStorage (van vorige sessie)
    const lastSeenKey = `lastSeen_${chatRoomId}`;
    const savedLastSeen = localStorage.getItem(lastSeenKey);
    
    if (savedLastSeen) {
      const lastSeenTimestamp = parseInt(savedLastSeen);
      setLastSeenMessageTime(lastSeenTimestamp);
      setSessionStartTime(lastSeenTimestamp); // Alles voor lastSeen = oud (grijs)
      console.log('[ConversationPane] Last seen from previous session:', new Date(lastSeenTimestamp));
      console.log('[ConversationPane] Messages before this time will be grey');
    } else {
      // Eerste keer openen - gebruik huidige tijd
      const now = Date.now();
      setSessionStartTime(now);
      setLastSeenMessageTime(now);
      console.log('[ConversationPane] First time opening - session start:', new Date(now));
    }
    
    const chatNode = gun.get(chatRoomId);
    
    // BELANGRIJK: Gebruik een TAG zodat we alleen DEZE listener kunnen verwijderen
    // Anders verwijdert chatNode.off() ook de App.js listener!
    const convListenerTag = {};
    
    chatNode.map().on((data, id) => {
      if (data && data.content && data.timeRef) {
        dispatch({ 
          id, 
          sender: data.sender, 
          content: data.content, 
          timestamp: data.timestamp, 
          timeRef: data.timeRef 
        });
      }
    }, convListenerTag); // TAG toegevoegd!

    const nudgeNode = gun.get(`NUDGE_${chatRoomId}`);
    const nudgeListenerTag = {};
    
    nudgeNode.on((data) => {
      if (data && data.time && data.time > lastProcessedNudge.current) {
        if (data.from === contactName) {
          lastProcessedNudge.current = data.time;
          new Audio('/nudge.mp3').play().catch(() => {});
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 600);
        }
      }
    }, nudgeListenerTag); // TAG toegevoegd!

    // Typing indicator
    const typingNode = gun.get(`TYPING_${chatRoomId}`);
    const typingListenerTag = {};
    
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
    }, typingListenerTag); // TAG toegevoegd!
    
    // Bij unmount: sla huidige tijd op als "last seen"
    return () => { 
      const now = Date.now();
      localStorage.setItem(lastSeenKey, now.toString());
      console.log('[ConversationPane] Saved last seen time:', new Date(now));
      
      // BELANGRIJK: Verwijder alleen ONZE listeners, niet alle listeners!
      // chatNode.off() zou ook de App.js toast listener verwijderen!
      chatNode.map().off(convListenerTag);
      nudgeNode.off(nudgeListenerTag);
      typingNode.off(typingListenerTag);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [contactName]);

  useEffect(() => {
    if (!messagesAreaRef.current) return;
    
    // Altijd scroll naar beneden bij nieuwe berichten
    if (state.messages.length > 0) {
      const lastMessage = state.messages[state.messages.length - 1];
      
      // Als het laatste bericht van de huidige gebruiker is, scroll altijd naar beneden
      if (lastMessage.sender === username) {
        messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
        return;
      }
      
      // Als er nieuwe berichten zijn en we nog niet gescrolld hebben
      if (lastSeenMessageTime && !hasScrolledToNew.current) {
        // Zoek het eerste nieuwe bericht
        const firstNewMessageIndex = state.messages.findIndex(msg => msg.timeRef > lastSeenMessageTime);
        
        if (firstNewMessageIndex > 0) {
          // Scroll naar de "nieuwe berichten" divider
          setTimeout(() => {
            const divider = document.querySelector('.new-messages-divider');
            if (divider) {
              divider.scrollIntoView({ behavior: 'smooth', block: 'start' });
              hasScrolledToNew.current = true;
            }
          }, 100);
        } else {
          // Geen nieuwe berichten, scroll naar beneden
          messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
        }
      } else if (!lastSeenMessageTime) {
        // Eerste keer openen, scroll naar beneden
        messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
      }
    }
  }, [state.messages, lastSeenMessageTime, username]);
  
  // MARKEER BERICHTEN ALS GELEZEN - met throttling
  useEffect(() => {
    let scrollTimeout;
    
    const markAsRead = () => {
      // Clear previous timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      // Set new timeout - alleen markeren na 500ms scroll inactiviteit
      scrollTimeout = setTimeout(() => {
        if (state.messages.length > 0) {
          const latestTime = Math.max(...state.messages.map(m => m.timeRef));
          if (!lastSeenMessageTime || latestTime > lastSeenMessageTime) {
            setLastSeenMessageTime(latestTime);
          }
        }
      }, 500);
    };
    
    const scrollArea = messagesAreaRef.current;
    if (scrollArea) {
      scrollArea.addEventListener('scroll', markAsRead);
      return () => {
        scrollArea.removeEventListener('scroll', markAsRead);
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
      };
    }
  }, [state.messages, lastSeenMessageTime]);

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
    if (!messageText.trim()) return;
    const currentUser = user.is?.alias;
    if (!currentUser) return;

    const now = Date.now();
    const chatRoomId = getChatRoomId(currentUser, contactName);
    
    gun.get(chatRoomId).set({
      sender: currentUser,
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeRef: now
    });
    
    // Stop typing indicator bij verzenden
    gun.get(`TYPING_${chatRoomId}`).put({
      user: currentUser,
      isTyping: false,
      timestamp: now
    });
    
    // Update last seen - alle berichten tot nu zijn "gelezen"
    setLastSeenMessageTime(now);
    localStorage.setItem(`lastSeen_${chatRoomId}`, now.toString());
    
    setMessageText('');
  };

  const sendNudge = () => {
    if (!canNudge) return;
    const currentUser = user.is?.alias;
    if (!currentUser) return;

    setCanNudge(false);
    const chatRoomId = getChatRoomId(currentUser, contactName);
    
    gun.get(`NUDGE_${chatRoomId}`).put({ 
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
    if (!currentUser) return;
    
    const now = Date.now();
    const chatRoomId = getChatRoomId(currentUser, contactName);
    
    // Stuur typing signal (throttled - max 1x per seconde)
    if (now - lastTypingSignal.current > 1000) {
      gun.get(`TYPING_${chatRoomId}`).put({
        user: currentUser,
        isTyping: newText.length > 0,
        timestamp: now
      });
      lastTypingSignal.current = now;
    }
  };

  return (
    <div className={`msn-conversation ${isShaking ? 'nudge-active' : ''}`}>
      {/* Menubar */}
      <div className="msn-menubar">
        <span className="msn-menu-item">Bestand</span>
        <span className="msn-menu-item">Bewerken</span>
        <span className="msn-menu-item">Acties</span>
        <span className="msn-menu-item">Extra</span>
        <span className="msn-menu-item">Help</span>
      </div>

      {/* Toolbar met icoontjes */}
      <div className="msn-toolbar">
        <button className="msn-toolbar-btn" title="Uitnodigen">
          <span className="msn-toolbar-icon">👥</span>
          <span className="msn-toolbar-label">Uitnodigen</span>
        </button>
        <button className="msn-toolbar-btn" title="Bestand verzenden">
          <span className="msn-toolbar-icon">📎</span>
          <span className="msn-toolbar-label">Bestand</span>
        </button>
        <button className="msn-toolbar-btn" title="Video">
          <span className="msn-toolbar-icon">🎥</span>
          <span className="msn-toolbar-label">Video</span>
        </button>
        <button className="msn-toolbar-btn" title="Spraak">
          <span className="msn-toolbar-icon">🎤</span>
          <span className="msn-toolbar-label">Spraak</span>
        </button>
        <button className="msn-toolbar-btn" title="Activiteiten">
          <span className="msn-toolbar-icon">🎮</span>
          <span className="msn-toolbar-label">Activiteiten</span>
        </button>
        <button className="msn-toolbar-btn" title="Spelletjes">
          <span className="msn-toolbar-icon">🎲</span>
          <span className="msn-toolbar-label">Spelletjes</span>
        </button>
        <div className="msn-toolbar-separator"></div>
        <button className="msn-toolbar-btn" title="Blokkeren">
          <span className="msn-toolbar-icon">🚫</span>
        </button>
      </div>

      {/* Main chat area - 2 kolommen */}
      <div className="msn-chat-container">
        {/* Linker kolom - Messages */}
        <div className="msn-left-column">
          {/* Messages display */}
          <div className="msn-messages-display" ref={messagesAreaRef}>
            {state.messages.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '11px', fontStyle: 'italic' }}>
                Je bent nu in gesprek met {contactName}
              </div>
            )}
            {state.messages.map((msg, index) => {
              // BEPAAL MESSAGE STATE:
              const isOld = sessionStartTime && msg.timeRef < sessionStartTime; // Van vorige sessie
              const isNewUnread = lastSeenMessageTime && msg.timeRef > lastSeenMessageTime; // Ongelezen
              // Als niet oud en niet nieuw → huidige sessie, al gelezen
              
              const prevMsg = index > 0 ? state.messages[index - 1] : null;
              const showDivider = lastSeenMessageTime && 
                                  isNewUnread && 
                                  (!prevMsg || prevMsg.timeRef <= lastSeenMessageTime);
              
              return (
                <React.Fragment key={msg.id}>
                  {showDivider && (
                    <div className="new-messages-divider" style={{
                      display: 'flex',
                      alignItems: 'center',
                      margin: '12px 0',
                      padding: '8px 0'
                    }}>
                      <div style={{
                        flex: 1,
                        height: '1px',
                        background: 'linear-gradient(to right, transparent, #FFB900, transparent)'
                      }}></div>
                      <span style={{
                        padding: '0 12px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        color: '#FFB900',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Nieuwe berichten
                      </span>
                      <div style={{
                        flex: 1,
                        height: '1px',
                        background: 'linear-gradient(to right, transparent, #FFB900, transparent)'
                      }}></div>
                    </div>
                  )}
                  <div style={{ 
                    marginBottom: '8px', 
                    fontSize: '12px',
                    opacity: isOld ? 0.5 : 1, // Oude berichten zijn grijs
                    transition: 'opacity 0.3s'
                  }}>
                    <div style={{ 
                      color: isNewUnread ? '#003399' : (isOld ? '#999' : '#666'), 
                      fontSize: '10px', 
                      marginBottom: '2px',
                      fontWeight: isNewUnread ? 'bold' : 'normal'
                    }}>
                      <strong>{msg.sender}</strong> zegt ({msg.timestamp}):
                    </div>
                    <div style={{ 
                      paddingLeft: '10px', 
                      wordWrap: 'break-word',
                      color: isNewUnread ? '#000' : (isOld ? '#999' : '#000')
                    }}>
                      {convertEmoticons(msg.content)}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            {isContactTyping && (
              <div className="typing-indicator">
                <em>{contactName} is aan het typen...</em>
              </div>
            )}
          </div>

          {/* Input area met toolbar */}
          <div className="msn-input-container">
            <div className="msn-input-toolbar">
              <button className="msn-input-tool" title="Lettertype">A</button>
              <div style={{ position: 'relative' }}>
                <button 
                  className="msn-input-tool" 
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
              <button className="msn-input-tool" title="Knipoog">😉</button>
              <button className="msn-input-tool" title="Voice clip">🎤</button>
              <button className="msn-input-tool" title="Nudge" onClick={sendNudge} disabled={!canNudge}>⚡</button>
              <button className="msn-input-tool" title="Afbeelding">🖼️</button>
              <button className="msn-input-tool" title="Achtergrond">🎨</button>
            </div>
            <textarea 
              className="msn-input-text"
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
        <div className="msn-right-column">
          <div className="msn-avatar-container">
            <div className="msn-avatar-label">Contact:</div>
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${contactName}`} 
              alt={contactName} 
              className="msn-display-picture"
            />
          </div>
          
          <div className="msn-avatar-container" style={{ marginTop: 'auto' }}>
            <div className="msn-avatar-label">Jij:</div>
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`} 
              alt={username} 
              className="msn-display-picture"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConversationPane;