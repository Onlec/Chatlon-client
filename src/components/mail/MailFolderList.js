// src/components/mail/MailFolderList.js

import React from 'react';

function MailFolderList({
  activeFolder,
  onSelectFolder,
  unreadCount,
  draftsCount,
  onFolderContextMenu,
  onBackgroundContextMenu,
}) {
  const folders = [
    { id: 'inbox',  label: 'Postvak IN',        icon: '📥' },
    { id: 'sent',   label: 'Verzonden items',    icon: '📤' },
    { id: 'drafts', label: 'Concepten',          icon: '📝' },
    { id: 'trash',  label: 'Verwijderde items',  icon: '🗑️' },
  ];

  return (
    <div
      className="mail-folder-list"
      onContextMenu={onBackgroundContextMenu}
      data-testid="mail-folder-list"
    >
      {folders.map(folder => (
        <div
          key={folder.id}
          className={`mail-folder-item${activeFolder === folder.id ? ' mail-folder-item--active' : ''}`}
          onClick={() => onSelectFolder(folder.id)}
          onContextMenu={(event) => {
            event.stopPropagation();
            onFolderContextMenu?.(event, folder);
          }}
        >
          <span className="mail-folder-icon">{folder.icon}</span>
          <span className="mail-folder-label">{folder.label}</span>
          {folder.id === 'inbox' && unreadCount > 0 && (
            <span className="mail-folder-badge">{unreadCount}</span>
          )}
          {folder.id === 'drafts' && draftsCount > 0 && (
            <span className="mail-folder-badge">{draftsCount}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default MailFolderList;
