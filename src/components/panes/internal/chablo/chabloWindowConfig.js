export const CHABLO_WINDOW_PRESETS = {
  navigator: {
    title: 'Hotel Navigator',
    size: { width: 276, height: 336 },
    position: { left: 18, top: 18 }
  },
  console: {
    title: 'Habbo Console',
    size: { width: 360, height: 430 },
    position: { left: 92, top: 40 },
    activeSubview: 'users'
  },
  chatHistory: {
    title: 'Chat History',
    size: { width: 380, height: 360 },
    position: { left: 150, top: 78 },
    activeSubview: 'room'
  },
  bulletin: {
    title: 'Bulletin',
    size: { width: 342, height: 334 },
    position: { left: 236, top: 30 },
    activeSubview: 'state'
  },
  wardrobe: {
    title: 'Wardrobe',
    size: { width: 356, height: 452 },
    position: { left: 120, top: 28 }
  },
  backpack: {
    title: 'Hand / Backpack',
    size: { width: 340, height: 388 },
    position: { left: 212, top: 84 },
    activeSubview: 'hotspots'
  },
  habmoji: {
    title: 'Habmoji',
    size: { width: 280, height: 204 },
    position: { left: 260, top: 146 }
  },
  purse: {
    title: 'Habbo Purse',
    size: { width: 286, height: 208 },
    position: { left: 282, top: 62 }
  },
  catalogue: {
    title: 'Habbo Catalogue',
    size: { width: 320, height: 236 },
    position: { left: 330, top: 96 }
  },
  challenges: {
    title: 'Challenges',
    size: { width: 292, height: 224 },
    position: { left: 362, top: 44 }
  }
};

export const CHABLO_HUD_LAUNCHERS = [
  { id: 'console', label: 'Console', windowId: 'console', subview: 'users' },
  { id: 'navigator', label: 'Navigator', windowId: 'navigator' },
  { id: 'challenges', label: 'Challenges', windowId: 'challenges' },
  { id: 'purse', label: 'Purse', windowId: 'purse' },
  { id: 'catalogue', label: 'Catalogue', windowId: 'catalogue' },
  { id: 'hand', label: 'Hand', windowId: 'backpack', subview: 'hotspots' }
];

export const CHABLO_AVATAR_MENU_ITEMS = [
  { id: 'wardrobe', label: 'Wardrobe', windowId: 'wardrobe' },
  { id: 'backpack', label: 'Backpack', windowId: 'backpack', subview: 'hotspots' },
  { id: 'chatHistory', label: 'Chat History', windowId: 'chatHistory', subview: 'room' },
  { id: 'habmoji', label: 'Habmoji', windowId: 'habmoji' },
  { id: 'userList', label: 'User List', windowId: 'console', subview: 'users' },
  { id: 'furniList', label: 'Furni List', windowId: 'backpack', subview: 'furni' },
  { id: 'bulletin', label: 'Bulletin', windowId: 'bulletin', subview: 'state' },
  { id: 'blockedContent', label: 'Blocked Content', windowId: 'console', subview: 'privacy' },
  { id: 'updates', label: 'Updates', windowId: 'bulletin', subview: 'updates' }
];

export function createInitialWindowState() {
  return Object.entries(CHABLO_WINDOW_PRESETS).reduce((next, [id, preset], index) => {
    next[id] = {
      id,
      open: false,
      title: preset.title,
      size: { ...preset.size },
      position: { ...preset.position },
      zIndex: index + 1,
      activeSubview: preset.activeSubview || null
    };
    return next;
  }, {});
}
