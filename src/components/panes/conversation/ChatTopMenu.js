import React from 'react';

function ChatTopMenu() {
  return (
    <div className="chat-menubar">
      {['Bestand', 'Bewerken', 'Acties', 'Extra', 'Help'].map((m) => <span key={m} className="chat-menu-item">{m}</span>)}
    </div>
  );
}

export default ChatTopMenu;
