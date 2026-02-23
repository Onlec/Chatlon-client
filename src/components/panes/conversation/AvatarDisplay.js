import React from 'react';
import { useAvatar } from '../../../contexts/AvatarContext';

function AvatarDisplay({ name, isSelf }) {
  const { getAvatar } = useAvatar();
  return (
    <div className="chat-avatar-container" style={isSelf ? { marginTop: 'auto' } : {}}>
      <img src={getAvatar(name)} alt={name} className="chat-display-picture" />
    </div>
  );
}

export default AvatarDisplay;
