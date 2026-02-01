import React, { useState, useEffect } from 'react';
import { gun, user } from './gun';

function ContactsPane({ onOpenConversation }) {
  const [myStatus, setMyStatus] = useState('online');
  const [personalMessage, setPersonalMessage] = useState('');
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [currentUser, setCurrentUser] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    if (user.is) {
      const username = user.is.alias;
      setCurrentUser(username);
      
      // Laad opgeslagen personal message
      user.get('personalMessage').on((data) => {
        if (data) setPersonalMessage(data);
      });

      // Luister naar contactenlijst
      user.get('contacts').map().on((contactData, contactId) => {
        if (contactData && contactData.status === 'accepted') {
          setContacts(prev => {
            const existing = prev.find(c => c.username === contactData.username);
            if (existing) return prev;
            return [...prev, {
              username: contactData.username,
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${contactData.username}`,
              status: 'online'
            }];
          });
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
  }, []);

  const handleStatusChange = (newStatus) => {
    setMyStatus(newStatus);
  };

  const handlePersonalMessageSave = () => {
    if (user.is) {
      user.get('personalMessage').put(personalMessage);
    }
    setIsEditingMessage(false);
  };

  const handleAddContact = async () => {
    if (!searchUsername.trim()) {
      setSearchError('Vul een gebruikersnaam in');
      return;
    }

    const trimmedUsername = searchUsername.trim();

    console.log('[ContactsPane] Adding contact:', trimmedUsername);

    if (trimmedUsername === currentUser) {
      setSearchError('Je kunt jezelf niet toevoegen');
      return;
    }

    // Check of al in contactenlijst
    if (contacts.find(c => c.username === trimmedUsername)) {
      setSearchError('Al in contactenlijst');
      return;
    }

    // Verstuur vriendenverzoek
    const requestId = `${currentUser}_${trimmedUsername}_${Date.now()}`;
    
    console.log('[ContactsPane] Sending friend request:', { requestId, from: currentUser, to: trimmedUsername });
    
    // Voeg toe aan eigen "sent requests"
    user.get('sentRequests').get(requestId).put({
      to: trimmedUsername,
      status: 'pending',
      timestamp: Date.now()
    });

    // Voeg toe aan PUBLIC friend requests space (zodat ontvanger het kan zien)
    const friendRequestPath = `friendRequests/${trimmedUsername}/${requestId}`;
    console.log('[ContactsPane] Saving to Gun path:', friendRequestPath);
    
    gun.get('friendRequests').get(trimmedUsername).get(requestId).put({
      from: currentUser,
      status: 'pending',
      timestamp: Date.now()
    });

    console.log('[ContactsPane] Friend request sent successfully');

    setSearchUsername('');
    setSearchError('');
    setShowAddContact(false);
    alert(`Vriendenverzoek verstuurd naar ${trimmedUsername}!`);
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

    // Verwijder uit pending
    setPendingRequests(prev => prev.filter(r => r.id !== request.id));
  };

  const statusOptions = [
    { value: 'online', label: 'Online', color: '#7AC142' },
    { value: 'away', label: 'Afwezig', color: '#FFB900' },
    { value: 'busy', label: 'Bezet', color: '#E74856' },
    { value: 'appear-offline', label: 'Offline weergeven', color: '#8C8C8C' }
  ];

  const currentStatus = statusOptions.find(s => s.value === myStatus);

  return (
    <div className="contacts-container">
      {/* Menubar */}
      <div className="contacts-menubar">
        <span className="contacts-menu-item">Bestand</span>
        <span className="contacts-menu-item">Contactpersonen</span>
        <span className="contacts-menu-item">Acties</span>
        <span className="contacts-menu-item">Extra</span>
        <span className="contacts-menu-item">Help</span>
      </div>

      {/* User info sectie */}
      <div className="contacts-user-section">
        <div className="contacts-user-info">
          <img 
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser}`} 
            alt="avatar" 
            className="contacts-user-avatar"
          />
          <div className="contacts-user-details">
            <div className="contacts-user-name">{currentUser || 'Gebruiker'}</div>
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
                {personalMessage || 'Wat denk je nu?'}
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
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Add contact button */}
        <button 
          className="dx-button" 
          onClick={() => setShowAddContact(!showAddContact)}
          style={{ marginTop: '8px', width: '100%' }}
        >
          + Contact toevoegen
        </button>

        {/* Add contact form */}
        {showAddContact && (
          <div className="add-contact-form">
            <input
              className="dx-input"
              placeholder="Gebruikersnaam..."
              value={searchUsername}
              onChange={(e) => {
                setSearchUsername(e.target.value);
                setSearchError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddContact();
              }}
            />
            {searchError && (
              <div style={{ color: '#CC0000', fontSize: '10px', marginTop: '4px' }}>
                {searchError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
              <button className="dx-button" onClick={handleAddContact}>Toevoegen</button>
              <button className="dx-button secondary" onClick={() => {
                setShowAddContact(false);
                setSearchUsername('');
                setSearchError('');
              }}>Annuleren</button>
            </div>
          </div>
        )}
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div className="pending-requests-section">
          <div className="pending-requests-header">
            Vriendenverzoeken ({pendingRequests.length})
          </div>
          {pendingRequests.map((request) => (
            <div key={request.id} className="pending-request-item">
              <span className="pending-request-name">{request.from}</span>
              <div className="pending-request-actions">
                <button 
                  className="dx-button" 
                  onClick={() => handleAcceptRequest(request)}
                  style={{ fontSize: '10px', padding: '2px 6px' }}
                >
                  ✓
                </button>
                <button 
                  className="dx-button secondary" 
                  onClick={() => handleDeclineRequest(request)}
                  style={{ fontSize: '10px', padding: '2px 6px' }}
                >
                  ✗
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contact lijst */}
      <div className="contacts-list-section">
        <div className="contacts-category-header">
          <span className="contacts-category-icon">▼</span>
          <span className="contacts-category-name">Online ({contacts.length})</span>
        </div>
        
        <div className="contacts-list">
          {contacts.length === 0 ? (
            <div className="contacts-empty">
              Voeg contacten toe om te beginnen met chatten!
            </div>
          ) : (
            contacts.map((contact) => (
              <div 
                key={contact.username}
                className="contact-item"
                onDoubleClick={() => onOpenConversation && onOpenConversation(contact.username)}
              >
                <img src={contact.avatar} alt={contact.username} className="contact-avatar" />
                <div className="contact-info">
                  <div className="contact-name">{contact.username}</div>
                  <div className="contact-status">Online</div>
                </div>
                <span className="contact-status-dot" style={{ backgroundColor: '#7AC142' }}></span>
              </div>
            ))
          )}
        </div>

        {/* Offline categorie */}
        <div className="contacts-category-header collapsed">
          <span className="contacts-category-icon">▶</span>
          <span className="contacts-category-name">Offline (0)</span>
        </div>
      </div>

      {/* Bottom banner */}
      <div className="contacts-bottom-banner">
        <div className="contacts-ad-space">
          🎮 Speel games • 🎵 Deel muziek • 📸 Deel foto's
        </div>
      </div>
    </div>
  );
}

export default ContactsPane;