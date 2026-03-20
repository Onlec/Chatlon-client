import {
  buildLigerActiveAppName,
  buildLigerDockAppItems,
  buildLigerMenus,
  buildLigerMinimizedDockItems,
  buildLigerWindowItemsModel,
  resolvePaneTitle
} from './ligerShell';

const basePaneConfig = {
  contacts: {
    title: 'Chatlon Messenger',
    icon: '\u{1F465}',
    desktopIcon: 'favicon.ico'
  },
  control: {
    title: 'Configuratiescherm',
    ligerTitle: 'Systeemvoorkeuren',
    icon: '\u2699\uFE0F',
    desktopIcon: '\u2699\uFE0F',
    ligerMenu: [
      {
        label: 'Archief',
        items: [
          { label: 'Sluiten', action: 'closeActive' }
        ]
      },
      {
        label: 'Help',
        items: [
          { label: 'Control Help', disabled: true }
        ]
      }
    ]
  }
};

describe('ligerShell selectors', () => {
  test('resolvePaneTitle prefers ligerTitle for liger panes', () => {
    expect(resolvePaneTitle(basePaneConfig.control, 'liger')).toBe('Systeemvoorkeuren');
    expect(resolvePaneTitle(basePaneConfig.control, 'dx')).toBe('Configuratiescherm');
  });

  test('buildLigerActiveAppName groups conversations under Chatlon', () => {
    expect(buildLigerActiveAppName({
      activePane: 'conv_alice',
      paneConfig: basePaneConfig
    })).toBe('Chatlon Messenger');
  });

  test('buildLigerWindowItemsModel uses liger titles and specific chat labels', () => {
    const items = buildLigerWindowItemsModel({
      activePane: 'conv_alice',
      paneOrder: ['control', 'conv_alice'],
      panes: {
        control: { isOpen: true, isMinimized: false }
      },
      conversations: {
        conv_alice: { contactName: 'alice', isOpen: true, isMinimized: true }
      },
      paneConfig: basePaneConfig,
      getDisplayName: (value) => value.toUpperCase()
    });

    expect(items).toEqual([
      expect.objectContaining({
        id: 'control',
        label: 'Systeemvoorkeuren',
        isMinimized: false
      }),
      expect.objectContaining({
        id: 'conv_alice',
        label: 'ALICE - Gesprek',
        isMinimized: true
      })
    ]);
  });

  test('buildLigerMenus injects Venster before Help', () => {
    const menus = buildLigerMenus({
      activePane: 'control',
      paneConfig: basePaneConfig,
      windowItems: [
        {
          id: 'control',
          icon: '\u2699\uFE0F',
          label: 'Systeemvoorkeuren',
          isActive: true,
          isMinimized: false
        },
        {
          id: 'conv_alice',
          icon: '\u{1F4AC}',
          label: 'Alice - Gesprek',
          isActive: false,
          isMinimized: true
        }
      ]
    });

    expect(menus.map((menu) => menu.label)).toEqual(['Archief', 'Venster', 'Help']);
    expect(menus[1].items[1]).toEqual(expect.objectContaining({
      windowId: 'conv_alice',
      meta: 'Geminimaliseerd'
    }));
  });

  test('buildLigerMenus returns a conversation fallback menu', () => {
    const menus = buildLigerMenus({
      activePane: 'conv_alice',
      paneConfig: basePaneConfig,
      windowItems: []
    });

    expect(menus.map((menu) => menu.label)).toEqual(['Archief', 'Acties', 'Venster', 'Help']);
  });

  test('buildLigerDockAppItems and buildLigerMinimizedDockItems split app and minimized windows', () => {
    const appItems = buildLigerDockAppItems({
      paneConfig: basePaneConfig,
      panes: {
        control: { isOpen: true, isMinimized: true },
        contacts: { isOpen: false, isMinimized: false }
      },
      activePane: 'control'
    });

    expect(appItems.find((item) => item.key === 'control')).toEqual(expect.objectContaining({
      label: 'Systeemvoorkeuren',
      isRunning: true,
      isActive: true
    }));

    expect(buildLigerMinimizedDockItems([
      { id: 'control', icon: '\u2699\uFE0F', label: 'Systeemvoorkeuren', isMinimized: true, isActive: false },
      { id: 'notepad', icon: '\u{1F4DD}', label: 'Teksteditor', isMinimized: false, isActive: false }
    ])).toEqual([
      {
        key: 'control',
        icon: '\u2699\uFE0F',
        label: 'Systeemvoorkeuren',
        isActive: false
      }
    ]);
  });
});
