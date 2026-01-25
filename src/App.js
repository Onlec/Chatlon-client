import React, { useState } from 'react';
import Window from './Window'; 
import ChatWindow from './ChatWindow'; 
import './App.css';

function App() {
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isChatLoggedIn, setIsChatLoggedIn] = useState(false);

  const toggleMinimize = () => setIsChatMinimized(!isChatMinimized);
  const openChat = () => { setIsChatOpen(true); setIsChatMinimized(false); setIsStartOpen(false); };

  return (
    <div className="desktop" onClick={() => setIsStartOpen(false)}>
      <div className="shortcuts-area">
        <div className="shortcut" onDoubleClick={openChat}>
          <img src="favicon.ico" alt="Chatlon" className="shortcut-icon" />
          <span className="shortcut-label">Chatlon Messenger</span>
        </div>
      </div>

      <div className="window-layer">
        {isChatOpen && (
          <div style={{ display: isChatMinimized ? 'none' : 'block' }}>
            <Window 
              title={isChatLoggedIn ? "Chatlon Messenger" : "Aanmelden"} 
              type={isChatLoggedIn ? "chat" : "login"}
              isMaximized={isMaximized}
              onMaximize={() => setIsMaximized(!isMaximized)}
              onClose={() => setIsChatOpen(false)} 
              onMinimize={() => setIsChatMinimized(true)}
            >
              <ChatWindow onLoginStatusChange={(status) => setIsChatLoggedIn(status)} />
            </Window>
          </div>
        )}
      </div>

      {isStartOpen && (
        <div className="start-menu" onClick={(e) => e.stopPropagation()}>
          <div className="start-menu-header">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="user" className="start-user-img" />
            <span className="start-user-name">Administrator</span>
          </div>
          <div className="start-menu-main">
            <div className="start-left-col">
              <div className="start-item" onClick={openChat}>
                <img src="favicon.ico" alt="icon" />
                <span>Chatlon Messenger</span>
              </div>
            </div>
            <div className="start-right-col">
              <div className="start-item-gray">My Documents</div>
              <div className="start-item-gray">My Computer</div>
            </div>
          </div>
          <div className="start-menu-footer">
             <button className="logoff-btn" onClick={() => window.location.reload()}>Log Off</button>
          </div>
        </div>
      )}

      <div className="taskbar">
        <button className={`start-btn ${isStartOpen ? 'pressed' : ''}`} onClick={(e) => { e.stopPropagation(); setIsStartOpen(!isStartOpen); }}>
          <span className="start-icon">🏁</span> Start
        </button>
        <div className="taskbar-items">
          {isChatOpen && (
            <div className={`taskbar-tab ${!isChatMinimized ? 'active' : ''}`} onClick={toggleMinimize}>
              <span className="taskbar-icon">👤</span> Chatlon
            </div>
          )}
        </div>
        <div className="systray">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>
  );
}

export default App;