import React, { useState, useEffect } from 'react';
import Pane from './Pane'; 
import ChatPane from './ChatPane'; 
import NotepadPane from './NotepadPane';
import LoginScreen from './LoginScreen';
import { gun, user } from './gun';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [isChatMaximized, setIsChatMaximized] = useState(false);
  
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const [isNotepadMinimized, setIsNotepadMinimized] = useState(false);
  const [isNotepadMaximized, setIsNotepadMaximized] = useState(false);
  
  const [isStartOpen, setIsStartOpen] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    if (user.is) {
      setIsLoggedIn(true);
      setCurrentUser(user.is.alias);
    }
  }, []);

  const handleLoginSuccess = (username) => {
    setIsLoggedIn(true);
    setCurrentUser(username);
  };

  const handleLogoff = () => {
    user.leave();
    setIsLoggedIn(false);
    setCurrentUser('');
    setIsChatOpen(false);
    setIsNotepadOpen(false);
    window.location.reload();
  };

  const openChat = () => { setIsChatOpen(true); setIsChatMinimized(false); setIsStartOpen(false); };
  const openNotepad = () => { setIsNotepadOpen(true); setIsNotepadMinimized(false); setIsStartOpen(false); };

  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="desktop" onClick={() => setIsStartOpen(false)}>
      <div className="shortcuts-area">
        <div className="shortcut" onDoubleClick={openChat}>
          <img src="favicon.ico" alt="Chatlon" className="shortcut-icon" />
          <span className="shortcut-label">Chatlon Messenger</span>
        </div>
        
        <div className="shortcut" onDoubleClick={openNotepad}>
          <span className="shortcut-icon" style={{ fontSize: '32px' }}>📝</span>
          <span className="shortcut-label">Kladblok</span>
        </div>
      </div>

      <div className="pane-layer">
        {isChatOpen && (
          <div style={{ display: isChatMinimized ? 'none' : 'block' }}>
            <Pane 
              title="Chatlon Messenger"
              type="chat"
              isMaximized={isChatMaximized}
              onMaximize={() => setIsChatMaximized(!isChatMaximized)}
              onClose={() => setIsChatOpen(false)} 
              onMinimize={() => setIsChatMinimized(true)}
            >
              <ChatPane />
            </Pane>
          </div>
        )}

        {isNotepadOpen && (
          <div style={{ display: isNotepadMinimized ? 'none' : 'block' }}>
            <Pane 
              title="Naamloos - Kladblok" 
              type="notepad"
              isMaximized={isNotepadMaximized}
              onMaximize={() => setIsNotepadMaximized(!isNotepadMaximized)}
              onClose={() => setIsNotepadOpen(false)} 
              onMinimize={() => setIsNotepadMinimized(true)}
            >
              <NotepadPane />
            </Pane>
          </div>
        )}
      </div>

      {isStartOpen && (
        <div className="start-menu" onClick={(e) => e.stopPropagation()}>
          <div className="start-menu-header">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser}`} alt="user" className="start-user-img" />
            <span className="start-user-name">{currentUser}</span>
          </div>
          <div className="start-menu-main">
            <div className="start-left-col">
              <div className="start-item" onClick={openChat}>
                <img src="favicon.ico" alt="icon" />
                <span>Chatlon Messenger</span>
              </div>
              <div className="start-item" onClick={openNotepad}>
                <span style={{ fontSize: '24px' }}>📝</span>
                <span>Kladblok</span>
              </div>
            </div>
            <div className="start-right-col">
              <div className="start-item-gray">My Documents</div>
              <div className="start-item-gray">My Computer</div>
            </div>
          </div>
          <div className="start-menu-footer">
             <button className="logoff-btn" onClick={handleLogoff}>Log Off</button>
          </div>
        </div>
      )}

      <div className="taskbar">
        <button className={`start-btn ${isStartOpen ? 'pressed' : ''}`} onClick={(e) => { e.stopPropagation(); setIsStartOpen(!isStartOpen); }}>
          <span className="start-icon">🪟</span> Start
        </button>
        <div className="taskbar-items">
          {isChatOpen && (
            <div className={`taskbar-tab ${!isChatMinimized ? 'active' : ''}`} onClick={() => setIsChatMinimized(!isChatMinimized)}>
              <span className="taskbar-icon">💬</span> Chatlon
            </div>
          )}
          {isNotepadOpen && (
            <div className={`taskbar-tab ${!isNotepadMinimized ? 'active' : ''}`} onClick={() => setIsNotepadMinimized(!isNotepadMinimized)}>
              <span className="taskbar-icon">📝</span> Kladblok
            </div>
          )}
        </div>
        <div className="systray">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>
  );
}

export default App;