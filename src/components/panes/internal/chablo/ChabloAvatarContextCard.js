import React from 'react';
import { CHABLO_EMOTE_REGISTRY } from './chabloEmotes';

export default function ChabloAvatarContextCard({
  currentRoomName,
  onClose,
  onFriendRequest,
  onOpenConversation,
  onOpenWhisper,
  onSendInvite,
  onSendEmote,
  onSetRelationState,
  selectedAvatar,
  selectedAvatarBlocked,
  selectedAvatarCanEmote,
  selectedAvatarCanInvite,
  selectedAvatarCanWhisper,
  selectedAvatarMuted,
  selectedAvatarPosition,
  selectedFriendship
}) {
  return (
    <section className="chablo-avatar-context-card">
      <div className="chablo-avatar-context-card__header">
        <div><strong>{selectedAvatar}</strong><span>{currentRoomName} - {selectedAvatarPosition.x}, {selectedAvatarPosition.y}</span></div>
        <button type="button" className="chablo-avatar-context-card__close" aria-label="Sluit avatarkaart" onClick={onClose}>x</button>
      </div>
      {selectedFriendship?.status ? <span className="chablo-pill">Status: {selectedFriendship.status}</span> : null}
      {!selectedAvatarBlocked ? (
        <div className="chablo-inline-actions">
          <button type="button" className="yoctol-btn" onClick={() => onOpenConversation?.(selectedAvatar)}>Stuur bericht</button>
          <button type="button" className="yoctol-btn" disabled={!selectedAvatarCanWhisper} onClick={() => onOpenWhisper(selectedAvatar)}>Fluister</button>
          <button type="button" className="browser-secondary-btn" disabled={!selectedAvatarCanInvite} onClick={() => onSendInvite(selectedAvatar)}>Nodig uit naar deze room</button>
          <button type="button" className="browser-secondary-btn" onClick={() => onFriendRequest(selectedAvatar)}>Voeg toe als Chablo-vriend</button>
        </div>
      ) : <p className="chablo-hotspot-row__meta">Deze motelgast is geblokkeerd voor Chablo-acties.</p>}
      <div className="chablo-inline-actions">
        <button type="button" className="browser-secondary-btn" onClick={() => onSetRelationState(selectedAvatar, { muted: !selectedAvatarMuted })}>{selectedAvatarMuted ? 'Unmute' : 'Mute'}</button>
        <button type="button" className="browser-secondary-btn" onClick={() => onSetRelationState(selectedAvatar, { blocked: !selectedAvatarBlocked })}>{selectedAvatarBlocked ? 'Deblokkeer' : 'Blokkeer'}</button>
      </div>
      {selectedAvatarCanEmote ? (
        <div className="chablo-emote-strip chablo-emote-strip--targeted" role="toolbar" aria-label={`Emotes voor ${selectedAvatar}`}>
          {CHABLO_EMOTE_REGISTRY.map((emote) => (
            <button key={emote.type} type="button" className="browser-secondary-btn chablo-emote-button" aria-label={`${emote.buttonLabel} naar ${selectedAvatar}`} onClick={() => onSendEmote(emote.type, selectedAvatar)}>{emote.label}</button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
