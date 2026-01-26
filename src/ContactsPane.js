import React, { useState, useEffect } from 'react';
import { gun, user } from './gun';

function ContactsPane({ onOpenChat }) {
  const [myStatus, setMyStatus] = useState('online');
  const [personalMessage, setPersonalMessage] = useState('');
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [currentUser, setCurrentUser] = useState('');

  useEffect(() => {
    if (user.is) {
      setCurrentUser(user.is.alias);
      
      // Laad opgeslagen personal message
      user.get('personalMessage').on((data) => {
        if (data) setPersonalMessage(data);
      });
    }

    // Luister naar alle ingelogde gebruikers (via Gun chat berichten)
    const chatNode = gun.get('CHAT_MESSAGES');
    const seenUsers = new Set();
    
    chatNode.map().on((data) => {
      if (data && data.sender && !seenUsers.has(data.sender)) {
        seenUsers.add(data.sender);
        setContacts(Array.from(seenUsers).filter(u => u !== currentUser).map(name => ({
          name,
          status: 'online',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
        })));
      }
    });
  }, [currentUser]);

  const handleStatusChange = (newStatus) => {
    setMyStatus(newStatus);
  };

  const handlePersonalMessageSave = () => {
    if (user.is) {
      user.get('personalMessage').put(personalMessage);
    }
    setIsEditingMessage(false);
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
      </div>

      {/* Contact lijst */}
      <div className="contacts-list-section">
        <div className="contacts-category-header">
          <span className="contacts-category-icon">▼</span>
          <span className="contacts-category-name">Online ({contacts.length})</span>
        </div>
        
        <div className="contacts-list">
          {contacts.length === 0 ? (
            <div className="contacts-empty">
              Geen contacten online. Start met chatten om contacten te zien!
            </div>
          ) : (
            contacts.map((contact) => (
              <div 
                key={contact.name}
                className="contact-item"
                onDoubleClick={() => onOpenChat && onOpenChat(contact.name)}
              >
                <img src={contact.avatar} alt={contact.name} className="contact-avatar" />
                <div className="contact-info">
                  <div className="contact-name">{contact.name}</div>
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