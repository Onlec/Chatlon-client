import React from 'react';
import Systray from './Systray';

function blurEditableActiveElement() {
  if (typeof document === 'undefined') return;
  const active = document.activeElement;
  if (!active || typeof active.matches !== 'function') return;
  if (!active.matches('input, textarea, [contenteditable="true"]')) return;
  if (typeof active.blur === 'function') {
    active.blur();
  }
}

function Taskbar({
  isStartOpen,
  onToggleStartMenu,
  onStartButtonContextMenu,
  onTaskbarContextMenu,
  paneOrder,
  unreadChats,
  conversations,
  games,
  activePane,
  onTaskbarClick,
  onTabContextMenu,
  panes,
  paneConfig,
  getDisplayName,
  systrayProps
}) {
  return (
    <div
      className="taskbar"
      onMouseDown={() => {
        blurEditableActiveElement();
      }}
      onContextMenu={(event) => {
        if (typeof onTaskbarContextMenu !== 'function') return;
        event.preventDefault();
        event.stopPropagation();
        onTaskbarContextMenu(event);
      }}
    >
      <button
        className={`start-btn ${isStartOpen ? 'start-btn--pressed' : ''}`}
        onClick={(e) => { e.stopPropagation(); onToggleStartMenu(); }}
        onContextMenu={(event) => {
          if (typeof onStartButtonContextMenu !== 'function') return;
          event.preventDefault();
          event.stopPropagation();
          onStartButtonContextMenu(event);
        }}
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
                className={`taskbar-tab ${activePane === paneId ? 'taskbar-tab--active' : ''} ${isUnread ? 'taskbar-tab--unread' : ''}`}
                onClick={() => onTaskbarClick(paneId)}
                onContextMenu={(event) => {
                  if (typeof onTabContextMenu !== 'function') return;
                  event.preventDefault();
                  event.stopPropagation();
                  onTabContextMenu(event, paneId);
                }}
                title={`${getDisplayName(contactName)} - Gesprek`}
              >
                <span className="taskbar-icon">{'\u{1F4AC}'}</span>
                <span>{getDisplayName(contactName)}</span>
              </div>
            );
          }

          if (paneId.startsWith('game_')) {
            const game = games?.[paneId];
            if (!game?.isOpen) return null;
            const gameLabel = game.gameType === 'tictactoe' ? 'Tic Tac Toe' : game.gameType;
            return (
              <div
                key={paneId}
                className={`taskbar-tab ${activePane === paneId ? 'taskbar-tab--active' : ''}`}
                onClick={() => onTaskbarClick(paneId)}
                onContextMenu={(event) => {
                  if (typeof onTabContextMenu !== 'function') return;
                  event.preventDefault();
                  event.stopPropagation();
                  onTabContextMenu(event, paneId);
                }}
                title={`Spelletje met ${getDisplayName(game.contactName)}`}
              >
                <span className="taskbar-icon">{'\u{1F3B2}'}</span>
                <span>{gameLabel}</span>
              </div>
            );
          }

          const pane = panes[paneId];
          if (!pane || !pane.isOpen) return null;
          const config = paneConfig[paneId];
          return (
            <div
              key={paneId}
              className={`taskbar-tab ${activePane === paneId ? 'taskbar-tab--active' : ''}`}
              onClick={() => onTaskbarClick(paneId)}
              onContextMenu={(event) => {
                if (typeof onTabContextMenu !== 'function') return;
                event.preventDefault();
                event.stopPropagation();
                onTabContextMenu(event, paneId);
              }}
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
