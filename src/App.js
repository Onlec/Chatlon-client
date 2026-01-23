import React, { useState } from 'react';
import Window from './Window'; // Dit bestand maken we hierna
import ChatWindow from './ChatWindow'; // Jouw oude code (geparkeerd in dit nieuwe bestand)
import './App.css';

function App() {
  // Status om bij te houden of de chat-app open is en of hij geminimaliseerd is
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Functie om het venster te herstellen vanaf de taakbalk
  const toggleMinimize = () => {
    setIsChatMinimized(!isChatMinimized);
  };

  return (
    <div className="desktop">
        {/* 1. Snelkoppelingen op het bureaublad */}
        <div className="shortcuts-area">
        <div className="shortcut" onDoubleClick={() => setIsChatOpen(true)}>
            <img src="favicon.ico" alt="Chatlon" className="shortcut-icon" />
            <span className="shortcut-label">Chatlon Messenger</span>
        </div>
        </div>


      {/* 1. De Window Layer (waar de vensters zweven) */}
      <div className="window-layer">
        {isChatOpen && !isChatMinimized && (
        <Window 
        title="Chatlon" 
        isMaximized={isMaximized}
        onMaximize={() => setIsMaximized(!isMaximized)} // Check of dit PRECIES zo gespeld is
        onClose={() => setIsChatOpen(false)} 
        onMinimize={() => setIsChatMinimized(true)}
        >
        <ChatWindow />
        </Window>
        )}
      </div>

      {/* 2. De Taakbalk onderaan */}
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