import React from 'react';
import ToastNotification from '../ToastNotification';
import DesktopShortcuts from './DesktopShortcuts';
import PaneLayer from './PaneLayer';
import StartMenu from './StartMenu';
import Taskbar from './Taskbar';
import ContextMenuHost from './ContextMenuHost';

function DesktopShell({
  onDesktopClick,
  wallpaperStyle,
  dataTheme,
  dataFontsize,
  scanlinesEnabled,
  desktopShortcuts,
  onOpenShortcut,
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
      onClick={onDesktopClick}
      onContextMenu={contextMenu?.handleContextMenu}
      style={wallpaperStyle}
      data-theme={dataTheme}
      data-fontsize={dataFontsize}
    >
      <div id="portal-root"></div>
      <div className={`scanlines-overlay ${scanlinesEnabled ? '' : 'disabled'}`}></div>

      <DesktopShortcuts shortcuts={desktopShortcuts} onOpenShortcut={onOpenShortcut} />

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
      />
    </div>
  );
}

export default DesktopShell;
