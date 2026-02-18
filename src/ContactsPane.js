import React, { useState, useEffect, useRef } from 'react';
import { gun, user } from './gun';
import { STATUS_OPTIONS, getPresenceStatus } from './utils/presenceUtils';
import { log } from './utils/debug';
import { createListenerManager } from './utils/gunListenerManager';
import { useAvatar } from './contexts/AvatarContext';
import DropdownMenu from './components/DropdownMenu';
import OptionsDialog from './components/OptionsDialog';
import AddContactWizard from './components/AddContactWizard';
import FriendRequestDialog from './components/FriendRequestDialog';
import AvatarPickerModal from './components/AvatarPickerModal';


function ContactsPane({ onOpenConversation, userStatus: propUserStatus, onStatusChange: propOnStatusChange, onLogoff, onSignOut, onClosePane, nowPlaying, currentUserEmail, messengerSignedIn, setMessengerSignedIn }) {
  const { getAvatar, getDisplayName, setMyDisplayName } = useAvatar();
  // FIX: Gebruik props als ze beschikbaar zijn, anders lokale state
  const [localStatus, setLocalStatus] = useState('online');
  const myStatus = propUserStatus || localStatus;

  const [personalMessage, setPersonalMessage] = useState('');
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactPresence, setContactPresence] = useState({}); // FIX: Track presence per contact
  const [pendingRequests, setPendingRequests] = useState([]);
  const [currentUser, setCurrentUser] = useState('');
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [showOptionsDialog, setShowOptionsDialog] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const listenersRef = useRef(createListenerManager());

  // Sign-in flow states (isSignedIn komt van App.js via props)
  const isSignedIn = messengerSignedIn;
  const setIsSignedIn = setMessengerSignedIn;
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [autoSignIn, setAutoSignIn] = useState(() => {
    return localStorage.getItem('chatlon_auto_signin') === 'true';
  });
  const signingInTimerRef = useRef(null);

  // Haal opgeslagen wachtwoord op voor het aanmeldscherm (alleen weergave)
  const savedPassword = (() => {
    try {
      const creds = JSON.parse(localStorage.getItem('chatlon_credentials') || '{}');
      return creds.password || '';
    } catch { return ''; }
  })();

  // Auto sign-in bij mount als ingesteld
  useEffect(() => {
    if (autoSignIn && currentUserEmail && !isSignedIn && !isSigningIn) {
      handleSignIn();
    }
    return () => {
      if (signingInTimerRef.current) {
        clearTimeout(signingInTimerRef.current);
        signingInTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserEmail]);

  const handleSignIn = () => {
    setIsSigningIn(true);
    signingInTimerRef.current = setTimeout(() => {
      setIsSigningIn(false);
      setIsSignedIn(true);
      // Zet status online via prop handler
      if (propOnStatusChange) {
        propOnStatusChange('online');
      } else {
        setLocalStatus('online');
      }
    }, 2000);
  };

  const handleSignOut = () => {
    setIsSignedIn(false);
    setIsSigningIn(false);
    // Zet presence offline
    if (onSignOut) {
      onSignOut();
    }
  };

  const handleAutoSignInChange = (checked) => {
    setAutoSignIn(checked);
    if (checked) {
      localStorage.setItem('chatlon_auto_signin', 'true');
    } else {
      localStorage.removeItem('chatlon_auto_signin');
    }
  };

  useEffect(() => {
    if (user.is) {
      const username = user.is.alias;
      setCurrentUser(username);
      
      // Laad opgeslagen personal message
      user.get('personalMessage').on((data) => {
        if (data) setPersonalMessage(data);
      });

      // Luister naar contactenlijst (accepted + blocked)
      user.get('contacts').map().on((contactData, contactId) => {
        if (contactData && (contactData.status === 'accepted' || contactData.status === 'blocked')) {
          setContacts(prev => {
            const existing = prev.find(c => c.username === contactData.username);
            if (existing) {
              // Update status als die veranderd is (bv. van blocked naar accepted)
              if (existing.contactStatus !== contactData.status) {
                return prev.map(c => c.username === contactData.username
                  ? { ...c, contactStatus: contactData.status }
                  : c
                );
              }
              return prev;
            }
            return [...prev, {
              username: contactData.username,
              avatar: contactData.username,
              status: 'online',
              contactStatus: contactData.status
            }];
          });

          // Setup presence listener voor dit contact (ook voor blocked, voor weergave)
          if (!listenersRef.current.has(contactData.username)) {
            const node = gun.get('PRESENCE').get(contactData.username);
            node.on((presenceData) => {
              if (presenceData) {
                setContactPresence(prev => ({
                  ...prev,
                  [contactData.username]: presenceData
                }));
              }
            });
            listenersRef.current.add(contactData.username, node);
          }
        }
      });

      // Luister naar contact sync (wanneer anderen jou accepteren)
      gun.get('contactSync').get(username).map().on((syncData, contactId) => {
        if (syncData && syncData.username) {
          // Voeg automatisch toe aan eigen contactenlijst
          user.get('contacts').get(syncData.username).put({
            username: syncData.username,
            status: 'accepted',
            timestamp: Date.now()
          });
        }
      });

      // Luister naar vriendenverzoeken IN PUBLIC SPACE
      gun.get('friendRequests').get(username).map().on((requestData, requestId) => {
        if (requestData && requestData.from && requestData.status === 'pending') {
          setPendingRequests(prev => {
            const existing = prev.find(r => r.from === requestData.from);
            if (existing) return prev;
            return [...prev, {
              from: requestData.from,
              timestamp: requestData.timestamp,
              id: requestId
            }];
          });
        }
      });
    }

    // Cleanup
    return () => {
      listenersRef.current.cleanup();
    };
  }, []);

  const handleStatusChange = (newStatus) => {
    // FIX: Gebruik prop handler als beschikbaar
    if (propOnStatusChange) {
      propOnStatusChange(newStatus);
    } else {
      setLocalStatus(newStatus);
    }
  };

  const handlePersonalMessageSave = () => {
    if (user.is) {
      user.get('personalMessage').put(personalMessage);
      gun.get('PRESENCE').get(user.is.alias).put({ personalMessage: personalMessage });
    }
    setIsEditingMessage(false);
  };

  const handleSendRequest = (trimmedEmail) => {
    log('[ContactsPane] Adding contact:', trimmedEmail);

    const requestId = `${currentUser}_${trimmedEmail}_${Date.now()}`;

    log('[ContactsPane] Sending friend request:', { requestId, from: currentUser, to: trimmedEmail });

    // Voeg toe aan eigen "sent requests"
    user.get('sentRequests').get(requestId).put({
      to: trimmedEmail,
      status: 'pending',
      timestamp: Date.now()
    });

    // Voeg toe aan PUBLIC friend requests space (zodat ontvanger het kan zien)
    gun.get('friendRequests').get(trimmedEmail).get(requestId).put({
      from: currentUser,
      status: 'pending',
      timestamp: Date.now()
    });

    log('[ContactsPane] Friend request sent successfully');
  };

  const handleDismissRequest = (request) => {
    // Verwijder alleen uit lokale pending lijst, laat Gun data staan
    setPendingRequests(prev => prev.filter(r => r.id !== request.id));
  };

  const handleAcceptRequest = (request) => {
    // Voeg toe aan eigen contactenlijst
    user.get('contacts').get(request.from).put({
      username: request.from,
      status: 'accepted',
      timestamp: Date.now()
    });

    // Voeg jezelf toe aan hun contactenlijst via public contact sync space
    gun.get('contactSync').get(request.from).get(currentUser).put({
      username: currentUser,
      addedBy: currentUser,
      timestamp: Date.now()
    });

    // Update request status in public space
    gun.get('friendRequests').get(currentUser).get(request.id).put({
      from: request.from,
      status: 'accepted',
      timestamp: request.timestamp
    });

    // Verwijder uit pending
    setPendingRequests(prev => prev.filter(r => r.id !== request.id));
  };

  const handleDeclineRequest = (request) => {
    // Update request status in public space
    gun.get('friendRequests').get(currentUser).get(request.id).put({
      from: request.from,
      status: 'declined',
      timestamp: request.timestamp
    });

    // Voeg toe als geblokkeerd contact
    user.get('contacts').get(request.from).put({
      username: request.from,
      status: 'blocked',
      timestamp: Date.now()
    });

    // Verwijder uit pending
    setPendingRequests(prev => prev.filter(r => r.id !== request.id));
  };

  // Gebruik STATUS_OPTIONS van presenceUtils.js
  const currentStatus = STATUS_OPTIONS.find(s => s.value === myStatus) || STATUS_OPTIONS[0];

  // Splits contacten: actief (accepted) vs geblokkeerd
  const activeContacts = contacts.filter(c => c.contactStatus !== 'blocked');
  const blockedContacts = contacts.filter(c => c.contactStatus === 'blocked');

  // Sorteer actieve contacten op online status
  const sortedContacts = [...activeContacts].sort((a, b) => {
    const aPresence = getPresenceStatus(contactPresence[a.username]);
    const bPresence = getPresenceStatus(contactPresence[b.username]);
    const aOnline = aPresence.value !== 'offline';
    const bOnline = bPresence.value !== 'offline';
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    return 0;
  });

  const onlineContacts = sortedContacts.filter(c => {
    const presence = getPresenceStatus(contactPresence[c.username]);
    return presence.value !== 'offline';
  });

  const offlineContacts = sortedContacts.filter(c => {
    const presence = getPresenceStatus(contactPresence[c.username]);
    return presence.value === 'offline';
  });

  // Sign-in scherm
  if (!isSignedIn && !isSigningIn) {
    return (
      <div className="contacts-container">
        <div className="contacts-signin">
          <div className="contacts-signin-logo">
            <div className="contacts-signin-brand">Chatlon</div>
            <div className="contacts-signin-subtitle">Messenger</div>
          </div>

          <div className="contacts-signin-fields">
            <div className="contacts-signin-field">
              <label className="contacts-signin-label">E-mailadres:</label>
              <input
                type="text"
                className="contacts-signin-input"
                value={currentUserEmail || ''}
                readOnly
                tabIndex={-1}
              />
            </div>
            <div className="contacts-signin-field">
              <label className="contacts-signin-label">Wachtwoord:</label>
              <input
                type="password"
                className="contacts-signin-input"
                value={savedPassword ? '••••••••' : ''}
                readOnly
                tabIndex={-1}
              />
            </div>
          </div>

          <div className="contacts-signin-options">
            <label className="contacts-signin-checkbox">
              <input
                type="checkbox"
                checked={autoSignIn}
                onChange={(e) => handleAutoSignInChange(e.target.checked)}
              />
              <span>Automatisch aanmelden</span>
            </label>
          </div>

          <button className="contacts-signin-btn" onClick={handleSignIn}>
            Aanmelden
          </button>

          <div className="contacts-signin-status">
            <span className="contacts-signin-status-dot"></span>
            <span>Status: Online</span>
          </div>
        </div>
      </div>
    );
  }

  // Aanmeld-animatie
  if (isSigningIn) {
    return (
      <div className="contacts-container">
        <div className="contacts-signing-in">
          <div className="contacts-signin-email">{currentUserEmail}</div>
          <div className="contacts-signin-message">
            Aanmelden bij Chatlon<br />Messenger...
          </div>
          <div className="contacts-signin-progress">
            <div className="contacts-signin-progress-bar"></div>
          </div>
          <button
            className="contacts-signin-cancel"
            onClick={() => {
              if (signingInTimerRef.current) clearTimeout(signingInTimerRef.current);
              setIsSigningIn(false);
            }}
          >
            Annuleren
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="contacts-container">
      {/* Menubar */}
      <div className="contacts-menubar">
        <DropdownMenu
          label="Bestand"
          isOpen={openMenu === 'bestand'}
          onToggle={() => setOpenMenu(prev => prev === 'bestand' ? null : 'bestand')}
          onClose={() => setOpenMenu(prev => prev === 'bestand' ? null : prev)}
          onHover={() => openMenu && setOpenMenu('bestand')}
          items={[
            { label: 'Status wijzigen', submenu: STATUS_OPTIONS.map(s => ({
              label: s.label, onClick: () => handleStatusChange(s.value)
            })) },
            { label: 'Persoonlijk bericht wijzigen', onClick: () => setIsEditingMessage(true) },
            { separator: true },
            { label: 'Afmelden', onClick: handleSignOut },
            { label: 'Afsluiten', onClick: () => onClosePane && onClosePane() }
          ]}
        />
        <DropdownMenu
          label="Contacten"
          isOpen={openMenu === 'contacten'}
          onToggle={() => setOpenMenu(prev => prev === 'contacten' ? null : 'contacten')}
          onClose={() => setOpenMenu(prev => prev === 'contacten' ? null : prev)}
          onHover={() => openMenu && setOpenMenu('contacten')}
          items={[
            { label: 'Contact toevoegen', onClick: () => setShowAddWizard(true) },
            { label: 'Contact verwijderen', disabled: true },
            { separator: true },
            { label: 'Groepen beheren', disabled: true },
            { label: 'Geblokkeerde contacten', disabled: true }
          ]}
        />
        <DropdownMenu
          label="Extra"
          isOpen={openMenu === 'extra'}
          onToggle={() => setOpenMenu(prev => prev === 'extra' ? null : 'extra')}
          onClose={() => setOpenMenu(prev => prev === 'extra' ? null : prev)}
          onHover={() => openMenu && setOpenMenu('extra')}
          items={[
            { label: 'Opties...', onClick: () => setShowOptionsDialog(true) },
            { separator: true },
            { label: 'Nu afspelend tonen', checked: !!nowPlaying?.isPlaying, disabled: true },
            { label: 'Verbonden met Spotify', disabled: true }
          ]}
        />
        <DropdownMenu
          label="Help"
          isOpen={openMenu === 'help'}
          onToggle={() => setOpenMenu(prev => prev === 'help' ? null : 'help')}
          onClose={() => setOpenMenu(prev => prev === 'help' ? null : prev)}
          onHover={() => openMenu && setOpenMenu('help')}
          items={[
            { label: 'Over Chatlon Messenger', onClick: () => setShowAboutDialog(true) },
            { label: 'Sneltoetsen', disabled: true }
          ]}
        />
      </div>

      {/* User info sectie */}
      <div className="contacts-user-section">
        <div className="contacts-user-info">
          <img
            src={getAvatar(currentUser)}
            alt="avatar"
            className="contacts-user-avatar"
            onDoubleClick={() => setShowAvatarPicker(true)}
            title="Dubbelklik om profielfoto te wijzigen"
            style={{ cursor: 'pointer' }}
          />
          <div className="contacts-user-details">
            {isEditingDisplayName ? (
              <input
                className="contacts-displayname-input"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                onBlur={() => {
                  setMyDisplayName(editDisplayName.trim());
                  setIsEditingDisplayName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setMyDisplayName(editDisplayName.trim());
                    setIsEditingDisplayName(false);
                  }
                  if (e.key === 'Escape') setIsEditingDisplayName(false);
                }}
                autoFocus
              />
            ) : (
              <div
                className="contacts-user-name"
                onDoubleClick={() => {
                  const current = getDisplayName(currentUser);
                  setEditDisplayName(current === currentUser ? '' : current);
                  setIsEditingDisplayName(true);
                }}
                title="Dubbelklik om weergavenaam te wijzigen"
              >
                {getDisplayName(currentUser)}
              </div>
            )}
            <div className="contacts-user-subname">({currentUser})</div>
            {isEditingMessage ? (
              <input
                className="contacts-personal-message-input"
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                onBlur={handlePersonalMessageSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePersonalMessageSave();
                  if (e.key === 'Escape') setIsEditingMessage(false);
                }}
                placeholder="Wat denk je nu?"
                autoFocus
              />
            ) : (
              <div
                className="contacts-personal-message"
                onClick={() => setIsEditingMessage(true)}
              >
                {nowPlaying?.isPlaying
                  ? `\uD83C\uDFB5 ${nowPlaying.artist} \u2013 ${nowPlaying.title}`
                  : (personalMessage || 'Wat denk je nu?')}
              </div>
            )}
          </div>
        </div>

        {/* Status selector */}
        <div className="contacts-status-selector">
          <div
            className="contacts-status-current"
            style={{ borderLeftColor: currentStatus.color }}
          >
            <span className="contacts-status-dot" style={{ backgroundColor: currentStatus.color }}></span>
            <select
              className="contacts-status-dropdown"
              value={myStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Add contact button */}
        <button
          className="dx-button"
          onClick={() => setShowAddWizard(true)}
          style={{ marginTop: '8px', width: '100%' }}
        >
          + Contact toevoegen
        </button>
      </div>

      {/* Pending requests (MSN-stijl met Allow/Block/Add checkboxes) */}
      {pendingRequests.length > 0 && (
        <div className="pending-requests-section">
          <div className="pending-requests-header">
            Vriendenverzoeken ({pendingRequests.length})
          </div>
          {pendingRequests.map((request) => (
            <FriendRequestDialog
              key={request.id}
              request={request}
              onAccept={handleAcceptRequest}
              onDecline={handleDeclineRequest}
              onDismiss={handleDismissRequest}
            />
          ))}
        </div>
      )}

      {/* Contact lijst */}
      <div className="contacts-list-section">
        <div className="contacts-list">
          {onlineContacts.length === 0 && offlineContacts.length === 0 ? (
            <div className="contacts-empty">
              Voeg contacten toe om te beginnen met chatten!
            </div>
          ) : (
            <>
              {onlineContacts.map((contact) => {
                const presence = getPresenceStatus(contactPresence[contact.username]);
                const personalMsg = contactPresence[contact.username]?.personalMessage;
                return (
                  <div
                    key={contact.username}
                    className="contact-item"
                    onDoubleClick={() => onOpenConversation && onOpenConversation(contact.username)}
                  >
                    <span className="contact-status-dot" style={{ backgroundColor: presence.color }}></span>
                    <div className="contact-inline">
                      <span className="contact-name">{getDisplayName(contact.username)}</span>
                      <span className="contact-status-label">({presence.label})</span>
                      {personalMsg && <span className="contact-personal-msg"> - {personalMsg}</span>}
                    </div>
                  </div>
                );
              })}
              {offlineContacts.map((contact) => {
                const presence = getPresenceStatus(contactPresence[contact.username]);
                const personalMsg = contactPresence[contact.username]?.personalMessage;
                return (
                  <div
                    key={contact.username}
                    className="contact-item"
                    style={{ opacity: 0.6 }}
                    onDoubleClick={() => onOpenConversation && onOpenConversation(contact.username)}
                  >
                    <span className="contact-status-dot" style={{ backgroundColor: presence.color }}></span>
                    <div className="contact-inline">
                      <span className="contact-name">{getDisplayName(contact.username)}</span>
                      <span className="contact-status-label">({presence.label})</span>
                      {personalMsg && <span className="contact-personal-msg"> - {personalMsg}</span>}
                    </div>
                  </div>
                );
              })}
              {blockedContacts.length > 0 && (
                <div className="contacts-blocked-section">
                  <div className="contacts-group-header">Geblokkeerd ({blockedContacts.length})</div>
                  {blockedContacts.map((contact) => (
                    <div
                      key={contact.username}
                      className="contact-item contact-item-blocked"
                    >
                      <span className="contact-status-dot" style={{ backgroundColor: '#8C8C8C' }}></span>
                      <div className="contact-inline">
                        <span className="contact-name">{getDisplayName(contact.username)}</span>
                        <span className="contact-status-label">(Geblokkeerd)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom banner */}
      <div className="contacts-bottom-banner">
        <div className="contacts-ad-space">
          🎮 Speel games • 🎵 Deel muziek • 📸 Deel foto's
        </div>
      </div>

      {/* Contact toevoegen wizard */}
      {showAddWizard && (
        <AddContactWizard
          onClose={() => setShowAddWizard(false)}
          onSendRequest={handleSendRequest}
          currentUser={currentUser}
          contacts={contacts}
        />
      )}

      {/* Avatar picker */}
      {showAvatarPicker && <AvatarPickerModal onClose={() => setShowAvatarPicker(false)} />}

      {/* Opties dialoog */}
      {showOptionsDialog && <OptionsDialog onClose={() => setShowOptionsDialog(false)} />}

      {/* Over Chatlon dialoog */}
      {showAboutDialog && (
        <div className="modal-overlay" onClick={() => setShowAboutDialog(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ minWidth: 320 }}>
            <div className="modal-header">
              <h3>Over Chatlon Messenger</h3>
              <button className="modal-close" onClick={() => setShowAboutDialog(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '24px 16px' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Chatlon Messenger</div>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '16px' }}>Versie 0.1 Alpha</div>
              <div style={{ fontSize: '11px', color: '#444', lineHeight: '1.6' }}>
                Een Macrohard Panes dX ervaring.<br />
                Peer-to-peer chat met Gun.js & Trystero.<br /><br />
                Nonprofit parodieproject.
              </div>
              <button className="dx-button" onClick={() => setShowAboutDialog(false)} style={{ marginTop: '16px' }}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContactsPane;