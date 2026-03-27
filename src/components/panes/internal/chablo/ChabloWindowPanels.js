import React from 'react';
import { CHABLO_EMOTE_REGISTRY } from './chabloEmotes';
import { describeParticipants, isPositionFresh } from './chabloLiveStateUtils';
import { getChabloRoom } from './rooms';
import { CHABLO_WARDROBE_SECTIONS } from './chabloWardrobeConfig';
import { ChabloWindowTabs } from './ChabloWindowChrome';

export function ChabloWhisperWorkspace({
  activeWhisperPairId,
  activeWhisperThread,
  activeWhisperTypingUsers,
  currentUser,
  handleHudWhisperMode,
  handleSelectWhisperThread,
  openWindow,
  whisperThreadsWithDraft,
  windowId
}) {
  return (
    <div className="chablo-whisper-layout">
      <div className="chablo-whisper-threads">
        {whisperThreadsWithDraft.length === 0 ? (
          <div className="chablo-chat-empty">Nog geen whispers.</div>
        ) : whisperThreadsWithDraft.map((thread) => (
          <button
            key={thread.pairId}
            type="button"
            className={`chablo-whisper-thread ${activeWhisperPairId === thread.pairId ? 'chablo-whisper-thread--active' : ''}`}
            onClick={() => handleSelectWhisperThread(thread)}
          >
            <div className="chablo-whisper-thread__meta">
              <strong>{thread.partner}</strong>
              {thread.unreadCount > 0 ? <span className="chablo-count-badge">{thread.unreadCount}</span> : null}
            </div>
            <span>{thread.lastMessage?.text || 'Start een whisper.'}</span>
          </button>
        ))}
      </div>
      <div className="chablo-whisper-panel">
        {activeWhisperThread ? (
          <>
            <div className="chablo-whisper-panel__header">
              <strong>{activeWhisperThread.partner}</strong>
              <button
                type="button"
                className="browser-secondary-btn"
                onClick={() => {
                  handleHudWhisperMode(activeWhisperThread.partner);
                  openWindow(windowId, { subview: 'whispers' });
                }}
              >
                Fluister via chatbar
              </button>
            </div>
            {activeWhisperTypingUsers.length > 0 ? <span className="chablo-hotspot-row__meta">{describeParticipants(activeWhisperTypingUsers, '')} typt nu...</span> : null}
            <div className="chablo-whisper-log">
              {activeWhisperThread.messages.length === 0 ? (
                <div className="chablo-chat-empty">Nog geen whispergeschiedenis.</div>
              ) : activeWhisperThread.messages.map((message) => (
                <article key={`${message.timestamp}-${message.from}`} className={`chablo-whisper-message ${message.from === currentUser ? 'chablo-whisper-message--self' : ''}`}>
                  <div className="chablo-chat-message__meta">
                    <strong>{message.from}</strong>
                    <span>{message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : 'nu'}</span>
                  </div>
                  <p>{message.text}</p>
                </article>
              ))}
            </div>
          </>
        ) : <div className="chablo-chat-empty">Kies een whisperthread.</div>}
      </div>
    </div>
  );
}

export function ChabloNavigatorPanel({
  currentRoom,
  rooms,
  roomUnreadCountsById,
  visiblePresenceByRoom,
  onOpenRoom
}) {
  return (
    <div className="chablo-window-list">
      {rooms.map((room) => {
        const presence = visiblePresenceByRoom.find((entry) => entry.roomId === room.id) || { usernames: [], count: 0 };
        return (
          <article key={room.id} className={`chablo-window-row ${room.id === currentRoom ? 'chablo-window-row--active' : ''}`}>
            <div>
              <strong>{room.name}</strong>
              <span>{presence.count > 0 ? describeParticipants(presence.usernames, '') : 'Niemand zichtbaar'}</span>
            </div>
            <div className="chablo-inline-actions">
              {roomUnreadCountsById[room.id] > 0 ? <span className="chablo-count-badge" aria-label={`${roomUnreadCountsById[room.id]} ongelezen roomberichten`}>{roomUnreadCountsById[room.id]}</span> : null}
              <button type="button" className="browser-secondary-btn" onClick={() => onOpenRoom(room.id)}>{room.id === currentRoom ? 'Hier nu' : 'Ga kijken'}</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function ChabloConsolePanel({
  acceptFriendRequest,
  acceptInvite,
  activeSubview,
  allPositions,
  currentUserPrefs,
  handleOpenNavigatorRoom,
  incomingRequests,
  inviteUnreadCount,
  openWhisperThread,
  pendingInvites,
  rejectFriendRequest,
  rejectInvite,
  setWindowSubview,
  updateSocialPrefs,
  visibleAcceptedFriends,
  visiblePresenceByRoom,
  whisperUnreadCount,
  whisperWorkspace
}) {
  return (
    <div className="chablo-window-stack">
      <ChabloWindowTabs
        items={[
          { id: 'users', label: 'Users' },
          { id: 'friends', label: 'Friends' },
          { id: 'invites', label: 'Invites', badge: inviteUnreadCount > 0 ? inviteUnreadCount : null },
          { id: 'whispers', label: 'Whispers', badge: whisperUnreadCount > 0 ? whisperUnreadCount : null },
          { id: 'privacy', label: 'Privacy' }
        ]}
        activeId={activeSubview || 'users'}
        onChange={(nextId) => setWindowSubview('console', nextId)}
      />
      {activeSubview === 'users' || !activeSubview ? (
        <div className="chablo-window-list">
          {visiblePresenceByRoom.map((room) => (
            <article key={room.roomId} className="chablo-window-row">
              <div>
                <strong>{room.roomName}</strong>
                <span>{room.count > 0 ? describeParticipants(room.usernames, '') : 'Geen zichtbare motelgasten'}</span>
              </div>
              <button type="button" className="browser-secondary-btn" onClick={() => handleOpenNavigatorRoom(room.roomId)}>Naar room</button>
            </article>
          ))}
        </div>
      ) : null}
      {activeSubview === 'friends' ? (
        <div className="chablo-friends-list">
          {incomingRequests.map((entry) => (
            <article key={entry.username} className="chablo-request chablo-request--pending">
              <strong>{entry.username}</strong>
              <div className="chablo-inline-actions">
                <button type="button" className="yoctol-btn" onClick={() => acceptFriendRequest(entry.username)}>Accepteer</button>
                <button type="button" className="browser-secondary-btn" onClick={() => rejectFriendRequest(entry.username)}>Weiger</button>
              </div>
            </article>
          ))}
          {visibleAcceptedFriends.map((entry) => {
            const friendPosition = allPositions[entry.username];
            const isOnline = isPositionFresh(friendPosition);
            return (
              <article key={entry.username} className="chablo-friend-row">
                <div>
                  <strong>{entry.username}</strong>
                  <span>{isOnline ? `Nu in ${getChabloRoom(friendPosition.room).name}` : 'Offline of onzichtbaar'}</span>
                </div>
                <div className="chablo-inline-actions">
                  <button type="button" className="browser-secondary-btn" onClick={() => openWhisperThread(entry.username)}>Fluister</button>
                  {isOnline ? <button type="button" className="browser-secondary-btn" onClick={() => handleOpenNavigatorRoom(friendPosition.room)}>Ga naar kamer</button> : null}
                </div>
              </article>
            );
          })}
          {incomingRequests.length === 0 && visibleAcceptedFriends.length === 0 ? <div className="chablo-chat-empty">Nog geen motelvrienden.</div> : null}
        </div>
      ) : null}
      {activeSubview === 'invites' ? (
        <div className="chablo-social-invite-list">
          {pendingInvites.length === 0 ? <div className="chablo-chat-empty">Geen open room invites.</div> : pendingInvites.map((invite) => (
            <article key={invite.id} className="chablo-request chablo-request--pending">
              <strong>{invite.from}</strong>
              <span>{invite.note}</span>
              <div className="chablo-inline-actions">
                <button type="button" className="yoctol-btn" aria-label="Accepteer invite" onClick={() => acceptInvite(invite)}>Accepteer</button>
                <button type="button" className="browser-secondary-btn" aria-label="Weiger invite" onClick={() => rejectInvite(invite)}>Weiger</button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      {activeSubview === 'whispers' ? whisperWorkspace : null}
      {activeSubview === 'privacy' ? (
        <div className="chablo-social-settings">
          <div className="chablo-social-setting-row">
            <strong>Zichtbaarheid</strong>
            <div className="chablo-inline-actions">
              {['full', 'friends', 'hidden'].map((visibility) => (
                <button key={visibility} type="button" className={`browser-secondary-btn ${currentUserPrefs.visibility === visibility ? 'browser-secondary-btn--active' : ''}`} onClick={() => updateSocialPrefs({ visibility })}>{visibility}</button>
              ))}
            </div>
          </div>
          <div className="chablo-social-setting-row">
            <strong>Whispers</strong>
            <button type="button" className="browser-secondary-btn" onClick={() => updateSocialPrefs({ allowWhispers: !currentUserPrefs.allowWhispers })}>{`Whispers: ${currentUserPrefs.allowWhispers ? 'Aan' : 'Uit'}`}</button>
          </div>
          <div className="chablo-social-setting-row">
            <strong>Invites</strong>
            <button type="button" className="browser-secondary-btn" onClick={() => updateSocialPrefs({ allowInvites: !currentUserPrefs.allowInvites })}>{`Invites: ${currentUserPrefs.allowInvites ? 'Aan' : 'Uit'}`}</button>
          </div>
          <div className="chablo-social-setting-row">
            <strong>Niet storen</strong>
            <button type="button" className="browser-secondary-btn" onClick={() => updateSocialPrefs({ dnd: !currentUserPrefs.dnd })}>{`Niet storen: ${currentUserPrefs.dnd ? 'Aan' : 'Uit'}`}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ChabloChatHistoryPanel({
  activeSubview,
  currentRoom,
  roomMessages,
  roomUnreadCountsById,
  setWindowSubview,
  whisperUnreadCount,
  whisperWorkspace
}) {
  return (
    <div className="chablo-window-stack">
      <ChabloWindowTabs
        items={[
          { id: 'room', label: 'Room', badge: roomUnreadCountsById[currentRoom] > 0 ? roomUnreadCountsById[currentRoom] : null },
          { id: 'whispers', label: 'Whispers', badge: whisperUnreadCount > 0 ? whisperUnreadCount : null }
        ]}
        activeId={activeSubview || 'room'}
        onChange={(nextId) => setWindowSubview('chatHistory', nextId)}
      />
      {activeSubview === 'room' || !activeSubview ? (
        <div className="chablo-chat-log">
          {roomMessages.length === 0 ? <div className="chablo-chat-empty">Nog geen room talk.</div> : roomMessages.map((message) => (
            <article key={message.id} className="chablo-chat-message">
              <div className="chablo-chat-message__meta">
                <strong>{message.from}</strong>
                <span>{message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : 'nu'}</span>
              </div>
              <p>{message.text}</p>
            </article>
          ))}
        </div>
      ) : null}
      {activeSubview === 'whispers' ? whisperWorkspace : null}
    </div>
  );
}

export function ChabloBulletinPanel({
  activeSubview,
  roomActivityEntries,
  roomStateEntries,
  setWindowSubview
}) {
  return (
    <div className="chablo-window-stack">
      <ChabloWindowTabs items={[{ id: 'state', label: 'State' }, { id: 'activity', label: 'Activiteit' }, { id: 'updates', label: 'Updates' }]} activeId={activeSubview || 'state'} onChange={(nextId) => setWindowSubview('bulletin', nextId)} />
      {activeSubview === 'state' || !activeSubview ? (
        <div className="chablo-window-stack">
          <strong>Gedeelde room status</strong>
          <div className="chablo-room-state-grid">
            {roomStateEntries.length === 0 ? <div className="chablo-chat-empty">Nog geen roomstatus.</div> : roomStateEntries.map((entry) => (
              <article key={entry.hotspotId} className="chablo-room-state-card">
                <div className="chablo-room-state-card__badge-row"><span className="chablo-pill">{entry.stateBadge}</span><span>{entry.updatedAt ? new Date(entry.updatedAt).toLocaleTimeString() : 'nu'}</span></div>
                <strong>{entry.title}</strong>
                {entry.detail ? <p>{entry.detail}</p> : null}
                {entry.stateSummary ? <p className="chablo-room-state-card__summary">{entry.stateSummary}</p> : null}
                {entry.participantLabel && Number.isFinite(entry.participantCount) ? <span className="chablo-hotspot-row__meta">{`${entry.participantLabel}: ${entry.participantCount}`}</span> : null}
                {entry.prompt ? <p className="chablo-hotspot-row__meta">{entry.prompt}</p> : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}
      {activeSubview === 'activity' ? (
        <div className="chablo-window-stack">
          <strong>Live room activity</strong>
          <div className="chablo-room-activity-list">
            {roomActivityEntries.length === 0 ? <div className="chablo-chat-empty">Nog geen motelactiviteit.</div> : roomActivityEntries.map((entry) => (
              <article key={entry.id} className="chablo-room-activity-item">
                <div className="chablo-room-activity-item__meta"><strong>{entry.hotspotLabel}</strong><span>{entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : 'nu'}</span></div>
                <p>{entry.summary}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
      {activeSubview === 'updates' ? <div className="chablo-placeholder-window"><strong>Updates</strong><p>Shell voor motel-updates.</p></div> : null}
    </div>
  );
}

export function ChabloWardrobePanel({
  effectiveCurrentUserAppearance,
  onRandomize,
  onReset,
  onSave,
  onUpdateField
}) {
  return (
    <div className="chablo-wardrobe-card">
      <div className="chablo-wardrobe-preview">
        <div>
          <strong>Live preview</strong>
          <span>Je avatar in de kamer volgt deze keuzes meteen.</span>
        </div>
        <span className="chablo-pill">Vorm: {effectiveCurrentUserAppearance.bodyShape}</span>
      </div>
      <div className="chablo-wardrobe-sections">
        {CHABLO_WARDROBE_SECTIONS.map((section) => (
          <div key={section.id} className="chablo-wardrobe-section">
            <div className="chablo-wardrobe-section__header">
              <strong>{section.label}</strong>
              <span>{effectiveCurrentUserAppearance[section.id]}</span>
            </div>
            <div className="chablo-wardrobe-options" role="list" aria-label={section.label}>
              {section.options.map((option) => {
                const isActive = effectiveCurrentUserAppearance[section.id] === option.id;
                const style = option.color ? { '--chablo-option-color': option.color } : undefined;

                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-label={`${section.label}: ${option.label}`}
                    className={`chablo-wardrobe-option ${isActive ? 'chablo-wardrobe-option--active' : ''} ${option.color ? 'chablo-wardrobe-option--color' : ''}`}
                    style={style}
                    onClick={() => onUpdateField(section.id, option.id)}
                  >
                    {option.color ? <span className="chablo-wardrobe-option__swatch" aria-hidden="true" /> : null}
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="chablo-inline-actions">
        <button type="button" className="yoctol-btn" onClick={onSave}>Opslaan</button>
        <button type="button" className="browser-secondary-btn" onClick={onReset}>Reset</button>
        <button type="button" className="browser-secondary-btn" onClick={onRandomize}>Randomize</button>
      </div>
    </div>
  );
}

export function ChabloBackpackPanel({
  activeHotspot,
  activeSubview,
  currentRoomHotspots,
  executeHotspotAction,
  getHotspotActivityText,
  getHotspotButtonLabel,
  getHotspotPresenceText,
  getHotspotStateText,
  handleHotspotActivate,
  highlightedHotspot,
  moveToHotspot,
  roomActionState,
  setWindowSubview
}) {
  return (
    <div className="chablo-window-stack">
      <ChabloWindowTabs items={[{ id: 'hotspots', label: 'Hotspots' }, { id: 'furni', label: 'Furni' }]} activeId={activeSubview || 'hotspots'} onChange={(nextId) => setWindowSubview('backpack', nextId)} />
      {activeSubview === 'hotspots' || !activeSubview ? (
        <div className="chablo-window-stack">
          <strong>Room hotspots</strong>
          {highlightedHotspot ? (
            <div className="chablo-hotspot-feature">
              <div className="chablo-hotspot-feature__label"><span className="chablo-pill">{highlightedHotspot.kind}</span><strong>{highlightedHotspot.label}</strong></div>
              {highlightedHotspot.description ? <p>{highlightedHotspot.description}</p> : null}
              <div className="chablo-inline-actions">
                <button type="button" className="yoctol-btn" onClick={() => handleHotspotActivate(highlightedHotspot)}>{getHotspotButtonLabel(highlightedHotspot, activeHotspot?.id === highlightedHotspot.id)}</button>
              </div>
            </div>
          ) : <div className="chablo-chat-empty">Klik op een hotspot in de kamer.</div>}
          <div className="chablo-hotspot-list">
            {currentRoomHotspots.map((hotspot) => (
              <div key={hotspot.id} className={`chablo-hotspot-row ${highlightedHotspot?.id === hotspot.id ? 'chablo-hotspot-row--active' : ''}`}>
                <div>
                  <strong>{hotspot.label}</strong>
                  {hotspot.description ? <span>{hotspot.description}</span> : null}
                  {getHotspotPresenceText(hotspot) ? <span className="chablo-hotspot-row__meta">{getHotspotPresenceText(hotspot)}</span> : null}
                  {getHotspotActivityText(hotspot) ? <span className="chablo-hotspot-row__meta">{getHotspotActivityText(hotspot)}</span> : null}
                  {getHotspotStateText(hotspot) ? <span className="chablo-hotspot-row__meta">{getHotspotStateText(hotspot)}</span> : null}
                </div>
                <button type="button" className="browser-secondary-btn" onClick={() => (activeHotspot?.id === hotspot.id ? executeHotspotAction(hotspot) : moveToHotspot(hotspot))}>{activeHotspot?.id === hotspot.id ? getHotspotButtonLabel(hotspot, true) : hotspot.actionLabel || 'Ga erheen'}</button>
              </div>
            ))}
          </div>
          {roomActionState && roomActionState.kind !== 'wardrobe' ? <div className="chablo-hotspot-feature"><div className="chablo-hotspot-feature__label"><span className="chablo-pill">{roomActionState.kind}</span><strong>{roomActionState.title}</strong></div>{roomActionState.text ? <p>{roomActionState.text}</p> : null}</div> : null}
        </div>
      ) : null}
      {activeSubview === 'furni' ? <div className="chablo-placeholder-window"><strong>Furni</strong><p>Shell voor inventory/furni.</p></div> : null}
    </div>
  );
}

export function ChabloHabmojiPanel({
  selectedAvatar,
  selectedAvatarCanEmote,
  sendEmote
}) {
  return (
    <div className="chablo-window-stack">
      <div className="chablo-emote-strip" role="toolbar" aria-label="Snelle emotes">
        {CHABLO_EMOTE_REGISTRY.map((emote) => (
          <button key={emote.type} type="button" className="browser-secondary-btn chablo-emote-button" aria-label={`Zelf-emote ${emote.buttonLabel}`} onClick={() => sendEmote(emote.type)}>{emote.label}</button>
        ))}
      </div>
      {selectedAvatarCanEmote ? <div className="chablo-emote-strip chablo-emote-strip--targeted" role="toolbar" aria-label={`Emotes voor ${selectedAvatar}`}>{CHABLO_EMOTE_REGISTRY.map((emote) => <button key={emote.type} type="button" className="browser-secondary-btn chablo-emote-button" aria-label={`${emote.buttonLabel} naar ${selectedAvatar}`} onClick={() => sendEmote(emote.type, selectedAvatar)}>{emote.label}</button>)}</div> : null}
    </div>
  );
}

export function ChabloPlaceholderPanel({ title }) {
  return <div className="chablo-placeholder-window"><strong>{title}</strong><p>Shell klaar voor latere motel-features.</p></div>;
}
