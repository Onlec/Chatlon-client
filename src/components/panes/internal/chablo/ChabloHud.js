import React from 'react';
import { CHABLO_AVATAR_MENU_ITEMS, CHABLO_HUD_LAUNCHERS } from './chabloWindowConfig';

export default function ChabloHud({
  avatarButtonRef,
  avatarMenuRef,
  createDpadHandlers,
  currentRoomName,
  currentUser,
  effectiveCurrentUserAppearance,
  hudChatMode,
  hudWhisperTarget,
  isAvatarMenuOpen,
  onAvatarMenuAction,
  onChatInputChange,
  onLauncherOpen,
  onSubmitChat,
  onToggleAvatarMenu,
  onWhisperMode,
  onSayMode,
  roomChatInput,
  roomChatInputRef,
  socialUnreadCount,
  windowStateById
}) {
  return (
    <div className="chablo-hud">
      <div className="chablo-hud__avatar-slot">
        <button ref={avatarButtonRef} type="button" className="chablo-hud__avatar" aria-label="Open avatar menu" aria-haspopup="menu" aria-expanded={isAvatarMenuOpen} onClick={onToggleAvatarMenu}>
          <span className="chablo-hud__avatar-badge">{effectiveCurrentUserAppearance.bodyShape}</span>
          <strong>{currentUser}</strong>
        </button>
        {isAvatarMenuOpen ? (
          <div ref={avatarMenuRef} className="chablo-avatar-menu" role="menu" aria-label="Chablo avatar menu">
            {CHABLO_AVATAR_MENU_ITEMS.map((item) => (
              <button key={item.id} type="button" role="menuitem" className="chablo-avatar-menu__item" onClick={() => onAvatarMenuAction(item)}>{item.label}</button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="chablo-hud__controls" aria-label="Beweging">
        <button type="button" aria-label="Omhoog" {...createDpadHandlers(0, -1)}>{'?'}</button>
        <button type="button" aria-label="Links" {...createDpadHandlers(-1, 0)}>{'?'}</button>
        <button type="button" aria-label="Rechts" {...createDpadHandlers(1, 0)}>{'?'}</button>
        <button type="button" aria-label="Omlaag" {...createDpadHandlers(0, 1)}>{'?'}</button>
      </div>

      <form className="chablo-chatbar" onSubmit={onSubmitChat}>
        <div className="chablo-chatbar__modes" role="tablist" aria-label="Chablo chatmodus">
          <button type="button" role="tab" aria-selected={hudChatMode === 'say'} className={`chablo-chatbar__mode ${hudChatMode === 'say' ? 'chablo-chatbar__mode--active' : ''}`} onClick={onSayMode}>Say</button>
          <button type="button" role="tab" aria-selected={hudChatMode === 'whisper'} className={`chablo-chatbar__mode ${hudChatMode === 'whisper' ? 'chablo-chatbar__mode--active' : ''}`} onClick={() => onWhisperMode()}>Whisper</button>
        </div>
        {hudChatMode === 'whisper' && hudWhisperTarget ? <button type="button" className="chablo-chatbar__target" onClick={onSayMode}>Aan: {hudWhisperTarget} x</button> : null}
        <input ref={roomChatInputRef} type="text" value={roomChatInput} onChange={onChatInputChange} maxLength={hudChatMode === 'whisper' ? 180 : 100} placeholder={hudChatMode === 'whisper' && hudWhisperTarget ? `Fluister naar ${hudWhisperTarget}` : `Zeg iets in ${currentRoomName}`} />
        <button type="submit" className="yoctol-btn">Send</button>
      </form>

      <div className="chablo-hud__launchers" role="toolbar" aria-label="Chablo launcher">
        {CHABLO_HUD_LAUNCHERS.map((launcher) => (
          <button key={launcher.id} type="button" className={`chablo-hud__launcher ${windowStateById[launcher.windowId]?.open ? 'chablo-hud__launcher--active' : ''}`} onClick={() => onLauncherOpen(launcher)}>
            <span>{launcher.label}</span>
            {launcher.windowId === 'console' && socialUnreadCount > 0 ? <span className="chablo-count-badge" aria-label={`${socialUnreadCount} ongelezen sociale meldingen`}>{socialUnreadCount}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
