import React, { useEffect, useState, useReducer, useRef } from 'react';
import { gun, user } from '../../gun';
import { log } from '../../utils/debug';
import { createListenerManager } from '../../utils/gunListenerManager';
import { useAvatar } from '../../contexts/AvatarContext';

const reducer = (state, message) => {
  if (state.messageMap[message.id]) return state;
  const newMessageMap = { ...state.messageMap, [message.id]: message };
  const sortedMessages = Object.values(newMessageMap).sort((a, b) => a.timeRef - b.timeRef);
  return { messageMap: newMessageMap, messages: sortedMessages };
};

function ChatPane() {
  const { getAvatar } = useAvatar();
  const [messageText, setMessageText] = useState('');
  const [state, dispatch] = useReducer(reducer, { messages: [], messageMap: {} });
  const messagesAreaRef = useRef(null);
  const lastProcessedNudge = useRef(Date.now());
  const [isShaking, setIsShaking] = useState(false);
  const [canNudge, setCanNudge] = useState(true);
  const [username, setUsername] = useState('');
  const listenersRef = useRef(createListenerManager());

  useEffect(() => {
    const chatNode = gun.get('CHAT_MESSAGES');
    chatNode.map().on((data, id) => {
      if (data && data.content) {
        dispatch({ id, sender: data.sender, content: data.content, timestamp: data.timestamp, timeRef: data.timeRef || 0 });
      }
    });

    if (user.is) {
      setUsername(user.is.alias);
      // Scroll naar beneden na korte delay bij auto-login
      setTimeout(() => {
        if (messagesAreaRef.current) {
          messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
        }
      }, 300);
    }

    const nudgeNode = gun.get('CHAT_NUDGES').get('time');
    nudgeNode.on((data) => {
      if (data && data > lastProcessedNudge.current) {
        lastProcessedNudge.current = data;
        new Audio('/nudge.mp3').play().catch(() => {});
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 600);
      }
    });
    listenersRef.current.add('chat', chatNode);
    listenersRef.current.add('nudge', nudgeNode);

    return () => { listenersRef.current.cleanup(); };
  }, []);

  useEffect(() => {
    if (messagesAreaRef.current) {
      messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
    }
  }, [state.messages]);

  const sendMessage = () => {
    if (!messageText.trim()) return;
    const now = Date.now();
    gun.get('CHAT_MESSAGES').set({
      sender: username || user.is?.alias || 'Anoniem',
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeRef: now
    });
    setMessageText('');
  };

  return (
    <div className={`chat-main-wrapper ${isShaking ? 'nudge-active' : ''}`}>
      <div className="chat-info-bar">
        <span>Aangemeld als: <strong>{username || user.is?.alias || 'Gebruiker'}</strong></span>
      </div>
      <div className="chat-layout">
        <div className="chat-messages-area" ref={messagesAreaRef}>
          {state.messages.map((msg) => (
            <div key={msg.id} style={{ marginBottom: '4px' }}>
              <strong>{msg.sender}:</strong> {msg.content}
              <span style={{fontSize: '9px', color: '#999', marginLeft: '5px'}}>{msg.timestamp}</span>
            </div>
          ))}
        </div>
        <aside className="chat-sidebar">
          <img src={getAvatar(username || user.is?.alias || 'User')} alt="avatar" className="chat-avatar-img" />
          <button className={`dx-button nudge-btn ${!canNudge ? 'disabled' : ''}`} onClick={() => { if(canNudge){ setCanNudge(false); gun.get('CHAT_NUDGES').put({time: Date.now()}); setTimeout(()=>setCanNudge(true), 5000); } }} disabled={!canNudge} style={{ marginTop: '10px', width: '90%' }}>Nudge!</button>
        </aside>
      </div>
      <div className="chat-input-section">
        <textarea value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
        <button className="dx-button" onClick={sendMessage}>Verzenden</button>
      </div>
    </div>
  );
}

export default ChatPane;