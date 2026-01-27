import React, { useEffect, useState, useReducer, useRef } from 'react';
import { gun, user } from './gun';

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
  const sessionStartTime = useRef(Date.now());

  useEffect(() => {
    if (user.is) {
      setUsername(user.is.alias);
    }

    const currentUser = user.is?.alias;
    if (!currentUser) return;

    const chatRoomId = getChatRoomId(currentUser, contactName);
    const chatNode = gun.get(chatRoomId);
    
    chatNode.map().on((data, id) => {
      if (data && data.content && data.timeRef) {
        if (data.timeRef >= sessionStartTime.current) {
          dispatch({ 
            id, 
            sender: data.sender, 
            content: data.content, 
            timestamp: data.timestamp, 
            timeRef: data.timeRef 
          });
        }
      }
    });

    const nudgeNode = gun.get(`NUDGE_${chatRoomId}`);
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
    
    return () => { 
      chatNode.off(); 
      nudgeNode.off(); 
    };
  }, [contactName]);

  useEffect(() => {
    if (messagesAreaRef.current) {
      messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
    }
  }, [state.messages]);

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
            {state.messages.map((msg) => (
              <div key={msg.id} style={{ marginBottom: '8px', fontSize: '12px' }}>
                <div style={{ color: '#666', fontSize: '10px', marginBottom: '2px' }}>
                  <strong>{msg.sender}</strong> zegt ({msg.timestamp}):
                </div>
                <div style={{ paddingLeft: '10px' }}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          {/* Input area met toolbar */}
          <div className="msn-input-container">
            <div className="msn-input-toolbar">
              <button className="msn-input-tool" title="Lettertype">A</button>
              <button className="msn-input-tool" title="Emoticons">😊</button>
              <button className="msn-input-tool" title="Knipoog">😉</button>
              <button className="msn-input-tool" title="Voice clip">🎤</button>
              <button className="msn-input-tool" title="Nudge" onClick={sendNudge} disabled={!canNudge}>⚡</button>
              <button className="msn-input-tool" title="Afbeelding">🖼️</button>
              <button className="msn-input-tool" title="Achtergrond">🎨</button>
            </div>
            <textarea 
              className="msn-input-text"
              value={messageText} 
              onChange={e => setMessageText(e.target.value)} 
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