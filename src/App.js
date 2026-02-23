// src/App.js
/**
 * Chatlon App - Main Component
 * 
 * Orchestreert alle hooks en rendert de desktop omgeving.
 */

import React, { useState, useEffect, useRef } from 'react';
import Pane from './components/Pane';
import LoginScreen from './components/screens/LoginScreen';
import ConversationPane from './components/panes/ConversationPane';
import BootSequence from './components/screens/BootSequence';
import ToastNotification from './components/ToastNotification';
import ControlPane from './components/ControlPane';
import { gun, user } from './gun';
import { paneConfig } from './paneConfig';
import './App.css';
import { log } from './utils/debug';
import { useSuperpeer } from './hooks/useSuperpeer';
import { useSounds } from './hooks/useSounds';

// Hooks
import { useToasts } from './hooks/useToasts';
import { usePresence } from './hooks/usePresence';
import { usePaneManager } from './hooks/usePaneManager';
import { useMessageListeners } from './hooks/useMessageListeners';
import { useActiveTabSessionGuard } from './hooks/useActiveTabSessionGuard';

import { runFullCleanup } from './utils/gunCleanup';
import { STATUS_OPTIONS, getPresenceStatus } from './utils/presenceUtils';
import { clearEncryptionCache } from './utils/encryption';
import { canAttachPresenceListeners } from './utils/contactModel';
import {
  POST_LOGIN_CLEANUP_DELAY_MS,
  SESSION_RELOAD_DELAY_MS,
  SESSION_POST_CLOSE_RELOAD,
  SESSION_POST_CLOSE_STAY_ON_LOGIN,
  SESSION_POST_CLOSE_SHUTDOWN_BOOT_RELOAD,
  SESSION_CLOSE_REASON_CONFLICT,
  SESSION_CLOSE_REASON_MANUAL_LOGOFF,
  SESSION_CLOSE_REASON_MANUAL_SHUTDOWN
} from './utils/sessionConstants';
import {
  createConflictSessionNotice,
  saveSessionNotice,
  loadSessionNotice,
  clearSessionNotice
} from './utils/sessionNotice';
import { useScanlinesPreference } from './contexts/ScanlinesContext';
import { useSettings } from './contexts/SettingsContext';
import { useAvatar } from './contexts/AvatarContext';
import { useWallpaper } from './contexts/WallpaperContext';


// Helper: lees lokale naam uit chatlon_users localStorage
function getLocalUserInfo(email) {
  try {
    const users = JSON.parse(localStorage.getItem('chatlon_users') || '[]');
    const normalized = users.map(u => typeof u === 'string' ? { email: u, localName: u } : u);
    return normalized.find(u => u.email === email) || null;
  } catch { return null; }
}

function getOrCreateTabClientId() {
  const key = 'chatlon_tab_client_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `client_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

function isRememberMeEnabled() {
  return localStorage.getItem('chatlon_remember_me') === 'true';
}

function App() {
  // ============================================
  // AUTH STATE
  // ============================================
  const { scanlinesEnabled } = useScanlinesPreference();
  const [hasBooted, setHasBooted] = useState(() => {
    // Boot alleen bij eerste bezoek of na expliciete restart
    const skipBoot = sessionStorage.getItem('chatlon_boot_complete');
    return skipBoot === 'true';
  });
  const justBootedRef = useRef(false);
  const [isShutdown, setIsShutdown] = useState(false);
  const [isLoggingOff, setIsLoggingOff] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [sessionNotice, setSessionNotice] = useState(() => loadSessionNotice());
  const [unreadChats, setUnreadChats] = React.useState(new Set());
  const [nowPlaying, setNowPlaying] = useState(null);
  const [messengerSignedIn, setMessengerSignedIn] = useState(false);
  const messengerSignedInRef = useRef(false); // ref voor gebruik in callbacks
  messengerSignedInRef.current = messengerSignedIn; // altijd in sync

  const [showSystrayMenu, setShowSystrayMenu] = useState(false);
  const systrayMenuRef = useRef(null);
  const systrayIconRef = useRef(null);
  const tabClientIdRef = useRef(getOrCreateTabClientId());
  const cleanupTimeoutRef = useRef(null);
  const conflictHandlerRef = useRef(null);
  const sessionGenerationRef = useRef(0);
  const authStateRef = useRef({ isLoggedIn: false, currentUser: '' });
  authStateRef.current = { isLoggedIn, currentUser };

  // FIX: Track of we al geÃ¯nitialiseerd zijn om dubbele openPane te voorkomen
  const hasInitializedRef = useRef(false);

  // ============================================
  // HOOKS
  // ============================================
  const { settings } = useSettings();
  const { getAvatar, getDisplayName } = useAvatar();
  // Refs zodat Gun-callbacks altijd de meest actuele versie hebben
  const getDisplayNameRef = useRef(getDisplayName);
  getDisplayNameRef.current = getDisplayName;
  const { getWallpaperStyle } = useWallpaper();
  const { playSound, playSoundAsync } = useSounds();
  
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
    closeAllConversations,
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
  } = usePresence(isLoggedIn, currentUser, messengerSignedIn);

  

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

  // STAP A: Ongelezen status + systray bolletje â€” alleen als Messenger actief is
  if (messengerSignedInRef.current && (!isFocused || !isOpen)) {
    setUnreadChats(prev => new Set(prev).add(chatPaneId));
  }

  // STAP B: Toast en geluid alleen als Chatlon Messenger actief is
  // Toon ook wanneer chat gesloten/minimized is, zelfs als deze pane-id nog active lijkt.
  if ((!isFocused || !isOpen) && messengerSignedInRef.current) {
    const isNudge = msg.type === 'nudge';
    // Geluid: nudge heeft eigen geluid via ConversationPane, geen berichtgeluid
    if (!isNudge) playSound('message');
    // Toast: nudge krijgt eigen toast via handleNudge, geen berichtentoast
    if (!isNudge && settings.toastNotifications) {
      showToast({
        type: 'message',
        contactName: senderName,
        from: getDisplayNameRef.current(senderName),
        message: msg.content,
        avatar: getAvatar(senderName),
        messageId: msgId,
        sessionId: sessionId
      });
    }
    if (isNudge) handleNudgeRef.current(senderName);
  }
}, [currentUser, showToast, setUnreadChats, activePaneRef, conversationsRef, playSound, settings, getAvatar]);
  // Message listeners initialisatie
  const { 
    cleanup: cleanupListeners 
  } = useMessageListeners({
    isLoggedIn,
    currentUser,
    conversationsRef,
    activePaneRef,
    onMessage: handleIncomingMessage,
    onNotification: (contactName, timeRef) => {
      setNotificationTime(contactName, timeRef);
    },
    // showToast wrapper: zorg dat altijd de displaynaam getoond wordt
    showToast: (toastData) => {
      const identifier = toastData.contactName || toastData.from || '';
      showToast({
        ...toastData,
        from: getDisplayNameRef.current(identifier) || identifier,
      });
    },
    shownToastsRef,
    getAvatar
  });
  // Superpeer management
  const {
    isSuperpeer,
    connectedSuperpeers,
    relayStatus,
    forceReconnect
  } = useSuperpeer(isLoggedIn, currentUser);


  const {
    beginSessionClose,
    resetSessionState,
    consumeSessionKickAlert
  } = useActiveTabSessionGuard({
    isLoggedIn,
    currentUser,
    tabClientId: tabClientIdRef.current,
    onConflict: (data) => {
      if (conflictHandlerRef.current) {
        conflictHandlerRef.current(data);
      }
    }
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
        resetSessionState();
        setIsLoggedIn(true);
        setCurrentUser(user.is.alias);
        
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
  }, [resetSessionState]); // FIX: Alleen bij mount in praktijk; resetSessionState is stabiel

  // ============================================
  // HANDLERS
  // ============================================

  const clearPendingCleanupTimeout = () => {
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }
  };

  const dismissSessionNotice = React.useCallback(() => {
    clearSessionNotice();
    setSessionNotice(null);
  }, []);

  const resetPresenceMonitorState = () => {
    presencePrevRef.current = {};
    presenceListenersRef.current.forEach(node => { if (node.off) node.off(); });
    presenceListenersRef.current = new Map();
  };

  const runSessionTeardown = () => {
    cleanupPresence();
    cleanupListeners();
    resetShownToasts();
    resetAll();
    clearEncryptionCache();

    hasInitializedRef.current = false;
    setMessengerSignedIn(false);
    resetPresenceMonitorState();
    clearPendingCleanupTimeout();

    if (!isRememberMeEnabled()) {
      localStorage.removeItem('chatlon_credentials');
    }

    user.leave();
    setIsLoggedIn(false);
    setCurrentUser('');
  };

  const closeSession = async ({
    reason,
    showLogoffScreen = false,
    playLogoffSound = false,
    showConflictAlert = false,
    postClose = SESSION_POST_CLOSE_RELOAD
  }) => {
    if (!beginSessionClose()) {
      log('[App] Session close already in progress, skipping:', reason);
      return false;
    }
    sessionGenerationRef.current += 1;

    log('[App] Closing session. Reason:', reason);

    if (showLogoffScreen) {
      setIsLoggingOff(true);
    }

    runSessionTeardown();

    if (showConflictAlert && consumeSessionKickAlert()) {
      const notice = createConflictSessionNotice();
      saveSessionNotice(notice);
      setSessionNotice(notice);
    }

    const finishClose = () => {
      if (postClose === SESSION_POST_CLOSE_SHUTDOWN_BOOT_RELOAD) {
        sessionStorage.removeItem('chatlon_boot_complete');
        window.location.reload();
        return;
      }
      if (postClose === SESSION_POST_CLOSE_STAY_ON_LOGIN) {
        setIsLoggingOff(false);
        return;
      }
      window.location.reload();
    };

    if (postClose !== SESSION_POST_CLOSE_RELOAD && postClose !== SESSION_POST_CLOSE_SHUTDOWN_BOOT_RELOAD && postClose !== SESSION_POST_CLOSE_STAY_ON_LOGIN) {
      log('[App] Unknown postClose mode, defaulting to reload:', postClose);
    }

    if (playLogoffSound) {
      await playSoundAsync('logoff');
      finishClose();
      return true;
    }

    setTimeout(() => {
      finishClose();
    }, SESSION_RELOAD_DELAY_MS);
    return true;
  };

  conflictHandlerRef.current = () => {
    const authState = authStateRef.current;
    if (!authState.isLoggedIn || !authState.currentUser) return;
    void closeSession({
      reason: SESSION_CLOSE_REASON_CONFLICT,
      showLogoffScreen: true,
      playLogoffSound: true,
      showConflictAlert: true,
      postClose: SESSION_POST_CLOSE_STAY_ON_LOGIN
    });
  };
  
  const handleLoginSuccess = (username) => {
    log('[App] Login success:', username);
    sessionGenerationRef.current += 1;
    const cleanupGeneration = sessionGenerationRef.current;
    hasInitializedRef.current = true;
    resetSessionState();
    dismissSessionNotice();
    setIsLoggedIn(true);
    setCurrentUser(username);

    playSound('login');

    clearPendingCleanupTimeout();
    cleanupTimeoutRef.current = setTimeout(() => {
      const authState = authStateRef.current;
      if (
        sessionGenerationRef.current !== cleanupGeneration ||
        !authState.isLoggedIn ||
        authState.currentUser !== username
      ) {
        log('[App] Skipping stale delayed cleanup for:', username);
        cleanupTimeoutRef.current = null;
        return;
      }
      runFullCleanup(username);
      cleanupTimeoutRef.current = null;
    }, POST_LOGIN_CLEANUP_DELAY_MS);
  };

  
  const handleLogoff = async () => {
    log('[App] Logging off...');
    await closeSession({
      reason: SESSION_CLOSE_REASON_MANUAL_LOGOFF,
      showLogoffScreen: true,
      playLogoffSound: true,
      postClose: SESSION_POST_CLOSE_STAY_ON_LOGIN
    });
  };
  // Trigger shutdown vanuit ingelogde sessie via dezelfde teardown pipeline.
  const handleShutdown = async () => {
    log('[App] Shutting down...');
    await closeSession({
      reason: SESSION_CLOSE_REASON_MANUAL_SHUTDOWN,
      showLogoffScreen: true,
      playLogoffSound: true,
      postClose: SESSION_POST_CLOSE_SHUTDOWN_BOOT_RELOAD
    });
  };

  useEffect(() => {
    return () => {
      clearPendingCleanupTimeout();
    };
  }, []);

  // Systray menu click-outside
  useEffect(() => {
    if (!showSystrayMenu) return;
    const handleClick = (e) => {
      if (systrayMenuRef.current && !systrayMenuRef.current.contains(e.target) &&
          systrayIconRef.current && !systrayIconRef.current.contains(e.target)) {
        setShowSystrayMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSystrayMenu]);

  const currentStatusOption = STATUS_OPTIONS.find(s => s.value === userStatus) || STATUS_OPTIONS[0];

  // Gedeelde presence state â€” gevuld door ContactsPane, gelezen door ConversationPane
  const [sharedContactPresence, setSharedContactPresence] = React.useState({});

  const handlePresenceChange = React.useCallback((username, presenceData) => {
    setSharedContactPresence(prev => ({ ...prev, [username]: presenceData }));
  }, []);

  const handleContactOnline = React.useCallback((contactUsername) => {
    if (!messengerSignedInRef.current) return;
    if (!settings.toastNotifications) return;
    showToast({
      type: 'presence',
      contactName: contactUsername,
      from: getDisplayNameRef.current(contactUsername),
      message: 'is nu online',
      avatar: getAvatar(contactUsername),
    });
  }, [showToast, getAvatar, settings.toastNotifications]);

  const handleNudge = React.useCallback((contactUsername) => {
    if (!messengerSignedInRef.current) return;
    // Taakbalk + gesprek openen wordt al gedaan via handleIncomingMessage (useMessageListeners).
    // handleNudge hoeft alleen de toast te tonen.
    const chatPaneId = `conv_${contactUsername}`;
    const isFocused = activePaneRef.current === chatPaneId;
    if (!isFocused && settings.toastNotifications) {
      showToast({
        type: 'nudge',
        contactName: contactUsername,
        from: getDisplayNameRef.current(contactUsername),
        message: 'heeft je een nudge gestuurd!',
        avatar: getAvatar(contactUsername),
      });
    }
  }, [showToast, getAvatar, settings.toastNotifications, activePaneRef]);

  const handleNudgeRef = React.useRef(handleNudge);
  handleNudgeRef.current = handleNudge;

  // Ref zodat de Gun-listener altijd de actuele callback heeft
  const handleContactOnlineRef = React.useRef(handleContactOnline);
  handleContactOnlineRef.current = handleContactOnline;

  // Persistent refs voor PresenceMonitor â€” overleven React StrictMode double-mount cleanup.
  // Als ze lokaal in het effect staan worden ze gereset bij de tweede mount,
  // waardoor beginstand opnieuw opgeslagen wordt en de offlineâ†’online transitie gemist wordt.
  const presencePrevRef = React.useRef({});        // { username: { lastSeen, statusValue } }
  const presenceListenersRef = React.useRef(new Map()); // username -> gun node

  // Presence monitoring â€” altijd actief, ongeacht of ContactsPane open is
  React.useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    log('[PresenceMonitor] Start voor:', currentUser);
    // Gebruik REFS voor prevPresence en contactListeners zodat ze React StrictMode
    // double-mount overleven. Als ze lokaal in het effect staan, worden ze gereset
    // bij de tweede mount â€” dan slaat de eerste Gun callback de beginstand opnieuw
    // op en wordt de offlineâ†’online transitie nooit gezien.
    const prevPresence = presencePrevRef.current;
    const contactListeners = presenceListenersRef.current;

    const detachPresenceListener = (username) => {
      const existing = contactListeners.get(username);
      if (!existing) return;
      if (existing.off) existing.off();
      contactListeners.delete(username);
      delete prevPresence[username];
      log('[PresenceMonitor] Listener verwijderd voor contact:', username);
    };

    const contactsMapNode = user.get('contacts').map();
    contactsMapNode.on((contactData, key) => {
      const usernameFromData = typeof contactData?.username === 'string' ? contactData.username : '';
      const fallbackUsername = typeof key === 'string' ? key : '';
      const username = usernameFromData || fallbackUsername;
      const isEligible = Boolean(contactData && username && canAttachPresenceListeners(contactData));

      if (!isEligible) {
        if (username) detachPresenceListener(username);
        return;
      }

      if (contactListeners.has(username)) return;

      log('[PresenceMonitor] Listener op voor contact:', username);
      const node = gun.get('PRESENCE').get(username);
      node.on((presenceData) => {
        // Eerste call: sla beginstand op als primitieven, geen toast.
        // â€˜username in prevPresenceâ€™ is false bij de echte allereerste call.
        // Na StrictMode cleanup+remount is de data al in prevPresence (via ref) â€”
        // dan slaan we de beginstand NIET opnieuw op en blijft de transitie zichtbaar.
        if (!(username in prevPresence)) {
          if (presenceData) {
            prevPresence[username] = {
              lastSeen: presenceData.lastSeen || 0,
              statusValue: getPresenceStatus(presenceData).value
            };
          } else {
            prevPresence[username] = null;
          }
          return;
        }
        if (!presenceData) return;

        const newStatus = getPresenceStatus(presenceData);
        const prevStatusValue = prevPresence[username]?.statusValue ?? 'offline';

        if (prevStatusValue === newStatus.value) {
          return;
        }

        log('[PresenceMonitor]', username, '| prev:', prevStatusValue, '-> new:', newStatus.value);

        if (prevStatusValue === 'offline' && newStatus.value !== 'offline') {
          log('[PresenceMonitor] ONLINE TRANSITIE voor:', username);
          handleContactOnlineRef.current(username);
        }

        // Sla nieuwe state op als primitieven (nooit als object-referentie)
        prevPresence[username] = {
          lastSeen: presenceData.lastSeen || 0,
          statusValue: newStatus.value
        };
      });
      contactListeners.set(username, node);
    });
    return () => {
      contactsMapNode.off();
    };

  }, [isLoggedIn, currentUser]);


  const handleToastClick = (toast) => {
  if (toast.type === 'message') {
    const paneId = `conv_${toast.contactName}`;
    onTaskbarClick(paneId);
  } else if (toast.type === 'presence') {
    const paneId = `conv_${toast.contactName}`;
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
  // RENDER: LOGOFF SCREEN
  // ============================================
  if (isLoggingOff) {
    return (
      <div className="logoff-screen">
        <div className="logoff-content">
          <div className="logoff-logo">Chatlon</div>
          <div className="logoff-message">U wordt afgemeld...</div>
          <div className="logoff-progress">
            <div className="logoff-progress-bar" />
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: SHUTDOWN SCREEN
  // ============================================
  if (isShutdown) {
    return (
      <div className="shutdown-screen">
        <div className="shutdown-content">
          <div className="shutdown-message">De computer is uitgeschakeld.</div>
          <button
            className="power-on-button"
            onClick={() => {
              sessionStorage.removeItem('chatlon_boot_complete');
              setIsShutdown(false);
              setHasBooted(false);
            }}
          >
            <span className="power-on-icon">â»</span>
          </button>
          <div className="power-on-hint">Druk op de aan/uit-knop om de computer te starten</div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: BOOT SEQUENCE
  // ============================================
  if (!hasBooted) {
    return <BootSequence onBootComplete={() => { justBootedRef.current = true; setHasBooted(true); }} />;
  }

  // ============================================
  // RENDER: LOGIN SCREEN
  // ============================================
  if (!isLoggedIn) {
    const fromBoot = justBootedRef.current;
    justBootedRef.current = false;
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        fadeIn={fromBoot}
        onShutdown={() => setIsShutdown(true)}
        sessionNotice={sessionNotice}
        onDismissSessionNotice={dismissSessionNotice}
      />
    );
  }

  // ============================================
  // RENDER: DESKTOP
  // ============================================
  return (
    <div className="desktop" onClick={closeStartMenu} style={getWallpaperStyle()} data-theme={settings.colorScheme !== 'blauw' ? settings.colorScheme : undefined} data-fontsize={settings.fontSize !== 'normaal' ? settings.fontSize : undefined}>
      <div id="portal-root"></div>
      <div className={`scanlines-overlay ${scanlinesEnabled ? '' : 'disabled'}`}></div>
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
                isActive={activePane === paneName}
                savedSize={savedSizes[paneName]}
                onSizeChange={(newSize) => handleSizeChange(paneName, newSize)}
                initialPosition={pane.initialPos || getInitialPosition(paneName)}
                onPositionChange={(newPosition) => handlePositionChange(paneName, newPosition)}
              >
                {paneName === 'contacts' ? (
                  <Component
                    onOpenConversation={openConversation}
                    userStatus={userStatus}
                    onStatusChange={handleStatusChange}
                    onLogoff={handleLogoff}
                    onSignOut={() => { closeAllConversations(); }}
                    onClosePane={() => { closeAllConversations(); setMessengerSignedIn(false); closePane('contacts'); }}
                    nowPlaying={nowPlaying}
                    currentUserEmail={currentUser}
                    messengerSignedIn={messengerSignedIn}
                    setMessengerSignedIn={setMessengerSignedIn}
                    onContactOnline={handleContactOnline}
                    onPresenceChange={handlePresenceChange}
                  />
                ) : paneName === 'media' ? (
                  <Component
                    onNowPlayingChange={setNowPlaying}
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
                title={`${getDisplayName(conv.contactName)} - Gesprek`}
                type="conversation"
                isMaximized={conv.isMaximized}
                onMaximize={() => toggleMaximizeConversation(convId)}
                onClose={() => closeConversation(convId)}
                onMinimize={() => minimizeConversation(convId)}
                zIndex={getZIndex(convId)} // EN DEZE GEEF JE DOOR
                onFocus={() => focusPane(convId)}
                isActive={activePane === convId}
                savedSize={savedSizes[convId]}
                onSizeChange={(newSize) => handleSizeChange(convId, newSize)}
                initialPosition={getInitialPosition(convId)}
                onPositionChange={(newPosition) => handlePositionChange(convId, newPosition)}
              >
                <ConversationPane contactName={conv.contactName} lastNotificationTime={unreadMetadata[conv.contactName]} clearNotificationTime={clearNotificationTime} contactPresenceData={sharedContactPresence[conv.contactName]} />
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
              src={(() => {
                const info = getLocalUserInfo(currentUser);
                if (info?.localAvatar) return `/avatars/${info.localAvatar}`;
                return getAvatar(currentUser);
              })()}
              alt="user"
              className="start-user-img"
            />
            <span className="start-user-name">{getLocalUserInfo(currentUser)?.localName || currentUser}</span>
          </div>
          <div className="start-menu-main">
            <div className="start-left-col">
              {Object.entries(paneConfig).map(([paneName, config]) => (
                <div 
                  key={paneName} 
                  className="start-item" 
                  onClick={() => {
                    openPane(paneName);
                    closeStartMenu();
                  }}
                >
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
              <div 
                className="start-item-gray"
                onClick={() => {
                  // openPane('documents'); // als je dit later implementeert
                  closeStartMenu();
                }}
              >
                My Documents
              </div>
              <div 
                className="start-item-gray"
                onClick={() => {
                  // openPane('computer'); // als je dit later implementeert
                  closeStartMenu();
                }}
              >
                My Computer
              </div>
            </div>
          </div>
          <div className="start-menu-footer">
            <button className="logoff-btn" onClick={handleLogoff}>Log Off</button>
            <button className="shutdown-btn" onClick={handleShutdown}>Shut Down</button>
          </div>
        </div>
      )}

      {/* Taskbar */}
      <div className="taskbar">
        <button 
          className={`start-btn ${isStartOpen ? 'pressed' : ''}`} 
          onClick={(e) => { e.stopPropagation(); toggleStartMenu(); }}
        >
          <span className="start-icon">ðŸªŸ</span> Start
        </button>
        
        <div className="taskbar-items">
  {/* We maken een unieke lijst van alles wat open is Ã‰N alles wat ongelezen is */}
  {Array.from(new Set([...paneOrder, ...Array.from(unreadChats)])).map((paneId) => {
    
  // NEW - Met title tooltips
  if (paneId.startsWith('conv_')) {
    const contactName = paneId.replace('conv_', '');
    const conv = conversations[paneId];
    const isUnread = unreadChats.has(paneId);
    
    if (!conv?.isOpen && !isUnread) return null;

    return (
      <div
        key={paneId}
        className={`taskbar-tab ${activePane === paneId ? 'active' : ''} ${isUnread ? 'unread' : ''}`}
        onClick={() => onTaskbarClick(paneId)}
        title={`${getDisplayName(contactName)} - Gesprek`}
      >
        <span className="taskbar-icon">ðŸ’¬</span>
        <span>{getDisplayName(contactName)}</span>
      </div>
    );
  }

  const pane = panes[paneId];
  if (!pane || !pane.isOpen) return null;
  const config = paneConfig[paneId];
  return (
    <div 
      key={paneId} 
      className={`taskbar-tab ${activePane === paneId ? 'active' : ''}`} 
      onClick={() => onTaskbarClick(paneId)}
      title={config.title || config.label}
    >
      <span className="taskbar-icon">{config.icon}</span>
      <span>{config.label}</span>
    </div>
  );
  })}
</div>

        <div className="systray">
          {isSuperpeer && <span className="superpeer-badge" title={`Superpeer actief | ${connectedSuperpeers} peer(s) verbonden`}>ðŸ“¡</span>}
          {isLoggedIn && (
            <span
              className={`relay-status-badge ${relayStatus.anyOnline ? 'relay-online' : 'relay-offline'}`}
              title={relayStatus.anyOnline
                ? `Relay verbonden${isSuperpeer ? ' | Superpeer actief' : ''} | ${connectedSuperpeers} peer(s)`
                : 'Relay offline â€” klik om te reconnecten'
              }
              onClick={() => !relayStatus.anyOnline && forceReconnect()}
            >
              {relayStatus.anyOnline ? 'ðŸŸ¢' : 'ðŸ”´'}
            </span>
          )}
          {isLoggedIn && messengerSignedIn && (
            <span
              ref={systrayIconRef}
              className="systray-chatlon-icon"
              title={`Chatlon - ${currentStatusOption.label} (${getDisplayName(currentUser)})`}
              onClick={(e) => { e.stopPropagation(); setShowSystrayMenu(prev => !prev); }}
            >
              <span className="systray-chatlon-figure">ðŸ’¬</span>
              <span className="systray-status-dot" style={{ backgroundColor: currentStatusOption.color }}></span>
            </span>
          )}
          {showSystrayMenu && (
            <div ref={systrayMenuRef} className="systray-menu" onClick={(e) => e.stopPropagation()}>
              <div className="systray-menu-header">
                <img src={getAvatar(currentUser)} alt="" className="systray-menu-avatar" />
                <div className="systray-menu-user">
                  <div className="systray-menu-name">{getDisplayName(currentUser)}</div>
                  <div className="systray-menu-status" style={{ color: currentStatusOption.color }}>{currentStatusOption.label}</div>
                </div>
              </div>
              <div className="dropdown-separator" />
              {STATUS_OPTIONS.map(opt => (
                <div
                  key={opt.value}
                  className={`dropdown-item ${userStatus === opt.value ? 'dropdown-item-checked' : ''}`}
                  onClick={() => { handleStatusChange(opt.value); setShowSystrayMenu(false); }}
                >
                  <span className="systray-status-indicator" style={{ backgroundColor: opt.color }}></span>
                  <span className="dropdown-item-label">{opt.label}</span>
                </div>
              ))}
              <div className="dropdown-separator" />
              <div className="dropdown-item" onClick={() => { openPane('contacts'); setShowSystrayMenu(false); }}>
                <span className="dropdown-item-label">Chatlon openen</span>
              </div>
              <div className="dropdown-item" onClick={() => { closeAllConversations(); setMessengerSignedIn(false); setShowSystrayMenu(false); }}>
                <span className="dropdown-item-label">Afmelden</span>
              </div>
              <div className="dropdown-separator" />
              <div className="dropdown-item" onClick={() => { closeAllConversations(); setMessengerSignedIn(false); closePane('contacts'); setShowSystrayMenu(false); }}>
                <span className="dropdown-item-label">Afsluiten</span>
              </div>
            </div>
          )}
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
