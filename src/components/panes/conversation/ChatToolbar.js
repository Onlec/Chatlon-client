import React, { useState, useRef, useEffect } from 'react';

const GAME_OPTIONS = [
  { id: 'tictactoe', label: 'Tic Tac Toe', icon: '\u2B55' },
];

const WINK_OPTIONS = [
  { id: 'hearts', label: 'Hartjes', icon: '\u2764\uFE0F' },
  { id: 'stars',  label: 'Sterren', icon: '\u2B50' },
  { id: 'lol',    label: 'LOL',     icon: '\uD83D\uDE02' },
  { id: 'kiss',   label: 'Kusje',   icon: '\uD83D\uDC8B' },
  { id: 'cool',   label: 'Cool',    icon: '\uD83D\uDE0E' },
];

function ChatToolbar({ onNudge, canNudge, onStartCall, callState, onOpenGames, hasPendingGameInvite, onSendWink, canWink }) {
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [showWinkMenu, setShowWinkMenu] = useState(false);
  const gameMenuRef = useRef(null);
  const winkMenuRef = useRef(null);

  useEffect(() => {
    if (!showGameMenu) return;
    const close = (e) => {
      if (!gameMenuRef.current?.contains(e.target)) setShowGameMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showGameMenu]);

  useEffect(() => {
    if (!showWinkMenu) return;
    const close = (e) => {
      if (!winkMenuRef.current?.contains(e.target)) setShowWinkMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showWinkMenu]);

  const tools = [
    { icon: '\u{1F465}', label: 'Uitnodigen' },
    { icon: '\u{1F4CE}', label: 'Bestand' },
    { icon: '\u{1F3A5}', label: 'Video' },
    { icon: '\u{1F3A4}', label: 'Spraak', onClick: onStartCall, disabled: callState !== 'idle' },
    { icon: '\u{1F3AE}', label: 'Activiteiten' },
  ];

  return (
    <div className="chat-toolbar">
      {tools.map((t) => (
        <button
          key={t.label}
          className={`chat-toolbar-btn ${t.disabled ? 'chat-toolbar-btn--disabled' : ''}`}
          onClick={t.onClick || undefined}
          disabled={t.disabled}
        >
          <span className="chat-toolbar-icon">{t.icon}</span>
          <span className="chat-toolbar-label">{t.label}</span>
        </button>
      ))}

      <div className="chat-toolbar-game-wrap" ref={gameMenuRef}>
        <button
          className={`chat-toolbar-btn ${hasPendingGameInvite ? 'chat-toolbar-btn--disabled' : ''}`}
          disabled={hasPendingGameInvite}
          onClick={() => setShowGameMenu((v) => !v)}
        >
          <span className="chat-toolbar-icon">{'\u{1F3B2}'}</span>
          <span className="chat-toolbar-label">Spelletjes</span>
        </button>

        {showGameMenu && (
          <div className="game-select-menu">
            <div className="game-select-menu-title">Kies een spel</div>
            {GAME_OPTIONS.map((g) => (
              <button
                key={g.id}
                className="game-select-menu-item"
                onClick={() => {
                  setShowGameMenu(false);
                  if (typeof onOpenGames === 'function') onOpenGames(g.id);
                }}
              >
                <span>{g.icon}</span>
                <span>{g.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="chat-toolbar-wink-wrap" ref={winkMenuRef}>
        <button
          className={`chat-toolbar-btn ${!canWink ? 'chat-toolbar-btn--disabled' : ''}`}
          disabled={!canWink}
          onClick={() => setShowWinkMenu((v) => !v)}
        >
          <span className="chat-toolbar-icon">{'\u2728'}</span>
          <span className="chat-toolbar-label">Winks</span>
        </button>

        {showWinkMenu && (
          <div className="wink-select-menu">
            <div className="wink-select-menu-title">Kies een wink</div>
            {WINK_OPTIONS.map((w) => (
              <button
                key={w.id}
                className="wink-select-menu-item"
                onClick={() => {
                  setShowWinkMenu(false);
                  if (typeof onSendWink === 'function') onSendWink(w.id);
                }}
              >
                <span>{w.icon}</span>
                <span>{w.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="chat-toolbar-separator"></div>
      <button className="chat-toolbar-btn">{'\u{1F6AB}'}</button>
      <button className="chat-toolbar-btn">{'\u{1F58C}\uFE0F'}</button>
    </div>
  );
}

export default ChatToolbar;
