import React from 'react';
import Systray from './Systray';

function Taskbar({
  isStartOpen,
  onToggleStartMenu,
  paneOrder,
  unreadChats,
  conversations,
  activePane,
  onTaskbarClick,
  panes,
  paneConfig,
  getDisplayName,
  systrayProps
}) {
  return (
    <div className="taskbar">
      <button
        className={`start-btn ${isStartOpen ? 'pressed' : ''}`}
        onClick={(e) => { e.stopPropagation(); onToggleStartMenu(); }}
      >
        <span className="start-icon">{'\u{1FA9F}'}</span> Start
      </button>

      <div className="taskbar-items">
        {Array.from(new Set([...paneOrder, ...Array.from(unreadChats)])).map((paneId) => {
          if (paneId.startsWith('conv_')) {
            const contactName = paneId.replace('conv_', '');
            const conv = conversations[paneId];
            const isUnread = unreadChats.has(paneId);

            if (!conv?.isOpen && !isUnread) return null;

            return (
              <div
                key={paneId}
                className={`taskbar-tab ${activePane === paneId ? 'active' : ''} ${isUnread ? 'unread' : ''}`}
                onClick={() => onTaskbarClick(paneId)}
                title={`${getDisplayName(contactName)} - Gesprek`}
              >
                <span className="taskbar-icon">{'\u{1F4AC}'}</span>
                <span>{getDisplayName(contactName)}</span>
              </div>
            );
          }

          const pane = panes[paneId];
          if (!pane || !pane.isOpen) return null;
          const config = paneConfig[paneId];
          return (
            <div
              key={paneId}
              className={`taskbar-tab ${activePane === paneId ? 'active' : ''}`}
              onClick={() => onTaskbarClick(paneId)}
              title={config.title || config.label}
            >
              <span className="taskbar-icon">{config.icon}</span>
              <span>{config.label}</span>
            </div>
          );
        })}
      </div>

      <Systray {...systrayProps} />
    </div>
  );
}

export default Taskbar;
