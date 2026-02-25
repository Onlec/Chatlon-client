import React from 'react';

function DesktopShortcuts({ shortcuts, onOpenShortcut }) {
  return (
    <div className="shortcuts-area">
      {shortcuts.map((shortcut) => (
        <div key={shortcut.id} className="shortcut" onDoubleClick={() => onOpenShortcut(shortcut.id)}>
          {shortcut.icon.endsWith('.ico') || shortcut.icon.endsWith('.png') ? (
            <img src={shortcut.icon} alt={shortcut.label} className="shortcut-icon" />
          ) : (
            <span className="shortcut-icon shortcut-icon-emoji">{shortcut.icon}</span>
          )}
          <span className="shortcut-label">{shortcut.label}</span>
        </div>
      ))}
    </div>
  );
}

export default DesktopShortcuts;
