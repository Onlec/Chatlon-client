import React, { useEffect, useState, useReducer, useRef } from 'react';
import Gun from 'gun';
import 'gun/sea';

const gun = Gun({ peers: [process.env.REACT_APP_GUN_URL] });
const userAuth = gun.user().recall({ storage: true });

const reducer = (state, message) => {
  if (state.messageMap[message.id]) return state;
  const newMessageMap = { ...state.messageMap, [message.id]: message };
  const sortedMessages = Object.values(newMessageMap).sort((a, b) => a.timeRef - b.timeRef);
  return { messageMap: newMessageMap, messages: sortedMessages };
};

function ChatWindow({ onLoginStatusChange }) {
  const [messageText, setMessageText] = useState('');
  const [state, dispatch] = useReducer(reducer, { messages: [], messageMap: {} });
  const messagesEndRef = useRef(null);
  const lastProcessedNudge = useRef(Date.now());

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [canNudge, setCanNudge] = useState(true);

  useEffect(() => {
    const chatNode = gun.get('CHAT_MESSAGES');
    chatNode.map().on((data, id) => {
      if (data && data.content) {
        dispatch({ id, sender: data.sender, content: data.content, timestamp: data.timestamp, timeRef: data.timeRef || 0 });
      }
    });

    if (userAuth.is) {
      setIsLoggedIn(true);
      onLoginStatusChange(true);
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
    return () => { chatNode.off(); nudgeNode.off(); };
  }, [onLoginStatusChange]);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "auto" });
  }, [state.messages]);

  const handleLogin = () => {
    userAuth.auth(username, password, (ack) => {
      if (ack.err) alert(ack.err);
      else {
        setIsLoggedIn(true);
        onLoginStatusChange(true);
      }
    });
  };

  const handleRegister = () => {
    userAuth.create(username, password, (ack) => {
      if (ack.err) alert(ack.err);
      else alert("Account aangemaakt!");
    });
  };

  const sendMessage = () => {
    if (!messageText.trim()) return;
    const now = Date.now();
    gun.get('CHAT_MESSAGES').set({
      sender: username || userAuth.is?.alias || 'Anoniem',
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeRef: now
    });
    setMessageText('');
  };

  if (!isLoggedIn) {
    return (
      <div className="chat-login-container">
        <div className="chat-login-banner">
          <span className="chat-login-logo">👤</span>
          <span className="chat-login-title">Chatlon Messenger</span>
        </div>
        <div className="chat-login-body">
          <label>Aanmeldingsnaam:</label>
          <input className="xp-input" value={username} onChange={e => setUsername(e.target.value)} />
          <label>Wachtwoord:</label>
          <input className="xp-input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <div className="chat-login-actions">
            <button className="xp-button" onClick={handleLogin}>Aanmelden</button>
            <button className="xp-button secondary" onClick={handleRegister}>Registreren</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`chat-main-wrapper ${isShaking ? 'nudge-active' : ''}`}>
      <div className="chat-info-bar">
        <span>Aangemeld als: <strong>{username || userAuth.is?.alias}</strong></span>
      </div>
      <div className="chat-layout">
        <div className="chat-messages-area">
          {state.messages.map((msg) => (
            <div key={msg.id} style={{ marginBottom: '4px' }}>
              <strong>{msg.sender}:</strong> {msg.content}
              <span style={{fontSize: '9px', color: '#999', marginLeft: '5px'}}>{msg.timestamp}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <aside className="chat-sidebar">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username || userAuth.is?.alias}`} alt="avatar" className="chat-avatar-img" />
          <button className={`xp-button nudge-btn ${!canNudge ? 'disabled' : ''}`} onClick={() => { if(canNudge){ setCanNudge(false); gun.get('CHAT_NUDGES').put({time: Date.now()}); setTimeout(()=>setCanNudge(true), 5000); } }} disabled={!canNudge} style={{ marginTop: '10px', width: '90%' }}>Nudge!</button>
        </aside>
      </div>
      <div className="chat-input-section">
        <textarea value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
        <button className="xp-button" onClick={sendMessage}>Verzenden</button>
      </div>
    </div>
  );
}

export default ChatWindow;