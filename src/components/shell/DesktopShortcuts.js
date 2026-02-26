import React, { useState } from 'react';

function DesktopShortcuts({ shortcuts, onOpenShortcut, onShortcutContextMenu, onRenameShortcut }) {
  const [renamingId, setRenamingId] = useState(null);
  const [draftLabel, setDraftLabel] = useState('');

  const commitRename = (shortcutId) => {
    const nextLabel = draftLabel.trim();
    if (nextLabel && typeof onRenameShortcut === 'function') {
      onRenameShortcut(shortcutId, nextLabel);
    }
    setRenamingId(null);
    setDraftLabel('');
  };

  return (
    <div className="shortcuts-area">
      {shortcuts.map((shortcut) => (
        <div
          key={shortcut.id}
          className="shortcut"
          onDoubleClick={() => onOpenShortcut(shortcut.id)}
          onContextMenu={(event) => {
            if (typeof onShortcutContextMenu !== 'function') return;
            event.preventDefault();
            event.stopPropagation();
            onShortcutContextMenu(event, shortcut.id, () => {
              setRenamingId(shortcut.id);
              setDraftLabel(shortcut.label || '');
            });
          }}
        >
          {shortcut.icon.endsWith('.ico') || shortcut.icon.endsWith('.png') ? (
            <img src={shortcut.icon} alt={shortcut.label} className="shortcut-icon" />
          ) : (
            <span className="shortcut-icon shortcut-icon-emoji">{shortcut.icon}</span>
          )}
          {renamingId === shortcut.id ? (
            <input
              className="shortcut-label-input"
              value={draftLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  commitRename(shortcut.id);
                } else if (event.key === 'Escape') {
                  setRenamingId(null);
                  setDraftLabel('');
                }
              }}
              onBlur={() => commitRename(shortcut.id)}
              autoFocus
            />
          ) : (
            <span className="shortcut-label">{shortcut.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default DesktopShortcuts;
