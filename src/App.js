// src/App.js
/**
 * Chatlon App - Main Component
 * 
 * Orchestreert alle hooks en rendert de desktop omgeving.
 */

import React, { useState, useEffect, useRef } from 'react';
import Pane from './Pane';
import LoginScreen from './LoginScreen';
import ConversationPane from './ConversationPane';
import BootSequence from './BootSequence';
import ToastNotification from './ToastNotification';
import { gun, user } from './gun';
import { paneConfig } from './paneConfig';
import './App.css';
import { log } from './utils/debug';

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
  const [unreadChats, setUnreadChats] = React.useState(new Set());
  
  // FIX: Track of we al geïnitialiseerd zijn om dubbele openPane te voorkomen
  const hasInitializedRef = useRef(false);

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
    resetAll,
    setNotificationTime,
    unreadMetadata,
    clearNotificationTime
  } = usePaneManager();

  // Presence management
  const { 
    userStatus, 
    handleStatusChange, 
    cleanup: cleanupPresence 
  } = usePresence(isLoggedIn, currentUser);

  // Message listeners
// ============================================
  // MESSAGE HANDLER (voor Toasts)
  // ============================================
  
const handleIncomingMessage = React.useCallback((msg, senderName, msgId, sessionId) => {
  const isSelf = msg.sender === currentUser;
  if (isSelf) return;

  const chatPaneId = `conv_${senderName}`;
  const isFocused = activePaneRef.current === chatPaneId;
  const conv = conversationsRef.current[chatPaneId];
  const isOpen = conv && conv.isOpen && !conv.isMinimized;

  // STAP A: Update alleen de ongelezen status (geen venster openen!)
  if (!isFocused || !isOpen) {
    setUnreadChats(prev => new Set(prev).add(chatPaneId));
  }

  // STAP B: Altijd toast tonen als we niet in de chat zitten
  if (!isFocused) {
    const toastKey = `msg_${msgId}`;
    if (!shownToastsRef.current.has(toastKey)) {
      shownToastsRef.current.add(toastKey);
      showToast({
        type: 'message',
        contactName: senderName,
        from: senderName,
        message: msg.content,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${senderName}`,
        messageId: msgId,
        sessionId: sessionId
      });
    }
  }
}, [currentUser, showToast, setUnreadChats]);
  // Belangrijk: openConversation en minimizeConversation moeten in de dependency array!
  // Message listeners initialisatie
  const { 
    cleanup: cleanupListeners 
  } = useMessageListeners({
    isLoggedIn,
    currentUser,
    conversationsRef,
    activePaneRef,
    onMessage: handleIncomingMessage, // Geef onze opgeschoonde handler door
    onNotification: (contactName, timeRef) => {
      setNotificationTime(contactName, timeRef);
    },
    showToast,
    shownToastsRef
  });

  // ============================================
  // AUTO-LOGIN CHECK
  // ============================================
  useEffect(() => {
    // FIX: Guard tegen dubbele uitvoering
    if (hasInitializedRef.current) {
      log('[App] Already initialized, skipping');
      return;
    }

    log('[App] Checking for existing session...');

    const initializeUser = () => {
      if (user.is && user.is.alias) {
        // FIX: Alleen 1x initialiseren
        if (hasInitializedRef.current) return true;
        hasInitializedRef.current = true;
        
        log('[App] User already logged in:', user.is.alias);
        setIsLoggedIn(true);
        setCurrentUser(user.is.alias);
        
        // FIX: Gebruik setTimeout buiten React cycle
        setTimeout(() => {
          openPane('contacts');
        }, 100);
        
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
  }, []); // FIX: Lege dependency array - alleen bij mount

  // ============================================
  // HANDLERS
  // ============================================
  
  const handleLoginSuccess = (username) => {
    log(('[App] Login success:', username);
    hasInitializedRef.current = true; // FIX: Markeer als geïnitialiseerd
    setIsLoggedIn(true);
    setCurrentUser(username);
    setTimeout(() => openPane('contacts'), 100);
  };

  const handleLogoff = () => {
    log('[App] Logging off...');
    
    // Cleanup
    cleanupPresence();
    cleanupListeners();
    resetShownToasts();
    resetAll();
    
    // FIX: Reset initialized flag
    hasInitializedRef.current = false;
    
    // Logout
    user.leave();
    setIsLoggedIn(false);
    setCurrentUser('');
    
    // Reload
    window.location.reload();
  };

  const handleToastClick = (toast) => {
  if (toast.type === 'message') {
    const paneId = `conv_${toast.contactName}`;
    // Gebruik de nieuwe klik-logica om alles in één keer te doen
    onTaskbarClick(paneId);
  } else if (toast.type === 'friendRequest') {
    openPane('contacts');
  }
};

const onTaskbarClick = React.useCallback((paneId) => {
  log('[App] Taakbalk klik op:', paneId);

  // 1. Als het een chat is, zorg dat hij ECHT open gaat
  if (paneId.startsWith('conv_')) {
    const contactName = paneId.replace('conv_', '');
    
    // Forceer openen in PaneManager
    openConversation(contactName); 
    
    // Haal uit ongelezen lijst
    setUnreadChats(prev => {
      const next = new Set(prev);
      next.delete(paneId);
      return next;
    });
  } else {
    // Normale panes
    handleTaskbarClick(paneId);
  }
}, [handleTaskbarClick, openConversation]);

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
          if (!pane || !pane.isOpen) return null;

          const Component = config.component;

          return (
            <div key={paneName} onMouseDown={() => focusPane(paneName)} style={{ display: pane.isMinimized ? 'none' : 'block', zIndex: getZIndex(paneName), position: 'absolute'}}>
              <Pane
                title={config.title}
                type={paneName}
                isMaximized={pane.isMaximized}
                onMaximize={() => toggleMaximizePane(paneName)}
                onClose={() => closePane(paneName)}
                onMinimize={() => minimizePane(paneName)}
                zIndex={getZIndex(paneName)} // EN DEZE GEEF JE DOOR
                onFocus={() => focusPane(paneName)}
                savedSize={savedSizes[paneName]}
                onSizeChange={(newSize) => handleSizeChange(paneName, newSize)}
                initialPosition={pane.initialPos || getInitialPosition(paneName)}
                onPositionChange={(newPosition) => handlePositionChange(paneName, newPosition)}
              >
                {paneName === 'contacts' ? (
                  <Component 
                    onOpenConversation={openConversation}
                    // FIX: Pass presence props to ContactsPane
                    userStatus={userStatus}
                    onStatusChange={handleStatusChange}
                  />
                ) : (
                  <Component />
                )}
              </Pane>
            </div>
          );
        })}

        {/* Conversation Panes */}
        {Object.entries(conversations).map(([convId, conv]) => {
          if (!conv || !conv.isOpen) return null;

          return (
            <div 
              key={convId} 
              onMouseDown={() => focusPane(convId)} 
              style={{ display: conv.isMinimized ? 'none' : 'block', zIndex: getZIndex(convId), position: 'absolute'}}>
              <Pane
                title={`Gesprek met ${conv.contactName}`}
                type="conversation"
                isMaximized={conv.isMaximized}
                onMaximize={() => toggleMaximizeConversation(convId)}
                onClose={() => closeConversation(convId)}
                onMinimize={() => minimizeConversation(convId)}
                zIndex={getZIndex(convId)} // EN DEZE GEEF JE DOOR
                onFocus={() => focusPane(convId)}
                savedSize={savedSizes[convId]}
                onSizeChange={(newSize) => handleSizeChange(convId, newSize)}
                initialPosition={getInitialPosition(convId)}
                onPositionChange={(newPosition) => handlePositionChange(convId, newPosition)}
              >
                <ConversationPane contactName={conv.contactName} lastNotificationTime={unreadMetadata[conv.contactName]} clearNotificationTime={clearNotificationTime} />
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
  {/* We maken een unieke lijst van alles wat open is ÉN alles wat ongelezen is */}
  {Array.from(new Set([...paneOrder, ...Array.from(unreadChats)])).map((paneId) => {
    
    if (paneId.startsWith('conv_')) {
      const contactName = paneId.replace('conv_', '');
      const conv = conversations[paneId];
      const isUnread = unreadChats.has(paneId);
      
      // Als de chat niet open is en niet ongelezen, toon hem dan niet
      if (!conv?.isOpen && !isUnread) return null;

      return (
        <div
          key={paneId}
          className={`taskbar-tab ${activePane === paneId ? 'active' : ''} ${isUnread ? 'unread' : ''}`}
          onClick={() => onTaskbarClick(paneId)}
        >
          <span className="taskbar-icon">💬</span> {contactName}
        </div>
      );
    }
    
    // ... rest van je normale panes (contacts etc)
    const pane = panes[paneId];
    if (!pane || !pane.isOpen) return null;
    const config = paneConfig[paneId];
    return (
      <div key={paneId} className={`taskbar-tab ${activePane === paneId ? 'active' : ''}`} onClick={() => onTaskbarClick(paneId)}>
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