import React, { useState } from 'react';
import Window from './Window'; 
import ChatWindow from './ChatWindow'; 
import './App.css';

function App() {
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const toggleMinimize = () => {
    setIsChatMinimized(!isChatMinimized);
  };

  // Verbeterde open-functie voor de snelkoppeling
  const openChat = () => {
    setIsChatOpen(true);
    setIsChatMinimized(false); // Zorgt dat hij ook echt tevoorschijn komt
  };

  return (
    <div className="desktop">
      <div className="shortcuts-area">
        <div className="shortcut" onDoubleClick={openChat}>
          <img src="favicon.ico" alt="Chatlon" className="shortcut-icon" />
          <span className="shortcut-label">Chatlon Messenger</span>
        </div>
      </div>

      <div className="window-layer">
        {isChatOpen && !isChatMinimized && (
          <Window 
            title="Chatlon" 
            isMaximized={isMaximized}
            onMaximize={() => setIsMaximized(!isMaximized)}
            onClose={() => setIsChatOpen(false)} 
            onMinimize={() => setIsChatMinimized(true)}
          >
            <ChatWindow />
          </Window>
        )}
      </div>

      <div className="taskbar">
        <button className="start-btn">Start</button>
        
        <div className="taskbar-items">
          {isChatOpen && (
            <div 
              className={`taskbar-tab ${!isChatMinimized ? 'active' : ''}`}
              onClick={toggleMinimize}
            >
              <span className="taskbar-icon">👤</span>
              Chatlon
            </div>
          )}
        </div>

        <div className="systray">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

export default App;