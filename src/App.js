import React, { useState, useEffect } from 'react';
import Pane from './Pane'; 
import LoginScreen from './LoginScreen';
import { gun, user } from './gun';
import { paneConfig, getInitialPaneState } from './paneConfig';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [isStartOpen, setIsStartOpen] = useState(false);
  
  // Generiek pane management
  const [panes, setPanes] = useState(getInitialPaneState());
  const [paneOrder, setPaneOrder] = useState([]);
  const [activePane, setActivePane] = useState(null);
  const [savedSizes, setSavedSizes] = useState({}); // Onthoud pane groottes per sessie
  const [savedPositions, setSavedPositions] = useState({}); // Onthoud pane posities per sessie
  const [cascadeOffset, setCascadeOffset] = useState(0); // Voor getrapt openen

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
    setPanes(getInitialPaneState());
    setPaneOrder([]);
    setActivePane(null);
    window.location.reload();
  };

  // Generieke pane functies
  const openPane = (paneName) => {
    setPanes(prev => ({
      ...prev,
      [paneName]: { ...prev[paneName], isOpen: true, isMinimized: false }
    }));
    setIsStartOpen(false);
    if (!paneOrder.includes(paneName)) {
      setPaneOrder([...paneOrder, paneName]);
    }
    setActivePane(paneName);
    
    // Als er geen opgeslagen positie is, gebruik cascade offset
    if (!savedPositions[paneName]) {
      setCascadeOffset(prev => (prev + 30) % 150); // Reset na 5 vensters
    }
  };

  const closePane = (paneName) => {
    setPanes(prev => ({
      ...prev,
      [paneName]: { isOpen: false, isMinimized: false, isMaximized: false }
    }));
    setPaneOrder(prev => prev.filter(p => p !== paneName));
    if (activePane === paneName) {
      const remaining = paneOrder.filter(p => p !== paneName);
      setActivePane(remaining[remaining.length - 1] || null);
    }
  };

  const minimizePane = (paneName) => {
    setPanes(prev => ({
      ...prev,
      [paneName]: { ...prev[paneName], isMinimized: true }
    }));
  };

  const toggleMaximizePane = (paneName) => {
    setPanes(prev => ({
      ...prev,
      [paneName]: { ...prev[paneName], isMaximized: !prev[paneName].isMaximized }
    }));
  };

  const focusPane = (paneName) => {
    setActivePane(paneName);
  };

  const handleTaskbarClick = (paneName) => {
    const pane = panes[paneName];
    if (pane.isMinimized) {
      setPanes(prev => ({
        ...prev,
        [paneName]: { ...prev[paneName], isMinimized: false }
      }));
      setActivePane(paneName);
    } else if (activePane === paneName) {
      minimizePane(paneName);
    } else {
      setActivePane(paneName);
    }
  };

  const getZIndex = (paneName) => {
    if (activePane === paneName) return 1000;
    const index = paneOrder.indexOf(paneName);
    return 100 + index;
  };

  const handleSizeChange = (paneName, newSize) => {
    setSavedSizes(prev => ({
      ...prev,
      [paneName]: newSize
    }));
  };

  const handlePositionChange = (paneName, newPosition) => {
    setSavedPositions(prev => ({
      ...prev,
      [paneName]: newPosition
    }));
  };

  const getInitialPosition = (paneName) => {
    // Als er een opgeslagen positie is, gebruik die
    if (savedPositions[paneName]) {
      return savedPositions[paneName];
    }
    // Anders gebruik cascade offset
    return {
      left: 100 + cascadeOffset,
      top: 50 + cascadeOffset
    };
  };

  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="desktop" onClick={() => setIsStartOpen(false)}>
      <div className="shortcuts-area">
        {Object.entries(paneConfig).map(([paneName, config]) => (
          <div key={paneName} className="shortcut" onDoubleClick={() => openPane(paneName)}>
            {config.desktopIcon.endsWith('.ico') || config.desktopIcon.endsWith('.png') ? (
              <img src={config.desktopIcon} alt={config.desktopLabel} className="shortcut-icon" />
            ) : (
              <span className="shortcut-icon" style={{ fontSize: '32px' }}>{config.desktopIcon}</span>
            )}
            <span className="shortcut-label">{config.desktopLabel}</span>
          </div>
        ))}
      </div>

      <div className="pane-layer">
        {Object.entries(paneConfig).map(([paneName, config]) => {
          const pane = panes[paneName];
          if (!pane.isOpen) return null;

          const Component = config.component;
          
          return (
            <div key={paneName} style={{ display: pane.isMinimized ? 'none' : 'block' }}>
              <Pane 
                title={config.title}
                type={paneName}
                isMaximized={pane.isMaximized}
                onMaximize={() => toggleMaximizePane(paneName)}
                onClose={() => closePane(paneName)}
                onMinimize={() => minimizePane(paneName)}
                onFocus={() => focusPane(paneName)}
                zIndex={getZIndex(paneName)}
                savedSize={savedSizes[paneName]}
                onSizeChange={(newSize) => handleSizeChange(paneName, newSize)}
                initialPosition={getInitialPosition(paneName)}
                onPositionChange={(newPosition) => handlePositionChange(paneName, newPosition)}
              >
                <Component />
              </Pane>
            </div>
          );
        })}
      </div>

      {isStartOpen && (
        <div className="start-menu" onClick={(e) => e.stopPropagation()}>
          <div className="start-menu-header">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser}`} alt="user" className="start-user-img" />
            <span className="start-user-name">{currentUser}</span>
          </div>
          <div className="start-menu-main">
            <div className="start-left-col">
              {Object.entries(paneConfig).map(([paneName, config]) => (
                <div key={paneName} className="start-item" onClick={() => openPane(paneName)}>
                  {config.desktopIcon.endsWith('.ico') || config.desktopIcon.endsWith('.png') ? (
                    <img src={config.desktopIcon} alt="icon" style={{ width: '24px', height: '24px' }} />
                  ) : (
                    <span style={{ fontSize: '24px' }}>{config.desktopIcon}</span>
                  )}
                  <span>{config.desktopLabel}</span>
                </div>
              ))}
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
          {paneOrder.map((paneName) => {
            const pane = panes[paneName];
            const config = paneConfig[paneName];
            if (!pane.isOpen) return null;

            return (
              <div 
                key={paneName}
                className={`taskbar-tab ${!pane.isMinimized && activePane === paneName ? 'active' : ''}`} 
                onClick={() => handleTaskbarClick(paneName)}
              >
                <span className="taskbar-icon">{config.icon}</span> {config.label}
              </div>
            );
          })}
        </div>
        <div className="systray">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>
  );
}

export default App;