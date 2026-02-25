// src/components/CallPanel.js
/**
 * Call Panel — Audio call UI binnen ConversationPane
 * 
 * Toont call status, mute/hangup knoppen, en gespreksduur.
 * MSN Messenger-stijl uitnodiging bij inkomende calls.
 */

import React from 'react';

function CallPanel({ callState, contactName, isMuted, callDuration, onAccept, onReject, onHangUp, onToggleMute, remoteAudioRef }) {
  
  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (callState === 'idle') return null;

  return (
    <div className="call-panel">
      {/* Inkomende call uitnodiging */}
      {callState === 'ringing' && (
        <div className="call-invite">
          <div className="call-invite-icon">🎤</div>
          <div className="call-invite-text">
            <strong>{contactName}</strong> wil een spraakgesprek starten.
          </div>
          <div className="call-invite-actions">
            <button className="call-btn call-btn--accept" onClick={onAccept}>Accepteren</button>
            <button className="call-btn call-btn--reject" onClick={onReject}>Weigeren</button>
          </div>
        </div>
      )}

      {/* Bellen... */}
      {callState === 'calling' && (
        <div className="call-active">
          <div className="call-status">
            <span className="call-status-icon">🎤</span>
            <span className="call-status-text">Bellen met {contactName}...</span>
          </div>
          <div className="call-controls">
            <button className="call-btn call-btn--hangup" onClick={onHangUp}>Ophangen</button>
          </div>
        </div>
      )}

      {/* Actief gesprek */}
      {callState === 'connected' && (
        <div className="call-active">
          <div className="call-status">
            <span className="call-status-icon">🎤</span>
            <span className="call-status-text">Spraakgesprek met {contactName}</span>
            <span className="call-timer">{formatDuration(callDuration)}</span>
          </div>
          <div className="call-controls">
            <button 
              className={`call-btn call-btn--mute ${isMuted ? 'call-btn--muted' : ''}`} 
              onClick={onToggleMute}
            >
              {isMuted ? '🔇 Gedempt' : '🔊 Mute'}
            </button>
            <button className="call-btn call-btn--hangup" onClick={onHangUp}>📞 Ophangen</button>
          </div>
        </div>
      )}

      {/* Hidden audio element voor remote stream */}
      <audio ref={remoteAudioRef} autoPlay />
    </div>
  );
}

export default CallPanel;
