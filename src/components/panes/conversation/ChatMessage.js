import React from 'react';
import { convertEmoticons } from '../../../utils/emoticons';
import { useAvatar } from '../../../contexts/AvatarContext';

function ChatMessage({ msg, prevMsg, currentUser }) {
  const { getDisplayName } = useAvatar();
  const isFirstNew = prevMsg?.isLegacy && !msg.isLegacy;

  // Systeembericht (nudge melding) - opgeslagen in chat-node met type: 'nudge'
  if (msg.type === 'nudge') {
    const isSelf = msg.sender === currentUser;
    const name = getDisplayName(msg.sender);
    return (
      <>
        {isFirstNew && <div className="chat-history-divider"><span>Laatst verzonden berichten</span></div>}
        <div className="chat-message-system">
          {'\u26A1'} {isSelf ? 'Je hebt een nudge gestuurd.' : <><strong>{name}</strong> heeft een nudge gestuurd.</>}
        </div>
      </>
    );
  }

  // Game systeemberichten
  if (msg.type === 'gameinvite' || msg.type === 'gameaccept' || msg.type === 'gamedecline') {
    const isSelf = msg.sender === currentUser;
    const name = getDisplayName(msg.sender);
    const gameLabel = msg.gameType === 'tictactoe' ? 'Tic Tac Toe' : (msg.gameType || 'een spel');
    let icon, text;
    if (msg.type === 'gameinvite') {
      icon = '\uD83C\uDFB2';
      text = isSelf
        ? `Je hebt een ${gameLabel}-uitnodiging gestuurd.`
        : <><strong>{name}</strong> heeft een {gameLabel}-uitnodiging gestuurd.</>;
    } else if (msg.type === 'gameaccept') {
      icon = '\u2705';
      text = isSelf
        ? `Je hebt de ${gameLabel}-uitnodiging geaccepteerd.`
        : <><strong>{name}</strong> heeft de {gameLabel}-uitnodiging geaccepteerd.</>;
    } else {
      icon = '\u274C';
      text = isSelf
        ? `Je hebt de ${gameLabel}-uitnodiging geweigerd.`
        : <><strong>{name}</strong> heeft de {gameLabel}-uitnodiging geweigerd.</>;
    }
    return (
      <>
        {isFirstNew && <div className="chat-history-divider"><span>Laatst verzonden berichten</span></div>}
        <div className="chat-message-system">
          {icon} {text}
        </div>
      </>
    );
  }

  const selfClass = msg.sender === currentUser ? 'chat-message--self' : 'chat-message--contact';
  return (
    <>
      {isFirstNew && <div className="chat-history-divider"><span>Laatst verzonden berichten</span></div>}
      <div className={`chat-message ${msg.isLegacy ? 'chat-message--legacy' : ''} ${selfClass}`}>
        <div className="chat-message-header"><strong>{getDisplayName(msg.sender)}</strong> zegt ({msg.timestamp}):</div>
        <div className="chat-message-content">{convertEmoticons(msg.content)}</div>
      </div>
    </>
  );
}

export default ChatMessage;
