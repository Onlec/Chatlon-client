import React from 'react';
import ToastNotification from '../ToastNotification';
import DesktopShortcuts from './DesktopShortcuts';
import PaneLayer from './PaneLayer';
import StartMenu from './StartMenu';
import Taskbar from './Taskbar';
import ContextMenuHost from './ContextMenuHost';

function blurEditableActiveElement() {
  if (typeof document === 'undefined') return;
  const active = document.activeElement;
  if (!active || typeof active.matches !== 'function') return;
  if (!active.matches('input, textarea, [contenteditable="true"]')) return;
  if (typeof active.blur === 'function') {
    active.blur();
  }
}

function DesktopShell({ shellProps }) {
  const {
    session,
    shortcuts,
    windows,
    navigation,
    notifications,
    status,
    contextMenu
  } = shellProps;

  const desktopStyle =
    session.wallpaperStyle || session.themeStyle
      ? {
          ...(session.wallpaperStyle || {}),
          ...(session.themeStyle || {}),
        }
      : undefined;

  return (
    <div
      className="desktop"
      onMouseDown={(event) => {
        if (event.target.closest('.pane-frame')) return;
        if (event.target.closest('input, textarea, [contenteditable="true"]')) return;
        blurEditableActiveElement();
      }}
      onClick={session.onDesktopClick}
      onContextMenu={(event) => {
        if (!contextMenu?.enabled) return;
        if (event.target.closest('.pane-frame')) return;
        event.preventDefault();
        event.stopPropagation();
        contextMenu.openMenu({
          x: event.clientX,
          y: event.clientY,
          type: 'desktop',
          target: null,
          actions: typeof contextMenu.buildDesktopActions === 'function'
            ? contextMenu.buildDesktopActions()
            : []
        });
      }}
      style={desktopStyle}
      data-theme={session.dataTheme}
      data-fontsize={session.dataFontsize}
    >
      <div id="portal-root"></div>
      <div className={`scanlines-overlay ${status.scanlinesEnabled ? '' : 'scanlines-overlay--disabled'}`}></div>

      <DesktopShortcuts
        shortcuts={shortcuts.items}
        onOpenShortcut={shortcuts.onOpen}
        onShortcutContextMenu={shortcuts.onContextMenu}
        onRenameShortcut={shortcuts.onRename}
        onMoveShortcut={shortcuts.onMove}
        gridConfig={shortcuts.gridConfig}
        layoutVariant={shortcuts.layoutVariant}
      />

      <PaneLayer {...windows.paneLayerProps} chromeVariant={windows.chromeVariant} />

      <StartMenu {...navigation.startMenuProps} />

      <Taskbar {...navigation.taskbarProps} />

      <div className="toast-container">
        {notifications.toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onClose={notifications.removeToast}
            onClick={notifications.onToastClick}
          />
        ))}
      </div>

      <ContextMenuHost
        enabled={Boolean(contextMenu?.enabled)}
        menuState={contextMenu?.menuState}
        onClose={contextMenu?.closeMenu}
        hostRef={contextMenu?.hostRef}
      />
    </div>
  );
}

export default DesktopShell;
