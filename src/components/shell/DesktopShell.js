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

function DesktopShell({
  onDesktopClick,
  wallpaperStyle,
  dataTheme,
  dataFontsize,
  scanlinesEnabled,
  desktopShortcuts,
  onOpenShortcut,
  onShortcutContextMenu,
  onRenameShortcut,
  onMoveShortcut,
  gridConfig,
  paneLayerProps,
  startMenuProps,
  taskbarProps,
  toasts,
  removeToast,
  onToastClick,
  contextMenu
}) {
  return (
    <div
      className="desktop"
      onMouseDown={(event) => {
        if (event.target.closest('.pane-frame')) return;
        if (event.target.closest('input, textarea, [contenteditable="true"]')) return;
        blurEditableActiveElement();
      }}
      onClick={onDesktopClick}
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
      style={wallpaperStyle}
      data-theme={dataTheme}
      data-fontsize={dataFontsize}
    >
      <div id="portal-root"></div>
      <div className={`scanlines-overlay ${scanlinesEnabled ? '' : 'scanlines-overlay--disabled'}`}></div>

      <DesktopShortcuts
        shortcuts={desktopShortcuts}
        onOpenShortcut={onOpenShortcut}
        onShortcutContextMenu={onShortcutContextMenu}
        onRenameShortcut={onRenameShortcut}
        onMoveShortcut={onMoveShortcut}
        gridConfig={gridConfig}
      />

      <PaneLayer {...paneLayerProps} />

      <StartMenu {...startMenuProps} />

      <Taskbar {...taskbarProps} />

      <div className="toast-container">
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onClose={removeToast}
            onClick={onToastClick}
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
