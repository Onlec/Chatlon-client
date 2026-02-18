// src/components/TeamTalkPane.js
/**
 * TeamTalk Pane — TeamSpeak-stijl voice chat
 * 
 * Server-based model: maak een server aan of verbind via ID + wachtwoord.
 * Audio via Trystero (BitTorrent P2P), geen eigen server nodig.
 */

import React, { useState } from 'react';
import { useTrysteroTeamTalk } from '../hooks/useTrysteroTeamTalk';
import { user } from '../gun';

function TeamTalkPane() {
  const currentUser = user.is?.alias || 'Anoniem';
  const {
    isConnected,
    serverInfo,
    peers,
    isMuted,
    speakingUsers,
    recentServers,
    connectionError,
    audioSettings,
    audioDevices,
    micLevel,
    createServer,
    connectToServer,
    disconnect,
    toggleMute,
    setUserVolume,
    removeRecentServer,
    findServer,
    updateAudioSetting,
    startMicTest,
    stopMicTest
  } = useTrysteroTeamTalk(currentUser);

  // Form state
  const [joinServerId, setJoinServerId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinNickname, setJoinNickname] = useState('');
  const [createName, setCreateName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [activeTab, setActiveTab] = useState('join');  // 'join' | 'create' | 'audio'
  const [userVolumes, setUserVolumes] = useState({});
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [micTesting, setMicTesting] = useState(false);

  // ============================================
  // HANDLERS
  // ============================================

  const handleConnect = async () => {
    if (!joinServerId.trim()) return;
    
    setIsSearching(true);
    setSearchError('');
    
    const server = await findServer(joinServerId.trim());
    
    setIsSearching(false);
    
    if (!server) {
      setSearchError('Server niet gevonden. Controleer de ID of naam.');
      return;
    }
    
    if (server.hasPassword && !joinPassword) {
      setSearchError('Deze server vereist een wachtwoord.');
      return;
    }
    
    connectToServer(
      server.id, 
      joinPassword || null, 
      joinNickname.trim() || currentUser,
      server.name
    );
  };
  const handleCreate = () => {
    if (!createName.trim()) return;
    createServer(createName.trim(), createPassword || null);
  };

  const handleRecentClick = (server) => {
    connectToServer(server.id, server.password, currentUser);
  };

  const handleVolumeChange = (peerId, volume) => {
    setUserVolumes(prev => ({ ...prev, [peerId]: volume }));
    setUserVolume(peerId, volume);
  };

  const getPeerIcon = (peerId, peerData) => {
    if (peerData.isMuted) return '🔇';
    if (speakingUsers.has(peerData.nickname)) return '🔊';
    return '🎤';
  };

  const peerCount = Object.keys(peers).length;

  // ============================================
  // RENDER — VERBONDEN
  // ============================================

  if (isConnected) {
    return (
      <div className="tt-pane">
        {/* Server header */}
        <div className="tt-server-header">
          <span className="tt-server-icon">📡</span>
          <div className="tt-server-info">
            <span className="tt-server-name">{serverInfo?.name || 'Server'}</span>
            <span className="tt-server-id">ID: {serverInfo?.id}</span>
          </div>
        </div>

        {/* Gebruikerslijst */}
        <div className="tt-tree">
          {/* Eigen user */}
          <div className={`tt-user-node tt-self ${speakingUsers.has(currentUser) ? 'tt-speaking' : ''}`}>
            <span className="tt-user-icon">{isMuted ? '🔇' : (speakingUsers.has(currentUser) ? '🔊' : '🎤')}</span>
            <span className="tt-user-name">{currentUser} (jij)</span>
          </div>

          {/* Remote peers */}
          {Object.entries(peers).map(([peerId, peerData]) => (
            <div 
              key={peerId} 
              className={`tt-user-node ${speakingUsers.has(peerData.nickname) ? 'tt-speaking' : ''}`}
            >
              <span className="tt-user-icon">{getPeerIcon(peerId, peerData)}</span>
              <span className="tt-user-name">{peerData.nickname}</span>
              <input
                type="range"
                className="tt-volume-slider"
                min="0"
                max="100"
                value={userVolumes[peerId] ?? 100}
                onChange={(e) => handleVolumeChange(peerId, parseInt(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                title={`Volume: ${userVolumes[peerId] ?? 100}%`}
              />
            </div>
          ))}

          {peerCount === 0 && (
            <div className="tt-empty-message">
              Wachten op andere gebruikers...
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="tt-controls">
          <button
            className={`tt-mute-btn ${isMuted ? 'tt-muted' : ''}`}
            onClick={toggleMute}
          >
            {isMuted ? '🔇 Gedempt' : '🎤 Mic aan'}
          </button>
          <button className="tt-leave-btn" onClick={disconnect}>
            🔌 Verbreken
          </button>
          <span className="tt-status-info">
            📡 P2P | {peerCount + 1} gebruiker{peerCount !== 0 ? 's' : ''}
          </span>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER — NIET VERBONDEN
  // ============================================

  return (
    <div className="tt-pane">
      {/* Tab navigatie */}
      <div className="tt-tab-bar">
        <button
          className={`tt-tab ${activeTab === 'join' ? 'tt-tab-active' : ''}`}
          onClick={() => { if (micTesting) { stopMicTest(); setMicTesting(false); } setActiveTab('join'); }}
        >
          Verbinden
        </button>
        <button
          className={`tt-tab ${activeTab === 'create' ? 'tt-tab-active' : ''}`}
          onClick={() => { if (micTesting) { stopMicTest(); setMicTesting(false); } setActiveTab('create'); }}
        >
          Server aanmaken
        </button>
        <button
          className={`tt-tab ${activeTab === 'audio' ? 'tt-tab-active' : ''}`}
          onClick={() => setActiveTab('audio')}
        >
          Audio
        </button>
      </div>

      <div className="tt-form-area">
        {/* Verbinden tab */}
        {activeTab === 'join' && (
          <div className="tt-form">
            <div className="tt-form-group">
              <label className="tt-label">Server-ID:</label>
              <input
                type="text"
                className="tt-input"
                value={joinServerId}
                onChange={(e) => setJoinServerId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                placeholder="bijv. tt-a3f8x"
              />
            </div>
            <div className="tt-form-group">
              <label className="tt-label">Wachtwoord:</label>
              <input
                type="password"
                className="tt-input"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                placeholder="Optioneel"
              />
            </div>
            <div className="tt-form-group">
              <label className="tt-label">Nickname:</label>
              <input
                type="text"
                className="tt-input"
                value={joinNickname}
                onChange={(e) => setJoinNickname(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                placeholder={currentUser}
              />
            </div>
            <button 
              className="tt-btn tt-connect-btn" 
              onClick={handleConnect}
              disabled={isSearching}
            >
              {isSearching ? '⏳ Zoeken...' : '📡 Verbinden'}
            </button>
            {searchError && (
              <div className="tt-error">⚠️ {searchError}</div>
            )}
          </div>
        )}

        {/* Server aanmaken tab */}
        {activeTab === 'create' && (
          <div className="tt-form">
            <div className="tt-form-group">
              <label className="tt-label">Servernaam:</label>
              <input
                type="text"
                className="tt-input"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="bijv. Gaming met vrienden"
              />
            </div>
            <div className="tt-form-group">
              <label className="tt-label">Wachtwoord:</label>
              <input
                type="password"
                className="tt-input"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Optioneel"
              />
            </div>
            <button className="tt-btn tt-create-btn" onClick={handleCreate}>
              ➕ Server aanmaken
            </button>
          </div>
        )}

        {/* Audio tab */}
        {activeTab === 'audio' && (
          <div className="tt-form tt-audio-settings">
            {/* Microfoon selectie */}
            <div className="tt-form-group">
              <label className="tt-label">Microfoon:</label>
              <select
                className="tt-input tt-select"
                value={audioSettings.deviceId}
                onChange={(e) => updateAudioSetting('deviceId', e.target.value)}
              >
                <option value="">Standaard</option>
                {audioDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* Mic gain slider */}
            <div className="tt-form-group">
              <label className="tt-label">Input volume: {audioSettings.micGain}%</label>
              <input
                type="range"
                className="tt-audio-slider"
                min="0"
                max="200"
                value={audioSettings.micGain}
                onChange={(e) => updateAudioSetting('micGain', parseInt(e.target.value))}
              />
            </div>

            {/* VU Meter */}
            <div className="tt-form-group">
              <label className="tt-label">Mic-test:</label>
              <div className="tt-vu-meter">
                <div className="tt-vu-fill" style={{ width: `${micLevel}%` }} />
              </div>
              <button
                className="tt-btn tt-mic-test-btn"
                onClick={() => {
                  if (micTesting) { stopMicTest(); setMicTesting(false); }
                  else { startMicTest(); setMicTesting(true); }
                }}
              >
                {micTesting ? '⏹ Stop test' : '🎤 Test microfoon'}
              </button>
            </div>

            {/* Audio verwerking checkboxes */}
            <div className="tt-form-group tt-audio-checks">
              <label className="tt-label">Audioverwerking:</label>
              <label className="tt-checkbox-label">
                <input
                  type="checkbox"
                  checked={audioSettings.noiseSuppression}
                  onChange={(e) => updateAudioSetting('noiseSuppression', e.target.checked)}
                />
                <span>Ruisonderdrukking</span>
              </label>
              <label className="tt-checkbox-label">
                <input
                  type="checkbox"
                  checked={audioSettings.echoCancellation}
                  onChange={(e) => updateAudioSetting('echoCancellation', e.target.checked)}
                />
                <span>Echoreductie</span>
              </label>
              <label className="tt-checkbox-label">
                <input
                  type="checkbox"
                  checked={audioSettings.autoGainControl}
                  onChange={(e) => updateAudioSetting('autoGainControl', e.target.checked)}
                />
                <span>Automatische versterking</span>
              </label>
            </div>
          </div>
        )}

        {/* Error */}
        {connectionError && activeTab !== 'audio' && (
          <div className="tt-error">
            ⚠️ {connectionError}
          </div>
        )}

        {/* Recente servers */}
        {recentServers.length > 0 && activeTab !== 'audio' && (
          <div className="tt-recent">
            <div className="tt-recent-header">Recente servers</div>
            {recentServers.map(server => (
              <div 
                key={server.id} 
                className="tt-recent-item"
                onClick={() => handleRecentClick(server)}
              >
                <span className="tt-recent-icon">📡</span>
                <div className="tt-recent-info">
                  <span className="tt-recent-name">{server.name}</span>
                  <span className="tt-recent-id">{server.id}</span>
                </div>
                <button 
                  className="tt-recent-remove"
                  onClick={(e) => { e.stopPropagation(); removeRecentServer(server.id); }}
                  title="Verwijderen"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="tt-controls">
        <span className="tt-status-info">Niet verbonden — voer een server-ID in of maak een server aan</span>
      </div>
    </div>
  );
}

export default TeamTalkPane;