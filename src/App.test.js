import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('./components/screens/OSSelector', () => () => <div data-testid="os-selector" />);
jest.mock('./components/screens/BootSequence', () => () => <div data-testid="boot-sequence" />);
jest.mock('./components/screens/liger/LigerBootSequence', () => () => <div data-testid="liger-boot-sequence" />);
jest.mock('./components/screens/LoginScreen', () => () => <div data-testid="login-screen" />);
jest.mock('./components/screens/liger/LigerLoginScreen', () => () => <div data-testid="liger-login-screen" />);
jest.mock('./components/screens/SystemTransitionScreen', () => (props) => (
  <div data-testid={`transition-${props.mode}-${props.variant}`} />
));
jest.mock('./components/shell/DesktopShell', () => () => <div data-testid="desktop-shell" />);
jest.mock('./components/shell/liger/LigerDesktopShell', () => () => <div data-testid="liger-desktop-shell" />);
jest.mock('./paneConfig', () => ({
  paneConfig: {
    contacts: {
      title: 'Chatlon Messenger',
      label: 'Contacten',
      icon: '👥',
      desktopIcon: 'favicon.ico',
      desktopLabel: 'Chatlon Messenger',
      component: () => null
    }
  }
}));

jest.mock('./gun', () => ({
  user: {
    is: null,
    leave: jest.fn()
  }
}));

jest.mock('./utils/debug', () => ({
  log: jest.fn()
}));

jest.mock('./hooks/useSuperpeer', () => ({
  useSuperpeer: () => ({
    isSuperpeer: false,
    connectedSuperpeers: 0,
    relayStatus: { anyOnline: true },
    forceReconnect: jest.fn()
  })
}));

jest.mock('./hooks/useSounds', () => ({
  useSounds: () => ({
    playSound: jest.fn(),
    playSoundAsync: jest.fn().mockResolvedValue(undefined)
  })
}));

jest.mock('./hooks/useToasts', () => ({
  useToasts: () => ({
    toasts: [],
    showToast: jest.fn(),
    removeToast: jest.fn(),
    shownToastsRef: { current: new Set() },
    resetShownToasts: jest.fn()
  })
}));

jest.mock('./hooks/usePresence', () => ({
  usePresence: () => ({
    userStatus: 'online',
    handleStatusChange: jest.fn(),
    cleanup: jest.fn()
  })
}));

jest.mock('./hooks/usePaneManager', () => ({
  usePaneManager: () => ({
    panes: {},
    paneOrder: [],
    activePane: null,
    savedSizes: {},
    conversations: {},
    isStartOpen: false,
    conversationsRef: { current: {} },
    activePaneRef: { current: null },
    openPane: jest.fn(),
    closePane: jest.fn(),
    minimizePane: jest.fn(),
    toggleMaximizePane: jest.fn(),
    focusPane: jest.fn(),
    openConversation: jest.fn(),
    closeConversation: jest.fn(),
    closeAllConversations: jest.fn(),
    closeAllGames: jest.fn(),
    minimizeConversation: jest.fn(),
    toggleMaximizeConversation: jest.fn(),
    getZIndex: jest.fn(() => 1),
    handleTaskbarClick: jest.fn(),
    handleSizeChange: jest.fn(),
    handlePositionChange: jest.fn(),
    getInitialPosition: jest.fn(() => ({ left: 0, top: 0 })),
    toggleStartMenu: jest.fn(),
    closeStartMenu: jest.fn(),
    resetAll: jest.fn(),
    setNotificationTime: jest.fn(),
    unreadMetadata: {},
    clearNotificationTime: jest.fn(),
    games: {},
    openGamePane: jest.fn(),
    closeGamePane: jest.fn(),
    minimizeGamePane: jest.fn(),
    toggleMaximizeGamePane: jest.fn()
  })
}));

jest.mock('./hooks/useMessageListeners', () => ({
  useMessageListeners: () => ({
    cleanup: jest.fn()
  })
}));

jest.mock('./hooks/useActiveTabSessionGuard', () => ({
  useActiveTabSessionGuard: () => ({
    beginSessionClose: jest.fn(() => true),
    resetSessionState: jest.fn(),
    consumeSessionKickAlert: jest.fn(() => true)
  })
}));

jest.mock('./hooks/useMessengerCoordinator', () => ({
  useMessengerCoordinator: () => ({
    handleIncomingMessage: jest.fn(),
    handleContactOnline: jest.fn(),
    handleToastClick: jest.fn()
  })
}));

jest.mock('./hooks/useSystrayManager', () => ({
  useSystrayManager: () => ({
    systrayMenuRef: { current: null },
    systrayIconRef: { current: null },
    currentStatusOption: { label: 'Online', color: '#00aa00' },
    onToggleMenu: jest.fn(),
    showSystrayMenu: false,
    onStatusChange: jest.fn(),
    onOpenContacts: jest.fn(),
    onSignOut: jest.fn(),
    onCloseMessenger: jest.fn()
  })
}));

jest.mock('./hooks/useDesktopManager', () => ({
  useDesktopManager: () => ({
    shortcuts: [],
    openShortcut: jest.fn(),
    renameShortcut: jest.fn(),
    moveShortcut: jest.fn(),
    removeShortcut: jest.fn(),
    alignShortcutsToGrid: jest.fn(),
    desktopGridConfig: {}
  })
}));

jest.mock('./hooks/useDesktopCommandBus', () => ({
  useDesktopCommandBus: () => ({
    openPane: jest.fn(),
    openConversation: jest.fn(),
    focusPane: jest.fn(),
    minimizePane: jest.fn(),
    closePane: jest.fn(),
    toggleStart: jest.fn(),
    openContacts: jest.fn()
  })
}));

jest.mock('./hooks/useContextMenuManager', () => ({
  useContextMenuManager: () => ({
    enabled: false,
    openMenu: jest.fn(),
    closeMenu: jest.fn(),
    menuState: null,
    hostRef: { current: null }
  })
}));

jest.mock('./hooks/usePresenceCoordinator', () => ({
  usePresenceCoordinator: () => ({
    contactPresence: {},
    resetPresenceState: jest.fn()
  })
}));

jest.mock('./utils/gunCleanup', () => ({
  runFullCleanup: jest.fn()
}));

jest.mock('./utils/encryption', () => ({
  clearEncryptionCache: jest.fn()
}));

jest.mock('./utils/sessionNotice', () => ({
  createConflictSessionNotice: jest.fn(),
  saveSessionNotice: jest.fn(),
  loadSessionNotice: jest.fn(() => null),
  clearSessionNotice: jest.fn()
}));

jest.mock('./contexts/ScanlinesContext', () => ({
  useScanlinesPreference: () => ({
    scanlinesEnabled: false,
    setStorageUserKey: jest.fn()
  })
}));

jest.mock('./contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: {
      colorScheme: 'blauw',
      fontSize: 'normaal',
      customLunaTheme: null
    },
    setStorageUserKey: jest.fn(),
    setAppearanceVariant: jest.fn()
  })
}));

jest.mock('./contexts/AvatarContext', () => ({
  useAvatar: () => ({
    getAvatar: jest.fn(() => '/avatar.png'),
    getDisplayName: jest.fn((value) => value)
  })
}));

jest.mock('./contexts/WallpaperContext', () => ({
  useWallpaper: () => ({
    getWallpaperStyle: jest.fn(() => ({}))
  })
}));

jest.mock('./config/featureFlags', () => ({
  FEATURE_FLAGS: {
    contextMenus: false
  }
}));

jest.mock('./utils/storageScope', () => ({
  removeScoped: jest.fn()
}));

jest.mock('./utils/userPrefsGun', () => ({
  readUserPrefOnce: jest.fn().mockResolvedValue(false),
  PREF_KEYS: {
    REMEMBER_ME: 'remember-me'
  }
}));

jest.mock('./utils/lunaCustomTheme', () => ({
  buildLunaCustomThemeStyle: jest.fn(() => ({}))
}));

const App = require('./App').default;
const { user: mockUser } = require('./gun');

describe('App OS routing', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mockUser.is = null;
    window.history.pushState({}, '', '/');
  });

  test('shows OS selector when no OS has been chosen yet', () => {
    render(<App />);
    expect(screen.getByTestId('os-selector')).toBeInTheDocument();
  });

  test('routes dx boot flow when dX is selected and boot is not complete', () => {
    localStorage.setItem('chatlon_os', 'dx');
    render(<App />);
    expect(screen.getByTestId('boot-sequence')).toBeInTheDocument();
  });

  test('routes Liger boot flow when Liger is selected and boot is not complete', () => {
    localStorage.setItem('chatlon_os', 'liger');
    render(<App />);
    expect(screen.getByTestId('liger-boot-sequence')).toBeInTheDocument();
  });

  test('routes to the dx login screen after boot completion', () => {
    localStorage.setItem('chatlon_os', 'dx');
    sessionStorage.setItem('chatlon_boot_complete', 'true');
    render(<App />);
    expect(screen.getByTestId('login-screen')).toBeInTheDocument();
  });

  test('routes to the Liger login screen after boot completion', () => {
    localStorage.setItem('chatlon_os', 'liger');
    sessionStorage.setItem('chatlon_boot_complete', 'true');
    render(<App />);
    expect(screen.getByTestId('liger-login-screen')).toBeInTheDocument();
  });

  test('reset-os clears the persisted OS choice and boot flag before rendering', () => {
    localStorage.setItem('chatlon_os', 'liger');
    sessionStorage.setItem('chatlon_boot_complete', 'true');
    window.history.pushState({}, '', '/?reset-os');

    render(<App />);

    expect(localStorage.getItem('chatlon_os')).toBeNull();
    expect(sessionStorage.getItem('chatlon_boot_complete')).toBeNull();
    expect(screen.getByTestId('os-selector')).toBeInTheDocument();
  });
});
