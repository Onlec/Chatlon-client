// src/App.js
/**
 * Chatlon App - Main Component
 * 
 * Orchestreert alle hooks en rendert de desktop omgeving.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import LoginScreen from './components/screens/LoginScreen';
import BootSequence from './components/screens/BootSequence';
import OSSelector from './components/screens/OSSelector';
import SystemTransitionScreen from './components/screens/SystemTransitionScreen';
import LigerBootSequence from './components/screens/liger/LigerBootSequence';
import LigerLoginScreen from './components/screens/liger/LigerLoginScreen';
import DesktopShell from './components/shell/DesktopShell';
import LigerDesktopShell from './components/shell/liger/LigerDesktopShell';
import MonitorBezel from './components/MonitorBezel';
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
import { useMailInbox } from './components/mail/useMailInbox';
import { useMailNotifier } from './components/mail/useMailNotifier';

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
import { removeScoped } from './utils/storageScope';
import { readUserPrefOnce, PREF_KEYS } from './utils/userPrefsGun';
import { buildLunaCustomThemeStyle } from './utils/lunaCustomTheme';
import {
  LIGER_MENU_ACTIONS,
  buildLigerActiveAppName,
  buildLigerDockAppItems,
  buildLigerMenus,
  buildLigerMinimizedDockItems,
  buildLigerWindowItemsModel
} from './utils/ligerShell';


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

const OS_STORAGE_KEY = 'chatlon_os';
const BOOT_COMPLETE_STORAGE_KEY = 'chatlon_boot_complete';
const OS_DX = 'dx';
const OS_LIGER = 'liger';

function normalizeSelectedOS(value) {
  if (value === OS_DX || value === OS_LIGER) return value;
  return null;
}

function resolveSelectedOS() {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.has('reset-os')) {
    localStorage.removeItem(OS_STORAGE_KEY);
    sessionStorage.removeItem(BOOT_COMPLETE_STORAGE_KEY);
    params.delete('reset-os');
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash || ''}`;
    if (typeof window.history?.replaceState === 'function') {
      window.history.replaceState({}, '', nextUrl);
    }
    return null;
  }

  return normalizeSelectedOS(localStorage.getItem(OS_STORAGE_KEY));
}

function App() {
  const WELCOME_HOLD_MS = 1200;
  const WELCOME_FADE_MS = 800;
  const [selectedOS] = useState(() => resolveSelectedOS());
  const osVariant = selectedOS === OS_LIGER ? OS_LIGER : OS_DX;

  // ============================================
  // AUTH STATE
  // ============================================
  const { scanlinesEnabled, setStorageUserKey: setScanlinesStorageUserKey } = useScanlinesPreference();
  const [hasBooted, setHasBooted] = useState(() => {
    // Boot alleen bij eerste bezoek of na expliciete restart
    const skipBoot = sessionStorage.getItem(BOOT_COMPLETE_STORAGE_KEY);
    return skipBoot === 'true';
  });
  const justBootedRef = useRef(false);
  const [isShutdown, setIsShutdown] = useState(false);
  const [isLoggingOff, setIsLoggingOff] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [showPostLoginWelcome, setShowPostLoginWelcome] = useState(false);
  const [welcomeFadeOut, setWelcomeFadeOut] = useState(false);
  const [sessionNotice, setSessionNotice] = useState(() => loadSessionNotice());
  const [unreadChats, setUnreadChats] = React.useState(new Set());
  const [nowPlaying, setNowPlaying] = useState(null);
  const [ligerMenuOverrides, setLigerMenuOverrides] = useState({});
  const [messengerSignedIn, setMessengerSignedIn] = useState(false);
  const messengerSignedInRef = useRef(false); // ref voor gebruik in callbacks
  messengerSignedInRef.current = messengerSignedIn; // altijd in sync

  const tabClientIdRef = useRef(getOrCreateTabClientId());
  const cleanupTimeoutRef = useRef(null);
  const welcomeTimerRef = useRef(null);
  const welcomeFadeTimerRef = useRef(null);
  const conflictHandlerRef = useRef(null);
  const sessionGenerationRef = useRef(0);
  const rememberMeEnabledRef = useRef(false);
  const authStateRef = useRef({ isLoggedIn: false, currentUser: '' });
  authStateRef.current = { isLoggedIn, currentUser };

  // FIX: Track of we al geinitialiseerd zijn om dubbele openPane te voorkomen
  const hasInitializedRef = useRef(false);

  // ============================================
  // HOOKS
  // ============================================
  const {
    settings,
    setStorageUserKey: setSettingsStorageUserKey,
    setAppearanceVariant: setSettingsAppearanceVariant
  } = useSettings();
  const { getAvatar, getDisplayName } = useAvatar();
  // Refs zodat Gun-callbacks altijd de meest actuele versie hebben
  const getDisplayNameRef = useRef(getDisplayName);
  getDisplayNameRef.current = getDisplayName;
  const { getWallpaperStyle } = useWallpaper();
  const { playSound, playSoundAsync } = useSounds();
  const desktopThemeStyle = useMemo(
    () => buildLunaCustomThemeStyle(settings.colorScheme, settings.customLunaTheme),
    [settings.colorScheme, settings.customLunaTheme]
  );
  const shellDataTheme = useMemo(() => {
    if (osVariant === OS_LIGER) {
      return settings.colorScheme === 'blauw'
        ? 'liger-default'
        : `liger-${settings.colorScheme}`;
    }
    return settings.colorScheme !== 'blauw' ? settings.colorScheme : undefined;
  }, [osVariant, settings.colorScheme]);
  
  // Toast notifications
  const {
    toasts,
    showToast,
    removeToast,
    shownToastsRef,
    resetShownToasts
  } = useToasts();

  // Mail inbox state (early — alleen currentUser nodig)
  const {
    unreadCount: mailUnreadCount,
    newMailSinceLastSeen
  } = useMailInbox(currentUser);

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
    closeAllGames,
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
    clearNotificationTime,
    games,
    openGamePane,
    closeGamePane,
    minimizeGamePane,
    toggleMaximizeGamePane
  } = usePaneManager();

  const desktopCommandBus = useDesktopCommandBus({
    openPane,
    openConversation,
    focusPane,
    minimizePane,
    closePane,
    toggleStartMenu
  });

  // Mail notifier (na desktopCommandBus zodat openPane beschikbaar is)
  const onOpenMail = React.useCallback(
    () => desktopCommandBus.openPane('mail'),
    [desktopCommandBus]
  );
  useMailNotifier({ newMailSinceLastSeen, showToast, getAvatar, onOpenMail });

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
    } else if (paneId.startsWith('game_')) {
      const game = games[paneId];
      if (game) openGamePane(game.contactName, game.gameSessionId, game.gameType);
    } else {
      handleTaskbarClick(paneId);
    }
  }, [desktopCommandBus, handleTaskbarClick, games, openGamePane]);

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

  const priorityPresenceContacts = useMemo(() => {
    const priority = new Set();
    if (typeof activePane === 'string' && activePane.startsWith('conv_')) {
      priority.add(activePane.replace('conv_', ''));
    }
    Object.entries(conversations || {}).forEach(([paneId, conv]) => {
      if (!paneId.startsWith('conv_')) return;
      if (!conv || !conv.isOpen || conv.isMinimized) return;
      priority.add(paneId.replace('conv_', ''));
    });
    return Array.from(priority);
  }, [activePane, conversations]);

  // Messenger active boundary: contact presence and chat listeners are only active
  // while Chatlon Messenger itself is signed in.
  const { contactPresence: sharedContactPresence, resetPresenceState } = usePresenceCoordinator({
    isLoggedIn,
    currentUser,
    onContactOnline: messengerCoordinator.handleContactOnline,
    priorityContacts: priorityPresenceContacts,
    isMessengerActive: messengerSignedIn
  });
  // Message listeners initialisatie
  const { 
    cleanup: cleanupListeners 
  } = useMessageListeners({
    isLoggedIn,
    currentUser,
    messengerSignedIn,
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

  const clearWelcomeTimers = () => {
    if (welcomeTimerRef.current) {
      clearTimeout(welcomeTimerRef.current);
      welcomeTimerRef.current = null;
    }
    if (welcomeFadeTimerRef.current) {
      clearTimeout(welcomeFadeTimerRef.current);
      welcomeFadeTimerRef.current = null;
    }
  };

  const dismissSessionNotice = React.useCallback(() => {
    clearSessionNotice();
    setSessionNotice(null);
  }, []);

  const runSessionTeardown = () => {
    clearWelcomeTimers();
    setShowPostLoginWelcome(false);
    setWelcomeFadeOut(false);

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

    if (!rememberMeEnabledRef.current) {
      removeScoped('credentials', currentUser);
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
        sessionStorage.removeItem(BOOT_COMPLETE_STORAGE_KEY);
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
    setShowPostLoginWelcome(true);
    setWelcomeFadeOut(false);

    clearWelcomeTimers();
    welcomeTimerRef.current = setTimeout(() => {
      playSound('login');
      setWelcomeFadeOut(true);
      welcomeFadeTimerRef.current = setTimeout(() => {
        setShowPostLoginWelcome(false);
        setWelcomeFadeOut(false);
        welcomeFadeTimerRef.current = null;
      }, WELCOME_FADE_MS);
      welcomeTimerRef.current = null;
    }, WELCOME_HOLD_MS);

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

  
  const handleLogoff = React.useCallback(async () => {
    log('[App] Logging off...');
    await closeSession({
      reason: SESSION_CLOSE_REASON_MANUAL_LOGOFF,
      showLogoffScreen: true,
      playLogoffSound: true,
      postClose: SESSION_POST_CLOSE_STAY_ON_LOGIN
    });
  }, [closeSession]);
  // Trigger shutdown vanuit ingelogde sessie via dezelfde teardown pipeline.
  const handleShutdown = React.useCallback(async () => {
    log('[App] Shutting down...');
    await closeSession({
      reason: SESSION_CLOSE_REASON_MANUAL_SHUTDOWN,
      showLogoffScreen: true,
      playLogoffSound: true,
      postClose: SESSION_POST_CLOSE_SHUTDOWN_BOOT_RELOAD
    });
  }, [closeSession]);

  useEffect(() => {
    return () => {
      clearPendingCleanupTimeout();
      clearWelcomeTimers();
    };
  }, []);

  useEffect(() => {
    const scopedUserKey = isLoggedIn && currentUser ? currentUser : 'guest';
    setSettingsStorageUserKey(scopedUserKey);
    setScanlinesStorageUserKey(scopedUserKey);
  }, [isLoggedIn, currentUser, setSettingsStorageUserKey, setScanlinesStorageUserKey]);

  useEffect(() => {
    setSettingsAppearanceVariant(selectedOS === OS_LIGER ? OS_LIGER : OS_DX);
  }, [selectedOS, setSettingsAppearanceVariant]);

  useEffect(() => {
    let cancelled = false;
    if (!isLoggedIn || !currentUser) {
      rememberMeEnabledRef.current = false;
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const enabled = await readUserPrefOnce(currentUser, PREF_KEYS.REMEMBER_ME, false);
        if (!cancelled) {
          rememberMeEnabledRef.current = Boolean(enabled);
        }
      } catch {
        if (!cancelled) {
          rememberMeEnabledRef.current = false;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, currentUser]);

  // Hard guarantee: when messenger signs out/closes, all open conversations close.
  useEffect(() => {
    if (messengerSignedIn) return;
    closeAllConversations();
    closeAllGames();
    setUnreadChats((prev) => {
      if (!prev || prev.size === 0) return prev;
      const next = new Set([...prev].filter((id) => !String(id).startsWith('conv_')));
      return next.size === prev.size ? prev : next;
    });
  }, [messengerSignedIn, closeAllConversations, closeAllGames]);

  const systrayManager = useSystrayManager({
    userStatus,
    onStatusChange: handleStatusChange,
    onOpenContacts: () => {
      desktopCommandBus.openContacts();
    },
    onSignOut: () => {
      closeAllConversations();
      closeAllGames();
      setMessengerSignedIn(false);
    },
    onCloseMessenger: () => {
      closeAllConversations();
      closeAllGames();
      setMessengerSignedIn(false);
      desktopCommandBus.closePane('contacts');
    }
  });

  const desktopManager = useDesktopManager({
    paneConfig,
    onOpenPane: desktopCommandBus.openPane,
    currentUser
  });

  const contextMenuManager = useContextMenuManager({
    enabled: FEATURE_FLAGS.contextMenus
  });

  const buildDesktopActions = React.useCallback(() => ([
    {
      id: 'refresh',
      label: 'Vernieuwen',
      onClick: () => {}
    },
    {
      id: 'align-grid',
      label: 'Pictogrammen uitlijnen op raster',
      onClick: () => desktopManager.alignShortcutsToGrid()
    },
    { type: 'separator' },
    {
      id: 'properties',
      label: 'Eigenschappen',
      onClick: () => desktopCommandBus.openPane('control')
    }
  ]), [desktopCommandBus, desktopManager]);

  const buildShortcutActions = React.useCallback((shortcutId, beginRename) => ([
    {
      id: 'open',
      label: 'Openen',
      bold: true,
      onClick: () => desktopManager.openShortcut(shortcutId)
    },
    { type: 'separator' },
    {
      id: 'rename',
      label: 'Naam wijzigen',
      onClick: () => {
        if (typeof beginRename === 'function') beginRename();
      }
    },
    {
      id: 'delete',
      label: 'Verwijderen',
      onClick: () => desktopManager.removeShortcut(shortcutId)
    },
    { type: 'separator' },
    {
      id: 'properties',
      label: 'Eigenschappen',
      onClick: () => {}
    }
  ]), [desktopManager]);

  const buildTabActions = React.useCallback((paneId) => {
    const pane = panes[paneId];
    const conv = conversations[paneId];
    const game = games?.[paneId];
    const isConversation = paneId.startsWith('conv_');
    const isGame = paneId.startsWith('game_');
    const isMinimized = isConversation
      ? Boolean(conv?.isMinimized)
      : isGame
        ? Boolean(game?.isMinimized)
        : Boolean(pane?.isMinimized);
    const isMaximized = isConversation
      ? Boolean(conv?.isMaximized)
      : isGame
        ? Boolean(game?.isMaximized)
        : Boolean(pane?.isMaximized);

    return [
      {
        id: 'restore',
        label: 'Herstellen',
        disabled: !isMinimized,
        onClick: () => onTaskbarClick(paneId)
      },
      {
        id: 'minimize',
        label: 'Minimaliseren',
        disabled: isMinimized,
        onClick: () => {
          if (isConversation) {
            minimizeConversation(paneId);
            return;
          }
          if (isGame) {
            minimizeGamePane(paneId);
            return;
          }
          minimizePane(paneId);
        }
      },
      {
        id: 'maximize',
        label: 'Maximaliseren',
        disabled: false,
        onClick: () => {
          if (isConversation) {
            if (isMinimized) onTaskbarClick(paneId);
            toggleMaximizeConversation(paneId);
            return;
          }
          if (isGame) {
            if (isMinimized) onTaskbarClick(paneId);
            toggleMaximizeGamePane(paneId);
            return;
          }
          if (isMinimized) onTaskbarClick(paneId);
          if (!isMaximized || isMinimized) {
            toggleMaximizePane(paneId);
          }
        }
      },
      { type: 'separator' },
      {
        id: 'close',
        label: 'Sluiten',
        onClick: () => {
          if (isConversation) {
            closeConversation(paneId);
            return;
          }
          if (isGame) {
            closeGamePane(paneId);
            return;
          }
          closePane(paneId);
        }
      }
    ];
  }, [
    panes,
    conversations,
    games,
    onTaskbarClick,
    minimizeConversation,
    minimizeGamePane,
    minimizePane,
    toggleMaximizeConversation,
    toggleMaximizeGamePane,
    toggleMaximizePane,
    closeConversation,
    closeGamePane,
    closePane
  ]);

  const handleShortcutContextMenu = React.useCallback((event, shortcutId, beginRename) => {
    contextMenuManager.openMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'shortcut',
      target: shortcutId,
      actions: buildShortcutActions(shortcutId, beginRename)
    });
  }, [contextMenuManager, buildShortcutActions]);

  const handleTabContextMenu = React.useCallback((event, paneId) => {
    contextMenuManager.openMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'taskbar-tab',
      target: paneId,
      actions: buildTabActions(paneId)
    });
  }, [contextMenuManager, buildTabActions]);

  const minimizeAllWindows = React.useCallback(() => {
    Object.entries(panes || {}).forEach(([paneId, pane]) => {
      if (pane?.isOpen && !pane?.isMinimized) {
        minimizePane(paneId);
      }
    });
    Object.entries(conversations || {}).forEach(([convId, conv]) => {
      if (conv?.isOpen && !conv?.isMinimized) {
        minimizeConversation(convId);
      }
    });
    Object.entries(games || {}).forEach(([gameId, game]) => {
      if (game?.isOpen && !game?.isMinimized) {
        minimizeGamePane(gameId);
      }
    });
  }, [panes, conversations, games, minimizePane, minimizeConversation, minimizeGamePane]);

  const buildStartButtonActions = React.useCallback(() => ([
    {
      id: 'open-start',
      label: 'Open Startmenu',
      disabled: isStartOpen,
      onClick: () => {
        if (!isStartOpen) {
          desktopCommandBus.toggleStart();
        }
      }
    },
    {
      id: 'open-control',
      label: 'Configuratiescherm',
      onClick: () => desktopCommandBus.openPane('control')
    },
    {
      id: 'show-desktop',
      label: 'Bureaublad tonen',
      onClick: () => minimizeAllWindows()
    },
    {
      id: 'minimize-all',
      label: 'Alle vensters minimaliseren',
      onClick: () => minimizeAllWindows()
    },
    { type: 'separator' },
    {
      id: 'logoff',
      label: 'Afmelden',
      onClick: () => {
        void handleLogoff();
      }
    },
    {
      id: 'shutdown',
      label: 'Afsluiten',
      onClick: () => {
        void handleShutdown();
      }
    }
  ]), [isStartOpen, desktopCommandBus, minimizeAllWindows, handleLogoff, handleShutdown]);

  const buildTaskbarActions = React.useCallback(() => ([
    { id: 'cascade', label: 'Cascaderen', disabled: true },
    { id: 'tile', label: 'Vensters naast elkaar', disabled: true },
    {
      id: 'show-desktop',
      label: 'Bureaublad tonen',
      onClick: () => minimizeAllWindows()
    },
    { type: 'separator' },
    {
      id: 'properties',
      label: 'Eigenschappen',
      onClick: () => desktopCommandBus.openPane('control')
    }
  ]), [desktopCommandBus, minimizeAllWindows]);

  const handleTaskbarContextMenu = React.useCallback((event) => {
    contextMenuManager.openMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'taskbar',
      target: null,
      actions: buildTaskbarActions()
    });
  }, [contextMenuManager, buildTaskbarActions]);

  const handleStartButtonContextMenu = React.useCallback((event) => {
    contextMenuManager.openMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'start-button',
      target: null,
      actions: buildStartButtonActions()
    });
  }, [contextMenuManager, buildStartButtonActions]);

  // Presence owner: usePresenceCoordinator.
  // ContactsPane consumeert alleen sharedContactPresence en subscribe't niet zelf.
  const handleBootComplete = React.useCallback(() => {
    justBootedRef.current = true;
    setHasBooted(true);
  }, []);

  const focusWindowItem = React.useCallback((paneId) => {
    if (!paneId) return;

    if (paneId.startsWith('conv_')) {
      const conversation = conversations[paneId];
      if (!conversation) return;
      if (conversation.isMinimized) {
        openConversation(conversation.contactName);
        return;
      }
      focusPane(paneId);
      return;
    }

    if (paneId.startsWith('game_')) {
      const game = games?.[paneId];
      if (!game) return;
      if (game.isMinimized) {
        openGamePane(game.contactName, game.gameSessionId, game.gameType);
        return;
      }
      focusPane(paneId);
      return;
    }

    const pane = panes[paneId];
    if (!pane) return;
    if (pane.isMinimized) {
      desktopCommandBus.openPane(paneId);
      return;
    }
    focusPane(paneId);
  }, [conversations, games, panes, openConversation, openGamePane, focusPane, desktopCommandBus]);

  const handlePaneLigerMenuChange = React.useCallback((paneId, menus) => {
    if (!paneId) return;

    setLigerMenuOverrides((current) => {
      const next = { ...current };

      if (Array.isArray(menus) && menus.length > 0) {
        next[paneId] = menus;
      } else {
        delete next[paneId];
      }

      return next;
    });
  }, []);

  const handleLigerMenuAction = React.useCallback((action) => {
    switch (action) {
      case LIGER_MENU_ACTIONS.CLOSE_ACTIVE:
        if (!activePane) return;
        if (activePane.startsWith('conv_')) {
          closeConversation(activePane);
          return;
        }
        if (activePane.startsWith('game_')) {
          closeGamePane(activePane);
          return;
        }
        closePane(activePane);
        return;
      case LIGER_MENU_ACTIONS.LOGOFF:
        handleLogoff();
        return;
      case LIGER_MENU_ACTIONS.SHUTDOWN:
        handleShutdown();
        return;
      default:
        return;
    }
  }, [activePane, closeConversation, closeGamePane, closePane, handleLogoff, handleShutdown]);

  const activeAppName = useMemo(() => {
    if (!activePane) {
      return osVariant === OS_LIGER ? 'Liger' : 'Chatlon';
    }

    if (activePane.startsWith('conv_')) {
      const conversation = conversations[activePane];
      return conversation ? `${getDisplayName(conversation.contactName)} - Gesprek` : 'Gesprek';
    }

    if (activePane.startsWith('game_')) {
      const game = games?.[activePane];
      if (!game) return 'Spelletje';
      const gameName = game.gameType === 'tictactoe' ? 'Tic Tac Toe' : game.gameType;
      return `${gameName} - ${getDisplayName(game.contactName)}`;
    }

    const config = paneConfig[activePane];
    return config?.title || config?.label || activePane;
  }, [activePane, conversations, games, getDisplayName, osVariant]);

  const windowItems = useMemo(() => {
    const seen = new Set();
    const orderedIds = [];
    const pushId = (paneId) => {
      if (!paneId || seen.has(paneId)) return;
      seen.add(paneId);
      orderedIds.push(paneId);
    };

    paneOrder.forEach(pushId);
    Object.entries(panes || {}).forEach(([paneId, pane]) => {
      if (pane?.isOpen) pushId(paneId);
    });
    Object.entries(conversations || {}).forEach(([paneId, conversation]) => {
      if (conversation?.isOpen) pushId(paneId);
    });
    Object.entries(games || {}).forEach(([paneId, game]) => {
      if (game?.isOpen) pushId(paneId);
    });

    return orderedIds.map((paneId) => {
      if (paneId.startsWith('conv_')) {
        const conversation = conversations[paneId];
        if (!conversation?.isOpen) return null;
        return {
          id: paneId,
          icon: '💬',
          label: `${getDisplayName(conversation.contactName)} - Gesprek`,
          isActive: activePane === paneId,
          isMinimized: Boolean(conversation.isMinimized),
          onSelect: () => focusWindowItem(paneId)
        };
      }

      if (paneId.startsWith('game_')) {
        const game = games?.[paneId];
        if (!game?.isOpen) return null;
        const gameName = game.gameType === 'tictactoe' ? 'Tic Tac Toe' : game.gameType;
        return {
          id: paneId,
          icon: '🎲',
          label: `${gameName} - ${getDisplayName(game.contactName)}`,
          isActive: activePane === paneId,
          isMinimized: Boolean(game.isMinimized),
          onSelect: () => focusWindowItem(paneId)
        };
      }

      const pane = panes[paneId];
      const config = paneConfig[paneId];
      if (!pane?.isOpen || !config) return null;
      return {
        id: paneId,
        icon: config.icon || config.desktopIcon || '🪟',
        label: config.title || config.label || paneId,
        isActive: activePane === paneId,
        isMinimized: Boolean(pane.isMinimized),
        onSelect: () => focusWindowItem(paneId)
      };
    }).filter(Boolean);
  }, [activePane, conversations, focusWindowItem, games, getDisplayName, paneOrder, panes]);

  const dockItems = useMemo(() => (
    Object.entries(paneConfig).map(([paneId, config]) => ({
      key: paneId,
      icon: config.desktopIcon || config.icon || '🧩',
      label: config.desktopLabel || config.label || config.title || paneId,
      isRunning: Boolean(panes[paneId]?.isOpen && !panes[paneId]?.isMinimized),
      isActive: activePane === paneId,
      onClick: () => desktopCommandBus.openPane(paneId)
    }))
  ), [activePane, panes, desktopCommandBus]);

  const ligerActiveAppName = useMemo(() => buildLigerActiveAppName({
    activePane,
    paneConfig
  }), [activePane]);

  const ligerWindowItemsModel = useMemo(() => buildLigerWindowItemsModel({
    activePane,
    paneOrder,
    panes,
    conversations,
    games,
    paneConfig,
    getDisplayName
  }), [activePane, conversations, games, getDisplayName, paneOrder, panes]);

  const ligerWindowItems = useMemo(() => (
    ligerWindowItemsModel.map((item) => ({
      ...item,
      onSelect: () => focusWindowItem(item.id)
    }))
  ), [focusWindowItem, ligerWindowItemsModel]);

  const ligerMenusModel = useMemo(() => buildLigerMenus({
    activePane,
    paneConfig,
    windowItems: ligerWindowItemsModel,
    menuOverrides: ligerMenuOverrides
  }), [activePane, ligerMenuOverrides, ligerWindowItemsModel]);

  const ligerMenus = useMemo(() => (
    ligerMenusModel.map((menu) => ({
      ...menu,
      items: (menu.items || []).map((item) => (
        item.windowId
          ? {
              ...item,
              onSelect: () => focusWindowItem(item.windowId)
            }
          : item
      ))
    }))
  ), [focusWindowItem, ligerMenusModel]);

  const dockAppItemsModel = useMemo(() => buildLigerDockAppItems({
    paneConfig,
    panes,
    activePane,
    dockBadges: { mail: mailUnreadCount > 0 ? mailUnreadCount : null }
  }), [activePane, panes, mailUnreadCount]);

  const dockAppItems = useMemo(() => (
    dockAppItemsModel.map((item) => ({
      ...item,
      onClick: () => desktopCommandBus.openPane(item.key)
    }))
  ), [desktopCommandBus, dockAppItemsModel]);

  const dockMinimizedItemsModel = useMemo(() => buildLigerMinimizedDockItems(ligerWindowItemsModel), [ligerWindowItemsModel]);

  const dockMinimizedItems = useMemo(() => (
    dockMinimizedItemsModel.map((item) => ({
      ...item,
      onClick: () => focusWindowItem(item.key)
    }))
  ), [dockMinimizedItemsModel, focusWindowItem]);

  const paneLayerProps = {
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
    games,
    openGamePane,
    closeGamePane,
    minimizeGamePane,
    toggleMaximizeGamePane,
    userStatus,
    handleStatusChange,
    handleLogoff,
    closeAllConversations,
    closeAllGames,
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
    getDisplayName,
    contextMenu: contextMenuManager,
    onPaneLigerMenuChange: handlePaneLigerMenuChange
  };

  const systrayProps = {
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
    onCloseMessenger: systrayManager.onCloseMessenger,
    unreadMailCount: mailUnreadCount,
    onOpenMail
  };

  const shellProps = {
      session: {
        onDesktopClick: closeStartMenu,
        wallpaperStyle: getWallpaperStyle(),
        themeStyle: desktopThemeStyle,
        dataTheme: shellDataTheme,
        dataFontsize: settings.fontSize !== 'normaal' ? settings.fontSize : undefined,
        currentUser,
        onLogoff: handleLogoff,
        onShutdown: handleShutdown
    },
    shortcuts: {
      items: desktopManager.shortcuts,
      onOpen: desktopManager.openShortcut,
      onContextMenu: handleShortcutContextMenu,
      onRename: desktopManager.renameShortcut,
      onMove: desktopManager.moveShortcut,
      gridConfig: desktopManager.desktopGridConfig,
      layoutVariant: osVariant
    },
    windows: {
      chromeVariant: osVariant,
      paneLayerProps,
      activeAppName: osVariant === OS_LIGER ? ligerActiveAppName : activeAppName,
      menus: ligerMenus,
      onMenuAction: handleLigerMenuAction,
      windowItems: osVariant === OS_LIGER ? ligerWindowItems : windowItems
    },
    navigation: {
      startMenuProps: {
        isOpen: isStartOpen,
        paneConfig,
        currentUser,
        getAvatar,
        getLocalUserInfo,
        onOpenPane: desktopCommandBus.openPane,
        onCloseStartMenu: closeStartMenu,
        onLogoff: handleLogoff,
        onShutdown: handleShutdown
      },
      taskbarProps: {
        isStartOpen,
        onToggleStartMenu: desktopCommandBus.toggleStart,
        onStartButtonContextMenu: handleStartButtonContextMenu,
        onTaskbarContextMenu: handleTaskbarContextMenu,
        paneOrder,
        unreadChats,
        conversations,
        games,
        activePane,
        onTaskbarClick,
        onTabContextMenu: handleTabContextMenu,
        panes,
        paneConfig,
        getDisplayName,
        systrayProps
      },
      dockAppItems: osVariant === OS_LIGER ? dockAppItems : dockItems,
      dockMinimizedItems,
      onOpenContacts: desktopCommandBus.openContacts
    },
    notifications: {
      toasts,
      removeToast,
      onToastClick: messengerCoordinator.handleToastClick
    },
    status: {
      scanlinesEnabled,
      isSuperpeer,
      connectedSuperpeers,
      isLoggedIn,
      relayStatus,
      forceReconnect,
      messengerSignedIn,
      currentStatusOption: systrayManager.currentStatusOption,
      userStatus,
      getDisplayName,
      getAvatar
    },
    contextMenu: {
      ...contextMenuManager,
      buildDesktopActions
    }
  };

  if (!selectedOS) {
    return <OSSelector />;
  }

  if (isLoggingOff) {
    return <SystemTransitionScreen variant={osVariant} mode="logoff" />;
  }

  if (isShutdown) {
    return (
      <SystemTransitionScreen
        variant={osVariant}
        mode="shutdown"
        onPowerOn={() => {
          sessionStorage.removeItem(BOOT_COMPLETE_STORAGE_KEY);
          setIsShutdown(false);
          setHasBooted(false);
        }}
      />
    );
  }

  if (!hasBooted) {
    if (selectedOS === OS_LIGER) {
      return <LigerBootSequence onBootComplete={handleBootComplete} />;
    }
    return <BootSequence onBootComplete={handleBootComplete} />;
  }

  if (!isLoggedIn) {
    const fromBoot = justBootedRef.current;
    justBootedRef.current = false;
    const loginScreenProps = {
      onLoginSuccess: handleLoginSuccess,
      fadeIn: fromBoot,
      onShutdown: () => setIsShutdown(true),
      sessionNotice,
      onDismissSessionNotice: dismissSessionNotice
    };

    if (selectedOS === OS_LIGER) {
      return <LigerLoginScreen {...loginScreenProps} />;
    }

    return <LoginScreen {...loginScreenProps} />;
  }

  return (
    <>
      <MonitorBezel os={selectedOS}>
        {selectedOS === OS_LIGER ? (
          <LigerDesktopShell shellProps={shellProps} />
        ) : (
          <DesktopShell shellProps={shellProps} />
        )}
      </MonitorBezel>
      {showPostLoginWelcome && (
        <SystemTransitionScreen
          variant={osVariant}
          mode="welcome"
          fadingOut={welcomeFadeOut}
        />
      )}
    </>
  );
}

export default App;
