import React from 'react';
import { convertEmoticons } from '../../../utils/emoticons';
import { useAvatar } from '../../../contexts/AvatarContext';

function ChatMessage({ msg, prevMsg, currentUser }) {
  const { getDisplayName } = useAvatar();
  const isFirstNew = prevMsg?.isLegacy && !msg.isLegacy;

  // Systeembericht (nudge melding) â€” opgeslagen in chat-node met type: 'nudge'
  if (msg.type === 'nudge') {
    const isSelf = msg.sender === currentUser;
    const name = getDisplayName(msg.sender);
    return (
      <>
        {isFirstNew && <div className="history-divider"><span>Laatst verzonden berichten</span></div>}
        <div className="chat-message-system">
          âš¡ {isSelf ? 'Je hebt een nudge gestuurd.' : <><strong>{name}</strong> heeft een nudge gestuurd.</>}
        </div>
      </>
    );
  }

  const selfClass = msg.sender === currentUser ? 'self' : 'contact';
  return (
    <>
      {isFirstNew && <div className="history-divider"><span>Laatst verzonden berichten</span></div>}
      <div className={`chat-message ${msg.isLegacy ? 'legacy' : ''} ${selfClass}`}>
        <div className="message-header"><strong>{getDisplayName(msg.sender)}</strong> zegt ({msg.timestamp}):</div>
        <div className="message-content">{convertEmoticons(msg.content)}</div>
      </div>
    </>
  );
}

export default ChatMessage;
