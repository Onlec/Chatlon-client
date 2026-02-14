// src/components/TeamTalkPane.js
/**
 * TeamTalk Pane — TeamSpeak 2 parodie
 * 
 * Boomstructuur met channels en gebruikers.
 * Donkergrijs/blauw thema, los van MSN-stijl.
 */

import React, { useState } from 'react';
import { useTeamTalk } from '../hooks/useTeamTalk';
import { gun, user } from '../gun';
import { useTeamTalkMesh } from '../hooks/useTeamTalkMesh';



function TeamTalkPane() {
  const currentUser = user.is?.alias;
  const {
    channels,
    channelUsers,
    currentChannel,
    currentHost,
    isHost,
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
  const usersInCurrentChannel = currentChannel ? (channelUsers[currentChannel] || {}) : {};
  const {
    isMuted: meshMuted,
    speakingUsers,
    toggleMute: meshToggleMute,
    peerCount,
    remoteAudiosRef
  } = useTeamTalkMesh(currentUser, currentChannel, usersInCurrentChannel, currentHost, isHost);
  const [contextMenu, setContextMenu] = useState(null);
  const [editingChannel, setEditingChannel] = useState(null);
  const [editName, setEditName] = useState('');
  const [userVolumes, setUserVolumes] = useState({});
  const [migrationNotice, setMigrationNotice] = useState(null);
  const prevHostRef = React.useRef(null);

  // Host migratie melding
  React.useEffect(() => {
    if (currentHost && prevHostRef.current && prevHostRef.current !== currentHost && currentChannel) {
      setMigrationNotice(`Host overgedragen: ${prevHostRef.current} → ${currentHost}`);
      setTimeout(() => setMigrationNotice(null), 4000);
    }
    prevHostRef.current = currentHost;
  }, [currentHost, currentChannel]);

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

  const handleContextMenu = (e, type, data) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type,
      data
    });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleDeleteChannel = (channelId) => {
    if (currentChannel === channelId) leaveChannel();
    gun.get('TEAMTALK').get('channels').get(channelId).put(null);
    closeContextMenu();
  };

  const handleEditChannel = (channel) => {
    setEditingChannel(channel.id);
    setEditName(channel.name);
    closeContextMenu();
  };

  const handleSaveEdit = () => {
    if (editingChannel && editName.trim()) {
      gun.get('TEAMTALK').get('channels').get(editingChannel).get('name').put(editName.trim());
      setEditingChannel(null);
      setEditName('');
    }
  };

  const handleVolumeChange = (username, volume) => {
    setUserVolumes(prev => ({ ...prev, [username]: volume }));
    if (remoteAudiosRef && remoteAudiosRef.current && remoteAudiosRef.current[username]) {
      remoteAudiosRef.current[username].volume = volume / 100;
    }
  };

  const getUserIcon = (userData) => {
    const hostBadge = userData.username === currentHost ? '⭐' : '';
    if (userData.isMuted) return hostBadge + '🔇';
    if (speakingUsers.has(userData.username)) return hostBadge + '🔊';
    return hostBadge + '🎤';
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
                onContextMenu={(e) => handleContextMenu(e, 'channel', channel)}
              >
                <span className="tt-channel-icon">
                  {channel.hasPassword ? '🔒' : '📁'}
                </span>
                {editingChannel === channel.id ? (
                  <input
                    className="tt-inline-edit"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') setEditingChannel(null);
                    }}
                    onBlur={handleSaveEdit}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="tt-channel-name">{channel.name}</span>
                )}
                {userCount > 0 && (
                  <span className="tt-channel-count">({userCount})</span>
                )}
              </div>

              {/* Users in channel */}
              {Object.values(users).map(u => (
                <div
                  key={u.username}
                  className={`tt-user-node ${u.username === currentUser ? 'tt-self' : ''} ${speakingUsers.has(u.username) ? 'tt-speaking' : ''}`}
                  onContextMenu={(e) => u.username !== currentUser && handleContextMenu(e, 'user', u)}
                >
                  <span className="tt-user-icon">{getUserIcon(u)}</span>
                  <span className="tt-user-name">{u.username}</span>
                  {u.username !== currentUser && currentChannel && (
                    <input
                      type="range"
                      className="tt-volume-slider"
                      min="0"
                      max="100"
                      value={userVolumes[u.username] ?? 100}
                      onChange={(e) => handleVolumeChange(u.username, parseInt(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      title={`Volume: ${userVolumes[u.username] ?? 100}%`}
                    />
                  )}
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
        {/* Host migratie melding */}
      {migrationNotice && (
        <div className="tt-migration-notice">
          ⭐ {migrationNotice}
        </div>
      )}
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
    {/* Context menu */}
      {contextMenu && (
        <>
          <div className="tt-context-overlay" onClick={closeContextMenu} />
          <div
            className="tt-context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.type === 'channel' && (
              <>
                <div className="tt-context-item" onClick={() => { handleChannelClick(contextMenu.data); closeContextMenu(); }}>
                  📁 Verbinden
                </div>
                {contextMenu.data.type === 'temporary' && contextMenu.data.createdBy === currentUser && (
                  <>
                    <div className="tt-context-separator" />
                    <div className="tt-context-item" onClick={() => handleEditChannel(contextMenu.data)}>
                      ✏️ Naam wijzigen
                    </div>
                    <div className="tt-context-item tt-context-danger" onClick={() => handleDeleteChannel(contextMenu.data.id)}>
                      🗑️ Kanaal verwijderen
                    </div>
                  </>
                )}
              </>
            )}
            {contextMenu.type === 'user' && (
              <>
                <div className="tt-context-item tt-context-disabled">
                  👤 {contextMenu.data.username}
                </div>
                <div className="tt-context-separator" />
                <div className="tt-context-item" onClick={() => {
                  handleVolumeChange(contextMenu.data.username, 0);
                  closeContextMenu();
                }}>
                  🔇 Dempen
                </div>
                <div className="tt-context-item" onClick={() => {
                  handleVolumeChange(contextMenu.data.username, 100);
                  closeContextMenu();
                }}>
                  🔊 Volume herstellen
                </div>
              </>
            )}
          </div>
        </>
      )}
      {/* Statusbalk */}
      <div className="tt-statusbar">
        {currentChannel ? (
          <>
            <button
              className={`tt-mute-btn ${meshMuted ? 'tt-muted' : ''}`}
              onClick={meshToggleMute}
            >
              {meshMuted ? '🔇 Gedempt' : '🎤 Mic aan'}
            </button>
            <button className="tt-leave-btn" onClick={leaveChannel}>
              Verlaat kanaal
            </button>
            <span className="tt-status-info">
              {isHost ? '⭐ Host' : `📡 Via ${currentHost || '...'}`} ({peerCount} verbinding{peerCount !== 1 ? 'en' : ''}) | {getChannelUserCount(currentChannel)} gebruiker(s)
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