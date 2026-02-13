// src/components/TeamTalkPane.js
/**
 * TeamTalk Pane — TeamSpeak 2 parodie
 * 
 * Boomstructuur met channels en gebruikers.
 * Donkergrijs/blauw thema, los van MSN-stijl.
 */

import React, { useState } from 'react';
import { useTeamTalk } from '../hooks/useTeamTalk';
import { user } from '../gun';

function TeamTalkPane() {
  const currentUser = user.is?.alias;
  const {
    channels,
    channelUsers,
    currentChannel,
    isMuted,
    joinChannel,
    leaveChannel,
    createChannel,
    toggleMute
  } = useTeamTalk(currentUser);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelPassword, setNewChannelPassword] = useState('');
  const [passwordPrompt, setPasswordPrompt] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');

  const handleChannelClick = (channel) => {
    if (channel.id === currentChannel) return;

    if (channel.hasPassword) {
      setPasswordPrompt(channel.id);
      setPasswordInput('');
    } else {
      joinChannel(channel.id);
    }
  };

  const handlePasswordSubmit = () => {
    if (passwordPrompt) {
      joinChannel(passwordPrompt, passwordInput);
      setPasswordPrompt(null);
      setPasswordInput('');
    }
  };

  const handleCreateChannel = () => {
    if (newChannelName.trim()) {
      const id = createChannel(newChannelName, newChannelPassword || null);
      if (id) joinChannel(id);
      setNewChannelName('');
      setNewChannelPassword('');
      setShowCreateDialog(false);
    }
  };

  const getUserIcon = (userData) => {
    if (userData.isMuted) return '🔇';
    if (userData.isSpeaking) return '🔊';
    return '🎤';
  };

  const getChannelUserCount = (channelId) => {
    const users = channelUsers[channelId];
    return users ? Object.keys(users).length : 0;
  };

  return (
    <div className="tt-container">
      {/* Menubalk */}
      <div className="tt-menubar">
        <span className="tt-menu-item">Verbinding</span>
        <span className="tt-menu-item">Bladwijzers</span>
        <span className="tt-menu-item" onClick={() => setShowCreateDialog(true)}>Kanalen</span>
        <span className="tt-menu-item">Instellingen</span>
      </div>

      {/* Server boom */}
      <div className="tt-tree">
        <div className="tt-server-node">
          <span className="tt-server-icon">📡</span>
          <span className="tt-server-name">TalkServer (chatlon.server)</span>
        </div>

        {channels.map(channel => {
          const users = channelUsers[channel.id] || {};
          const userCount = Object.keys(users).length;
          const isActive = channel.id === currentChannel;

          return (
            <div key={channel.id} className="tt-channel-group">
              <div
                className={`tt-channel-node ${isActive ? 'tt-active' : ''}`}
                onClick={() => handleChannelClick(channel)}
              >
                <span className="tt-channel-icon">
                  {channel.hasPassword ? '🔒' : '📁'}
                </span>
                <span className="tt-channel-name">{channel.name}</span>
                {userCount > 0 && (
                  <span className="tt-channel-count">({userCount})</span>
                )}
              </div>

              {/* Users in channel */}
              {Object.values(users).map(u => (
                <div
                  key={u.username}
                  className={`tt-user-node ${u.username === currentUser ? 'tt-self' : ''}`}
                >
                  <span className="tt-user-icon">{getUserIcon(u)}</span>
                  <span className="tt-user-name">{u.username}</span>
                </div>
              ))}
            </div>
          );
        })}

        {/* Kanaal aanmaken */}
        <div
          className="tt-channel-node tt-create"
          onClick={() => setShowCreateDialog(true)}
        >
          <span className="tt-channel-icon">➕</span>
          <span className="tt-channel-name">Kanaal aanmaken...</span>
        </div>
      </div>

      {/* Password prompt dialog */}
      {passwordPrompt && (
        <div className="tt-dialog-overlay">
          <div className="tt-dialog">
            <div className="tt-dialog-title">Wachtwoord vereist</div>
            <input
              type="password"
              className="tt-input"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              placeholder="Voer wachtwoord in..."
              autoFocus
            />
            <div className="tt-dialog-actions">
              <button className="tt-btn" onClick={handlePasswordSubmit}>OK</button>
              <button className="tt-btn" onClick={() => setPasswordPrompt(null)}>Annuleren</button>
            </div>
          </div>
        </div>
      )}

      {/* Create channel dialog */}
      {showCreateDialog && (
        <div className="tt-dialog-overlay">
          <div className="tt-dialog">
            <div className="tt-dialog-title">Nieuw kanaal</div>
            <input
              className="tt-input"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="Kanaalnaam"
              autoFocus
            />
            <input
              type="password"
              className="tt-input"
              value={newChannelPassword}
              onChange={(e) => setNewChannelPassword(e.target.value)}
              placeholder="Wachtwoord (optioneel)"
            />
            <div className="tt-dialog-actions">
              <button className="tt-btn" onClick={handleCreateChannel}>Aanmaken</button>
              <button className="tt-btn" onClick={() => setShowCreateDialog(false)}>Annuleren</button>
            </div>
          </div>
        </div>
      )}

      {/* Statusbalk */}
      <div className="tt-statusbar">
        {currentChannel ? (
          <>
            <button
              className={`tt-mute-btn ${isMuted ? 'tt-muted' : ''}`}
              onClick={toggleMute}
            >
              {isMuted ? '🔇 Gedempt' : '🎤 Mic aan'}
            </button>
            <button className="tt-leave-btn" onClick={leaveChannel}>
              Verlaat kanaal
            </button>
            <span className="tt-status-info">
              📡 Mesh | {getChannelUserCount(currentChannel)} gebruiker(s)
            </span>
          </>
        ) : (
          <span className="tt-status-info">Niet verbonden — dubbelklik op een kanaal</span>
        )}
      </div>
    </div>
  );
}

export default TeamTalkPane;