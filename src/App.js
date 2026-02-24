// src/App.js
/**
 * Chatlon App - Main Component
 * 
 * Orchestreert alle hooks en rendert de desktop omgeving.
 */

import React, { useState, useEffect, useRef } from 'react';
import LoginScreen from './components/screens/LoginScreen';
import BootSequence from './components/screens/BootSequence';
import DesktopShell from './components/shell/DesktopShell';
import { user } from './gun';
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
import { useMessengerCoordinator } from './hooks/useMessengerCoordinator';
import { useSystrayManager } from './hooks/useSystrayManager';
import { useDesktopManager } from './hooks/useDesktopManager';
import { useDesktopCommandBus } from './hooks/useDesktopCommandBus';
import { useContextMenuManager } from './hooks/useContextMenuManager';
import { usePresenceCoordinator } from './hooks/usePresenceCoordinator';

import { runFullCleanup } from './utils/gunCleanup';
import { clearEncryptionCache } from './utils/encryption';
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
import { FEATURE_FLAGS } from './config/featureFlags';


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

  const tabClientIdRef = useRef(getOrCreateTabClientId());
  const cleanupTimeoutRef = useRef(null);
  const conflictHandlerRef = useRef(null);
  const sessionGenerationRef = useRef(0);
  const authStateRef = useRef({ isLoggedIn: false, currentUser: '' });
  authStateRef.current = { isLoggedIn, currentUser };

  // FIX: Track of we al geinitialiseerd zijn om dubbele openPane te voorkomen
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

  const desktopCommandBus = useDesktopCommandBus({
    openPane,
    openConversation,
    focusPane,
    minimizePane,
    closePane,
    toggleStartMenu
  });

  // Presence management
  const {
    userStatus,
    handleStatusChange,
    cleanup: cleanupPresence
  } = usePresence(isLoggedIn, currentUser, messengerSignedIn);

  

const onTaskbarClick = React.useCallback((paneId) => {
  if (paneId.startsWith('conv_')) {
      const contactName = paneId.replace('conv_', '');
      desktopCommandBus.openConversation(contactName);
      setUnreadChats(prev => {
        const next = new Set(prev);
        next.delete(paneId);
        return next;
      });
    } else {
      handleTaskbarClick(paneId);
    }
  }, [desktopCommandBus, handleTaskbarClick]);

  const messengerCoordinator = useMessengerCoordinator({
    currentUser,
    messengerSignedInRef,
    settings,
    activePaneRef,
    conversationsRef,
    setUnreadChats,
    showToast,
    getAvatar,
    getDisplayNameRef,
    playSound,
    openPane: desktopCommandBus.openPane,
    onTaskbarClick
  });

  const { contactPresence: sharedContactPresence, resetPresenceState } = usePresenceCoordinator({
    isLoggedIn,
    currentUser,
    onContactOnline: messengerCoordinator.handleContactOnline
  });
  // Message listeners initialisatie
  const { 
    cleanup: cleanupListeners 
  } = useMessageListeners({
    isLoggedIn,
    currentUser,
    conversationsRef,
    activePaneRef,
    onMessage: messengerCoordinator.handleIncomingMessage,
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

  const runSessionTeardown = () => {
    try {
      cleanupPresence();
    } catch (err) {
      log('[App] cleanupPresence failed:', err);
    }
    cleanupListeners();
    resetShownToasts();
    resetAll();
    clearEncryptionCache();

    hasInitializedRef.current = false;
    setMessengerSignedIn(false);
    resetPresenceState();
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
      try {
        await playSoundAsync('logoff');
      } finally {
        finishClose();
      }
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

  const systrayManager = useSystrayManager({
    userStatus,
    onStatusChange: handleStatusChange,
    onOpenContacts: () => {
      desktopCommandBus.openContacts();
    },
    onSignOut: () => {
      closeAllConversations();
      setMessengerSignedIn(false);
    },
    onCloseMessenger: () => {
      closeAllConversations();
      setMessengerSignedIn(false);
      desktopCommandBus.closePane('contacts');
    }
  });

  const desktopManager = useDesktopManager({
    paneConfig,
    onOpenPane: desktopCommandBus.openPane
  });

  const contextMenuManager = useContextMenuManager({
    enabled: FEATURE_FLAGS.contextMenus
  });

  // Presence owner: usePresenceCoordinator.
  // ContactsPane consumeert alleen sharedContactPresence en subscribe't niet zelf.


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
            <span className="power-on-icon">{'\u23FB'}</span>
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
    <DesktopShell
      onDesktopClick={closeStartMenu}
      wallpaperStyle={getWallpaperStyle()}
      dataTheme={settings.colorScheme !== 'blauw' ? settings.colorScheme : undefined}
      dataFontsize={settings.fontSize !== 'normaal' ? settings.fontSize : undefined}
      scanlinesEnabled={scanlinesEnabled}
      desktopShortcuts={desktopManager.shortcuts}
      onOpenShortcut={desktopManager.openShortcut}
      paneLayerProps={{
        paneConfig,
        panes,
        conversations,
        focusPane,
        getZIndex,
        toggleMaximizePane,
        closePane,
        minimizePane,
        activePane,
        savedSizes,
        handleSizeChange,
        getInitialPosition,
        handlePositionChange,
        openConversation,
        userStatus,
        handleStatusChange,
        handleLogoff,
        closeAllConversations,
        setMessengerSignedIn,
        nowPlaying,
        currentUser,
        messengerSignedIn,
        messengerCoordinator,
        setNowPlaying,
        toggleMaximizeConversation,
        closeConversation,
        minimizeConversation,
        unreadMetadata,
        clearNotificationTime,
        sharedContactPresence,
        getDisplayName
      }}
      startMenuProps={{
        isOpen: isStartOpen,
        paneConfig,
        currentUser,
        getAvatar,
        getLocalUserInfo,
        onOpenPane: desktopCommandBus.openPane,
        onCloseStartMenu: closeStartMenu,
        onLogoff: handleLogoff,
        onShutdown: handleShutdown
      }}
      taskbarProps={{
        isStartOpen,
        onToggleStartMenu: desktopCommandBus.toggleStart,
        paneOrder,
        unreadChats,
        conversations,
        activePane,
        onTaskbarClick,
        panes,
        paneConfig,
        getDisplayName,
        systrayProps: {
          isSuperpeer,
          connectedSuperpeers,
          isLoggedIn,
          relayStatus,
          forceReconnect,
          messengerSignedIn,
          systrayIconRef: systrayManager.systrayIconRef,
          currentStatusOption: systrayManager.currentStatusOption,
          getDisplayName,
          currentUser,
          onToggleMenu: systrayManager.onToggleMenu,
          showSystrayMenu: systrayManager.showSystrayMenu,
          systrayMenuRef: systrayManager.systrayMenuRef,
          getAvatar,
          userStatus,
          onStatusChange: systrayManager.onStatusChange,
          onOpenContacts: systrayManager.onOpenContacts,
          onSignOut: systrayManager.onSignOut,
          onCloseMessenger: systrayManager.onCloseMessenger
        }
      }}
      toasts={toasts}
      removeToast={removeToast}
      onToastClick={messengerCoordinator.handleToastClick}
      contextMenu={contextMenuManager}
    />
  );
}

export default App;



