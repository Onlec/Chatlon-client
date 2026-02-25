import React from 'react';
import { STATUS_OPTIONS } from '../../utils/presenceUtils';

function Systray({
  isSuperpeer,
  connectedSuperpeers,
  isLoggedIn,
  relayStatus,
  forceReconnect,
  messengerSignedIn,
  systrayIconRef,
  currentStatusOption,
  getDisplayName,
  currentUser,
  onToggleMenu,
  showSystrayMenu,
  systrayMenuRef,
  getAvatar,
  userStatus,
  onStatusChange,
  onOpenContacts,
  onSignOut,
  onCloseMessenger
}) {
  return (
    <div className="systray">
      {isSuperpeer && <span className="superpeer-badge" title={`Superpeer actief | ${connectedSuperpeers} peer(s) verbonden`}>{'\u{1F4E1}'}</span>}
      {isLoggedIn && (
        <span
          className={`relay-status-badge ${relayStatus.anyOnline ? 'relay-online' : 'relay-offline'}`}
          title={relayStatus.anyOnline
            ? `Relay verbonden${isSuperpeer ? ' | Superpeer actief' : ''} | ${connectedSuperpeers} peer(s)`
            : 'Relay offline - klik om te reconnecten'
          }
          onClick={() => !relayStatus.anyOnline && forceReconnect()}
        >
          {relayStatus.anyOnline ? '\u{1F7E2}' : '\u{1F534}'}
        </span>
      )}
      {isLoggedIn && messengerSignedIn && (
        <span
          ref={systrayIconRef}
          className="systray-chatlon-icon"
          title={`Chatlon - ${currentStatusOption.label} (${getDisplayName(currentUser)})`}
          onClick={onToggleMenu}
        >
          <span className="systray-chatlon-figure">{'\u{1F4AC}'}</span>
          <span className="systray-status-dot" style={{ backgroundColor: currentStatusOption.color }}></span>
        </span>
      )}
      {showSystrayMenu && (
        <div ref={systrayMenuRef} className="systray-menu" onClick={(e) => e.stopPropagation()}>
          <div className="systray-menu-header">
            <img src={getAvatar(currentUser)} alt="" className="systray-menu-avatar" />
            <div className="systray-menu-user">
              <div className="systray-menu-name">{getDisplayName(currentUser)}</div>
              <div className="systray-menu-status" style={{ color: currentStatusOption.color }}>{currentStatusOption.label}</div>
            </div>
          </div>
          <div className="dropdown-separator" />
          {STATUS_OPTIONS.map(opt => (
            <div
              key={opt.value}
              className={`dropdown-item ${userStatus === opt.value ? 'dropdown-item--checked' : ''}`}
              onClick={() => onStatusChange(opt.value)}
            >
              <span className="systray-status-indicator" style={{ backgroundColor: opt.color }}></span>
              <span className="dropdown-item-label">{opt.label}</span>
            </div>
          ))}
          <div className="dropdown-separator" />
          <div className="dropdown-item" onClick={onOpenContacts}>
            <span className="dropdown-item-label">Chatlon openen</span>
          </div>
          <div className="dropdown-item" onClick={onSignOut}>
            <span className="dropdown-item-label">Afmelden</span>
          </div>
          <div className="dropdown-separator" />
          <div className="dropdown-item" onClick={onCloseMessenger}>
            <span className="dropdown-item-label">Afsluiten</span>
          </div>
        </div>
      )}
      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </div>
  );
}

export default Systray;
