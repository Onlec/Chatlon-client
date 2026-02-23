import React from 'react';

function ChatToolbar({ onNudge, canNudge, onStartCall, callState }) {
  const tools = [
    { icon: '\u{1F465}', label: 'Uitnodigen' },
    { icon: '\u{1F4CE}', label: 'Bestand' },
    { icon: '\u{1F3A5}', label: 'Video' },
    { icon: '\u{1F3A4}', label: 'Spraak', onClick: onStartCall, disabled: callState !== 'idle' },
    { icon: '\u{1F3AE}', label: 'Activiteiten' },
    { icon: '\u{1F3B2}', label: 'Spelletjes' }
  ];
  return (
    <div className="chat-toolbar">
      {tools.map((t) => (
        <button
          key={t.label}
          className={`chat-toolbar-btn ${t.disabled ? 'disabled' : ''}`}
          onClick={t.onClick || undefined}
          disabled={t.disabled}
        >
          <span className="chat-toolbar-icon">{t.icon}</span>
          <span className="chat-toolbar-label">{t.label}</span>
        </button>
      ))}
      <div className="chat-toolbar-separator"></div>
      <button className="chat-toolbar-btn">{'\u{1F6AB}'}</button>
      <button className="chat-toolbar-btn">{'\u{1F58C}\uFE0F'}</button>
    </div>
  );
}

export default ChatToolbar;
