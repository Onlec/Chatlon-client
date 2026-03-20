export const LIGER_MENU_ACTIONS = {
  CLOSE_ACTIVE: 'closeActive',
  LOGOFF: 'logoff',
  SHUTDOWN: 'shutdown'
};

const DEFAULT_WINDOW_ICON = '\u{1FA9F}';
const CONVERSATION_ICON = '\u{1F4AC}';
const GAME_ICON = '\u{1F3B2}';
const DEFAULT_APP_NAME = 'Liger';
const DEFAULT_CHATLON_APP_NAME = 'Chatlon';

function normalizeLabel(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function resolveGameName(game) {
  if (!game?.gameType) return 'Spelletje';
  return game.gameType === 'tictactoe' ? 'Tic Tac Toe' : game.gameType;
}

function resolveChatlonAppName(paneConfig = {}) {
  return (
    resolvePaneTitle(paneConfig.contacts, 'liger')
    || resolvePaneTitle(paneConfig.chat, 'liger')
    || DEFAULT_CHATLON_APP_NAME
  );
}

function buildWindowMenu(windowItems = []) {
  if (!windowItems.length) {
    return {
      label: 'Venster',
      items: [
        {
          label: 'Geen open vensters',
          disabled: true
        }
      ]
    };
  }

  return {
    label: 'Venster',
    items: windowItems.map((item) => ({
      windowId: item.id,
      icon: item.icon,
      label: item.label,
      isActive: item.isActive,
      meta: item.isMinimized ? 'Geminimaliseerd' : undefined
    }))
  };
}

function injectWindowMenu(baseMenus = [], windowItems = []) {
  const menusWithoutWindow = baseMenus.filter((menu) => menu?.label !== 'Venster');
  const windowMenu = buildWindowMenu(windowItems);
  const helpIndex = menusWithoutWindow.findIndex((menu) => menu?.label === 'Help');

  if (helpIndex === -1) {
    return [...menusWithoutWindow, windowMenu];
  }

  return [
    ...menusWithoutWindow.slice(0, helpIndex),
    windowMenu,
    ...menusWithoutWindow.slice(helpIndex)
  ];
}

function getConversationMenus() {
  return [
    {
      label: 'Archief',
      items: [
        { label: 'Gesprek bewaren', disabled: true },
        { type: 'separator' },
        { label: 'Sluiten', shortcut: 'Cmd+W', action: LIGER_MENU_ACTIONS.CLOSE_ACTIVE }
      ]
    },
    {
      label: 'Acties',
      items: [
        { label: 'Nudge sturen', disabled: true },
        { label: 'Bestand sturen', disabled: true }
      ]
    },
    {
      label: 'Help',
      items: [
        { label: 'Chatlon Help', disabled: true }
      ]
    }
  ];
}

function getGameMenus() {
  return [
    {
      label: 'Archief',
      items: [
        { label: 'Nieuwe ronde', disabled: true },
        { type: 'separator' },
        { label: 'Sluiten', shortcut: 'Cmd+W', action: LIGER_MENU_ACTIONS.CLOSE_ACTIVE }
      ]
    },
    {
      label: 'Spel',
      items: [
        { label: 'Uitnodiging opnieuw sturen', disabled: true }
      ]
    },
    {
      label: 'Help',
      items: [
        { label: 'Chatlon Help', disabled: true }
      ]
    }
  ];
}

export function resolvePaneTitle(config, variant = 'dx') {
  if (!config) return '';
  if (variant === 'liger') {
    return normalizeLabel(config.ligerTitle, '')
      || normalizeLabel(config.title, '')
      || normalizeLabel(config.label, '')
      || normalizeLabel(config.desktopLabel, '');
  }

  return normalizeLabel(config.title, '')
    || normalizeLabel(config.label, '')
    || normalizeLabel(config.desktopLabel, '');
}

export function buildLigerActiveAppName({
  activePane,
  paneConfig = {}
} = {}) {
  if (!activePane) return DEFAULT_APP_NAME;

  if (activePane.startsWith('conv_') || activePane.startsWith('game_')) {
    return resolveChatlonAppName(paneConfig);
  }

  return resolvePaneTitle(paneConfig[activePane], 'liger') || activePane;
}

export function buildLigerWindowItemsModel({
  activePane,
  paneOrder = [],
  panes = {},
  conversations = {},
  games = {},
  paneConfig = {},
  getDisplayName = (value) => value
} = {}) {
  const seen = new Set();
  const orderedIds = [];
  const pushId = (paneId) => {
    if (!paneId || seen.has(paneId)) return;
    seen.add(paneId);
    orderedIds.push(paneId);
  };

  paneOrder.forEach(pushId);
  Object.entries(panes).forEach(([paneId, pane]) => {
    if (pane?.isOpen) pushId(paneId);
  });
  Object.entries(conversations).forEach(([paneId, conversation]) => {
    if (conversation?.isOpen) pushId(paneId);
  });
  Object.entries(games).forEach(([paneId, game]) => {
    if (game?.isOpen) pushId(paneId);
  });

  return orderedIds.map((paneId) => {
    if (paneId.startsWith('conv_')) {
      const conversation = conversations[paneId];
      if (!conversation?.isOpen) return null;

      return {
        id: paneId,
        type: 'conversation',
        icon: CONVERSATION_ICON,
        label: `${getDisplayName(conversation.contactName)} - Gesprek`,
        isActive: activePane === paneId,
        isMinimized: Boolean(conversation.isMinimized)
      };
    }

    if (paneId.startsWith('game_')) {
      const game = games[paneId];
      if (!game?.isOpen) return null;

      return {
        id: paneId,
        type: 'game',
        icon: GAME_ICON,
        label: `${resolveGameName(game)} - ${getDisplayName(game.contactName)}`,
        isActive: activePane === paneId,
        isMinimized: Boolean(game.isMinimized)
      };
    }

    const pane = panes[paneId];
    const config = paneConfig[paneId];
    if (!pane?.isOpen || !config) return null;

    return {
      id: paneId,
      type: 'pane',
      icon: config.icon || config.desktopIcon || DEFAULT_WINDOW_ICON,
      label: resolvePaneTitle(config, 'liger') || paneId,
      isActive: activePane === paneId,
      isMinimized: Boolean(pane.isMinimized)
    };
  }).filter(Boolean);
}

export function buildLigerMenus({
  activePane,
  paneConfig = {},
  windowItems = []
} = {}) {
  if (activePane?.startsWith('conv_')) {
    return injectWindowMenu(getConversationMenus(), windowItems);
  }

  if (activePane?.startsWith('game_')) {
    return injectWindowMenu(getGameMenus(), windowItems);
  }

  const baseMenus = activePane
    ? Array.isArray(paneConfig[activePane]?.ligerMenu)
      ? paneConfig[activePane].ligerMenu
      : []
    : [];

  return injectWindowMenu(baseMenus, windowItems);
}

export function buildLigerDockAppItems({
  paneConfig = {},
  panes = {},
  activePane
} = {}) {
  return Object.entries(paneConfig).map(([paneId, config]) => ({
    key: paneId,
    icon: config.desktopIcon || config.icon || '\u{1F9E9}',
    label: resolvePaneTitle(config, 'liger') || config.desktopLabel || paneId,
    isRunning: Boolean(panes[paneId]?.isOpen),
    isActive: activePane === paneId
  }));
}

export function buildLigerMinimizedDockItems(windowItems = []) {
  return windowItems
    .filter((item) => item.isMinimized)
    .map((item) => ({
      key: item.id,
      icon: item.icon,
      label: item.label,
      isActive: item.isActive
    }));
}
