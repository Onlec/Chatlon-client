// src/App.js
/**
 * Chatlon App - Main Component
 * 
 * Orchestreert alle hooks en rendert de desktop omgeving.
 * Na refactor: ~200 regels in plaats van ~500+
 */

import React, { useState, useEffect } from 'react';
import Pane from './Pane';
import LoginScreen from './LoginScreen';
import ConversationPane from './ConversationPane';
import BootSequence from './BootSequence';
import ToastNotification from './ToastNotification';
import { gun, user } from './gun';
import { paneConfig } from './paneConfig';
import './App.css';

// Hooks
import { useToasts } from './hooks/useToasts';
import { usePresence } from './hooks/usePresence';
import { usePaneManager } from './hooks/usePaneManager';
import { useMessageListeners } from './hooks/useMessageListeners';

function App() {
  // ============================================
  // AUTH STATE
  // ============================================
  const [hasBooted, setHasBooted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState('');

  // ============================================
  // HOOKS
  // ============================================
  
  // Toast notifications
  const { 
    toasts, 
    showToast, 
    removeToast, 
    shownToastsRef,
    resetShownToasts 
  } = useToasts();

  // Pane/window management
  const {
    panes,
    paneOrder,
    activePane,
    savedSizes,
    conversations,
    isStartOpen,
    conversationsRef,
    activePaneRef,
    openPane,
    closePane,
    minimizePane,
    toggleMaximizePane,
    focusPane,
    openConversation,
    closeConversation,
    minimizeConversation,
    toggleMaximizeConversation,
    getZIndex,
    handleTaskbarClick,
    handleSizeChange,
    handlePositionChange,
    getInitialPosition,
    toggleStartMenu,
    closeStartMenu,
    resetAll
  } = usePaneManager();

  // Presence management
  const { 
    userStatus, 
    handleStatusChange, 
    cleanup: cleanupPresence 
  } = usePresence(isLoggedIn, currentUser);

  // Message listeners
  const { 
    cleanup: cleanupListeners 
  } = useMessageListeners({
    isLoggedIn,
    currentUser,
    conversationsRef,
    activePaneRef,
    showToast,
    shownToastsRef
  });

  // ============================================
  // AUTO-LOGIN CHECK
  // ============================================
  useEffect(() => {
    console.log('[App] Checking for existing session...');

    const initializeUser = () => {
      if (user.is && user.is.alias) {
        console.log('[App] User already logged in:', user.is.alias);
        setIsLoggedIn(true);
        setCurrentUser(user.is.alias);
        setTimeout(() => openPane('contacts'), 100);
        return true;
      }
      return false;
    };

    // Try immediately
    if (initializeUser()) return;

    // Poll for Gun auth
    let attempts = 0;
    const pollInterval = setInterval(() => {
      attempts++;
      if (initializeUser() || attempts > 20) {
        clearInterval(pollInterval);
      }
    }, 100);

    return () => clearInterval(pollInterval);
  }, [openPane]);

  // ============================================
  // HANDLERS
  // ============================================
  
  const handleLoginSuccess = (username) => {
    console.log('[App] Login success:', username);
    setIsLoggedIn(true);
    setCurrentUser(username);
    setTimeout(() => openPane('contacts'), 100);
  };

  const handleLogoff = () => {
    console.log('[App] Logging off...');
    
    // Cleanup
    cleanupPresence();
    cleanupListeners();
    resetShownToasts();
    resetAll();
    
    // Logout
    user.leave();
    setIsLoggedIn(false);
    setCurrentUser('');
    
    // Reload
    window.location.reload();
  };

  const handleToastClick = (toast) => {
    if (toast.type === 'message') {
      openConversation(toast.contactName);
    } else if (toast.type === 'friendRequest') {
      openPane('contacts');
    }
  };

  // ============================================
  // RENDER: BOOT SEQUENCE
  // ============================================
  if (!hasBooted) {
    return <BootSequence onBootComplete={() => setHasBooted(true)} />;
  }

  // ============================================
  // RENDER: LOGIN SCREEN
  // ============================================
  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // ============================================
  // RENDER: DESKTOP
  // ============================================
  return (
    <div className="desktop" onClick={closeStartMenu}>
      {/* Desktop Icons */}
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

      {/* Pane Layer */}
      <div className="pane-layer">
        {/* Normal Panes */}
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
                {paneName === 'contacts' ? (
                  <Component onOpenConversation={openConversation} />
                ) : (
                  <Component />
                )}
              </Pane>
            </div>
          );
        })}

        {/* Conversation Panes */}
        {Object.entries(conversations).map(([convId, conv]) => {
          if (!conv.isOpen) return null;

          return (
            <div key={convId} style={{ display: conv.isMinimized ? 'none' : 'block' }}>
              <Pane
                title={`Gesprek met ${conv.contactName}`}
                type="conversation"
                isMaximized={conv.isMaximized}
                onMaximize={() => toggleMaximizeConversation(convId)}
                onClose={() => closeConversation(convId)}
                onMinimize={() => minimizeConversation(convId)}
                onFocus={() => focusPane(convId)}
                zIndex={getZIndex(convId)}
                savedSize={savedSizes[convId]}
                onSizeChange={(newSize) => handleSizeChange(convId, newSize)}
                initialPosition={getInitialPosition(convId)}
                onPositionChange={(newPosition) => handlePositionChange(convId, newPosition)}
              >
                <ConversationPane contactName={conv.contactName} />
              </Pane>
            </div>
          );
        })}
      </div>

      {/* Start Menu */}
      {isStartOpen && (
        <div className="start-menu" onClick={(e) => e.stopPropagation()}>
          <div className="start-menu-header">
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser}`} 
              alt="user" 
              className="start-user-img" 
            />
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

      {/* Taskbar */}
      <div className="taskbar">
        <button 
          className={`start-btn ${isStartOpen ? 'pressed' : ''}`} 
          onClick={(e) => { e.stopPropagation(); toggleStartMenu(); }}
        >
          <span className="start-icon">🪟</span> Start
        </button>
        
        <div className="taskbar-items">
          {paneOrder.map((paneName) => {
            // Conversation
            if (paneName.startsWith('conv_')) {
              const conv = conversations[paneName];
              if (!conv) return null;

              return (
                <div
                  key={paneName}
                  className={`taskbar-tab ${!conv.isMinimized && activePane === paneName ? 'active' : ''}`}
                  onClick={() => handleTaskbarClick(paneName)}
                >
                  <span className="taskbar-icon">💬</span> {conv.contactName}
                </div>
              );
            }

            // Normal pane
            const pane = panes[paneName];
            const config = paneConfig[paneName];
            if (!pane || !pane.isOpen) return null;

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

        <div className="systray">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onClose={removeToast}
            onClick={handleToastClick}
          />
        ))}
      </div>
    </div>
  );
}

export default App;