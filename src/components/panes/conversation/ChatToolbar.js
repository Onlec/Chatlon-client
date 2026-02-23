import React from 'react';

function ChatToolbar({ onNudge, canNudge, onStartCall, callState }) {
  const tools = [
    { icon: 'ðŸ‘¥', label: 'Uitnodigen' },
    { icon: 'ðŸ“Ž', label: 'Bestand' },
    { icon: 'ðŸŽ¥', label: 'Video' },
    { icon: 'ðŸŽ¤', label: 'Spraak', onClick: onStartCall, disabled: callState !== 'idle' },
    { icon: 'ðŸŽ®', label: 'Activiteiten' },
    { icon: 'ðŸŽ²', label: 'Spelletjes' }
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
      <button className="chat-toolbar-btn">ðŸš«</button>
      <button className="chat-toolbar-btn">ðŸ–Œï¸</button>
    </div>
  );
}

export default ChatToolbar;
