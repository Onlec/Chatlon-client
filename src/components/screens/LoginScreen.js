import React, { useState, useEffect } from 'react';
import { gun, user } from '../../gun';
import { log } from '../../utils/debug';
import { useAvatar } from '../../contexts/AvatarContext';
import { useDialog } from '../../contexts/DialogContext';
import { ACTIVE_TAB_FRESH_MS } from '../../utils/sessionConstants';

const COLDMAIL_DOMAINS = ['@coldmail.com', '@coldmail.nl', '@coldmail.net'];
const TAB_CLIENT_ID_KEY = 'chatlon_tab_client_id';

function isForeignActiveSession(activeTabData, localTabClientId) {
  if (!activeTabData || !activeTabData.heartbeat) return false;
  if (Date.now() - activeTabData.heartbeat >= ACTIVE_TAB_FRESH_MS) return false;
  // Zelfde tab-client ID is geen "andere sessie".
  if (localTabClientId && activeTabData.clientId === localTabClientId) return false;
  return true;
}

function LoginScreen({ onLoginSuccess, fadeIn, onShutdown }) {
  const { setMyAvatar, setMyDisplayName } = useAvatar();
  const { confirm } = useDialog();
  const [emailLocal, setEmailLocal] = useState('');
  const [emailDomain, setEmailDomain] = useState(COLDMAIL_DOMAINS[0]);
  const [localName, setLocalName] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [isAutoLogging, setIsAutoLogging] = useState(false);

  // Het volledige e-mailadres (voor registratie)
  const fullEmail = emailLocal ? emailLocal + emailDomain : '';

  // Lokale avatar helper: leest uit localStorage (login tile), niet uit Gun (Chatlon profiel)
  const getLocalAvatar = (email) => {
    if (!email || email === 'guest') return '/avatars/egg.jpg';
    const userObj = availableUsers.find(u => u.email === email);
    if (userObj?.localAvatar) return `/avatars/${userObj.localAvatar}`;
    // Fallback: deterministische preset op basis van email
    const PRESETS = ['cat.jpg', 'egg.jpg', 'crab.jpg', 'blocks.jpg', 'pug.jpg'];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = ((hash << 5) - hash) + email.charCodeAt(i);
      hash |= 0;
    }
    return `/avatars/${PRESETS[Math.abs(hash) % PRESETS.length]}`;
  };

  // LOAD SAVED CREDENTIALS (niet auto-selecteren — gebruiker kiest zelf)
  useEffect(() => {
    const savedCredentials = localStorage.getItem('chatlon_credentials');
    if (savedCredentials) {
      try {
        JSON.parse(savedCredentials); // validatie
        setRememberMe(true);
      } catch (e) {
        localStorage.removeItem('chatlon_credentials');
      }
    }
  }, []);

  // Load available users (nu objecten met email + localName)
  useEffect(() => {
    const savedUsers = localStorage.getItem('chatlon_users');
    if (savedUsers) {
      try {
        const parsed = JSON.parse(savedUsers);
        // Backwards compatibiliteit: strings → objecten
        const normalized = parsed.map(u =>
          typeof u === 'string' ? { email: u, localName: u } : u
        );
        setAvailableUsers(normalized);
      } catch (e) {
        setAvailableUsers([]);
      }
    }
  }, []);

  const handleLogin = () => {
    const email = selectedUser === 'manual' ? emailLocal : selectedUser;
    if (!email || !password) {
      setError('Typ een wachtwoord.');
      return;
    }

    const localTabClientId = sessionStorage.getItem(TAB_CLIENT_ID_KEY);
    gun.get('ACTIVE_TAB').get(email).once(async (data) => {
      if (isForeignActiveSession(data, localTabClientId)) {
        const forceLogin = await confirm(
          'Dit account is al aangemeld in een ander venster.\n\nWil je de andere sessie afbreken en hier inloggen?',
          'Al aangemeld'
        );
        if (!forceLogin) {
          setPassword('');
          return;
        }
        log('[Login] Forcing other session to close');
      }

      user.auth(email, password, (ack) => {
        if (ack.err) {
          setError('Typ het juiste wachtwoord.');
          setPassword('');
        } else {
          setError('');

          if (rememberMe) {
            localStorage.setItem('chatlon_credentials', JSON.stringify({ email, password }));
            localStorage.setItem('chatlon_remember_me', 'true');
          } else {
            localStorage.removeItem('chatlon_credentials');
            localStorage.removeItem('chatlon_remember_me');
          }

          // Voeg toe aan gebruikerslijst als nog niet aanwezig
          if (!availableUsers.find(u => u.email === email) && availableUsers.length < 5) {
            const updated = [...availableUsers, { email, localName: email }];
            localStorage.setItem('chatlon_users', JSON.stringify(updated));
          }

          onLoginSuccess(email);
        }
      });
    });
  };

  const handleRegister = () => {
    if (!emailLocal || !password || !localName.trim()) {
      setError('Vul alle velden in');
      return;
    }

    if (password.length < 4) {
      setError('Wachtwoord moet minimaal 4 tekens zijn');
      return;
    }

    const email = fullEmail;

    user.create(email, password, (ack) => {
      if (ack.err) {
        setError('Dit e-mailadres is al in gebruik');
      } else {
        user.auth(email, password, (authAck) => {
          if (!authAck.err) {
            setError('');

            // Wijs een willekeurige standaard avatar toe (zowel Gun als lokaal)
            const presets = ['cat.jpg', 'egg.jpg', 'crab.jpg', 'blocks.jpg', 'pug.jpg'];
            const randomPreset = presets[Math.floor(Math.random() * presets.length)];
            setMyAvatar(randomPreset, 'preset');

            // Stel displayName in op het e-mailadres als standaardwaarde
            setMyDisplayName(email);

            // Sla credentials op (altijd bij registratie)
            localStorage.setItem('chatlon_credentials', JSON.stringify({ email, password }));
            localStorage.setItem('chatlon_remember_me', 'true');

            // Voeg toe aan gebruikerslijst met lokale naam + lokale avatar
            if (availableUsers.length < 5) {
              const updated = [...availableUsers, { email, localName: localName.trim(), localAvatar: randomPreset }];
              localStorage.setItem('chatlon_users', JSON.stringify(updated));
            }

            onLoginSuccess(email);
          }
        });
      }
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (isRegistering) {
        handleRegister();
      } else {
        handleLogin();
      }
    }
  };

  const handleUserClick = (userObj) => {
    // Check of er opgeslagen credentials zijn voor deze gebruiker
    try {
      const saved = JSON.parse(localStorage.getItem('chatlon_credentials') || '{}');
      if (saved.email === userObj.email && saved.password) {
        // Auto-login: toon laadscherm, skip wachtwoord invoer
        setIsAutoLogging(true);
        setError('');

        const localTabClientId = sessionStorage.getItem(TAB_CLIENT_ID_KEY);
        gun.get('ACTIVE_TAB').get(userObj.email).once(async (data) => {
          if (isForeignActiveSession(data, localTabClientId)) {
            const forceLogin = await confirm(
              'Dit account is al aangemeld in een ander venster.\n\nWil je de andere sessie afbreken en hier inloggen?',
              'Al aangemeld'
            );
            if (!forceLogin) {
              setIsAutoLogging(false);
              return;
            }
          }
          user.auth(userObj.email, saved.password, (ack) => {
            if (ack.err) {
              // Wachtwoord klopt niet meer, toon wachtwoord scherm
              setIsAutoLogging(false);
              setSelectedUser(userObj.email);
              setEmailLocal(userObj.email);
              setPassword('');
              setRememberMe(true);
              setError('Opgeslagen wachtwoord is niet meer geldig.');
            } else {
              onLoginSuccess(userObj.email);
            }
          });
        });
        return;
      }
    } catch (e) { /* geen geldige credentials */ }

    // Geen opgeslagen credentials: toon wachtwoord scherm
    setSelectedUser(userObj.email);
    setEmailLocal(userObj.email);
    setPassword('');
    setError('');
    setIsRegistering(false);
  };

  const handleDeleteUser = async (userObj, e) => {
    e.stopPropagation();

    const confirmed = await confirm(
      `Wilt u ${userObj.localName} uit de lijst verwijderen?\n\nDit verwijdert alleen de snelkoppeling, niet het account.`,
      'Gebruiker verwijderen'
    );

    if (confirmed) {
      const updatedUsers = availableUsers.filter(u => u.email !== userObj.email);
      setAvailableUsers(updatedUsers);
      localStorage.setItem('chatlon_users', JSON.stringify(updatedUsers));

      if (selectedUser === userObj.email) {
        setSelectedUser(null);
        setEmailLocal('');
        setPassword('');
        setError('');
      }
    }
  };

  // Bepaal weergavenaam voor geselecteerde user
  const selectedUserObj = availableUsers.find(u => u.email === selectedUser);
  const displayLabel = isRegistering
    ? 'Nieuwe gebruiker'
    : (selectedUser === 'manual' ? 'Inloggen' : (selectedUserObj?.localName || selectedUser || ''));

  // Auto-login laadscherm
  if (isAutoLogging) {
    return (
      <div className="xp-login">
        <div className="xp-top-bar">
          <div className="xp-top-text">Welkom</div>
        </div>
        <div className="xp-main">
          <div className="xp-left">
            <div className="xp-brand-layout xp-login-brand-layout">
              <div className="xp-brand-left">
                <span className="xp-brand-microsoft">Macrohard</span>
                <span className="xp-brand-windows">Panes<span className="xp-brand-xp">dX</span></span>
              </div>
              <div className="xp-brand-right">
                <div className="xp-boot-logo">
                  <div className="xp-logo-stripe xp-stripe-green"></div>
                  <div className="xp-logo-stripe xp-stripe-blue"></div>
                  <div className="xp-logo-stripe xp-stripe-red"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="xp-divider"></div>
          <div className="xp-right">
            <div className="xp-autologin-message">
              <div className="xp-autologin-text">Uw instellingen worden geladen...</div>
            </div>
          </div>
        </div>
        <div className="xp-bottom-bar">
          <div className="xp-bottom-strip"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="xp-login">
      {fadeIn && <div className="login-fade-overlay" />}
      {/* Top Bar */}
      <div className="xp-top-bar">
        <div className="xp-top-text">
          Voor het openen van dit bestand klikt u op uw naam
        </div>
      </div>

      {/* Main Content */}
      <div className="xp-main">
        {/* Left Side - Logo */}
        <div className="xp-left">
          <div className="xp-brand-layout xp-login-brand-layout">
            <div className="xp-brand-left">
              <span className="xp-brand-microsoft">Macrohard</span>
              <span className="xp-brand-windows">Panes<span className="xp-brand-xp">dX</span></span>
            </div>
            <div className="xp-brand-right">
              <div className="xp-boot-logo">
                <div className="xp-logo-stripe xp-stripe-green"></div>
                <div className="xp-logo-stripe xp-stripe-blue"></div>
                <div className="xp-logo-stripe xp-stripe-red"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Divider */}
        <div className="xp-divider"></div>

        {/* Right Side - Users */}
        <div className="xp-right">
          {selectedUser || isRegistering ? (
            // PASSWORD VIEW
            <div className="xp-password-panel">
              <div className="xp-user-selected">
                <img
                  src={getLocalAvatar(selectedUser === 'manual' ? 'guest' : selectedUser)}
                  alt="avatar"
                  className="xp-avatar-large"
                />
                <div className="xp-username-large">{displayLabel}</div>
              </div>

              {/* Registratie: e-mailadres met domein-dropdown */}
              {isRegistering && (
                <>
                  <div className="xp-input-row">
                    <label className="xp-label">E-mailadres:</label>
                    <div className="xp-email-input-group">
                      <input
                        type="text"
                        className="xp-text-input xp-email-local"
                        value={emailLocal}
                        onChange={(e) => setEmailLocal(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                        onKeyPress={handleKeyPress}
                        autoFocus
                        placeholder="gebruikersnaam"
                      />
                      <select
                        className="xp-email-domain"
                        value={emailDomain}
                        onChange={(e) => setEmailDomain(e.target.value)}
                      >
                        {COLDMAIL_DOMAINS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="xp-input-row">
                    <label className="xp-label">Naam:</label>
                    <input
                      type="text"
                      className="xp-text-input"
                      value={localName}
                      onChange={(e) => setLocalName(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Weergavenaam (bijv. Bobby)"
                    />
                  </div>
                </>
              )}

              {/* Andere gebruiker: volledig e-mailadres */}
              {selectedUser === 'manual' && (
                <div className="xp-input-row">
                  <label className="xp-label">E-mailadres:</label>
                  <input
                    type="text"
                    className="xp-text-input"
                    value={emailLocal}
                    onChange={(e) => setEmailLocal(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoFocus
                    placeholder="naam@coldmail.com"
                  />
                </div>
              )}

              <div className="xp-input-row">
                <label className="xp-label">Typ uw wachtwoord:</label>
                <div className="xp-password-input-group">
                  <input
                    type="password"
                    className="xp-text-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoFocus={!isRegistering && selectedUser !== 'manual'}
                  />
                  <button
                    className="xp-arrow-button"
                    onClick={isRegistering ? handleRegister : handleLogin}
                  >
                    <span className="xp-arrow">&rarr;</span>
                  </button>
                </div>
              </div>

              {!isRegistering && (
                <div className="xp-checkbox-row">
                  <label className="xp-checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Mijn wachtwoord onthouden</span>
                  </label>
                </div>
              )}

              {error && (
                <div className="xp-error-message">{error}</div>
              )}

              <div className="xp-hint-text">
                Tip: Druk op Enter nadat u uw wachtwoord hebt getypt
              </div>
            </div>
          ) : (
            // USER SELECTION VIEW
            <div className="xp-user-panel">
              {availableUsers.length === 0 && (
                <div className="xp-no-users-hint">
                  <span className="xp-hint-icon">&#8505;&#65039;</span>
                  <span>Geen gebruikers gevonden. Maak een nieuwe gebruiker aan.</span>
                </div>
              )}

              {availableUsers.map((userObj) => (
                <div
                  key={userObj.email}
                  className="xp-user-item"
                  onClick={() => handleUserClick(userObj)}
                >
                  <img
                    src={getLocalAvatar(userObj.email)}
                    alt={userObj.localName}
                    className="xp-avatar"
                  />
                  <span className="xp-username">{userObj.localName}</span>
                  <button
                    className="xp-delete-user"
                    onClick={(e) => handleDeleteUser(userObj, e)}
                    title="Verwijder uit lijst"
                  >
                    &#10005;
                  </button>
                </div>
              ))}

              {availableUsers.length >= 5 && (
                <div className="xp-max-users-hint">
                  <span className="xp-hint-icon">&#9888;&#65039;</span>
                  <span>Maximum aantal gebruikers bereikt. Verwijder een gebruiker om een nieuwe toe te voegen.</span>
                </div>
              )}

              <div className="xp-user-item xp-separator-item">
                <div className="xp-separator-line"></div>
              </div>

              <div
                className={`xp-user-item xp-special-item ${availableUsers.length >= 5 ? 'xp-disabled' : ''}`}
                onClick={() => {
                  if (availableUsers.length >= 5) return;
                  setSelectedUser('manual');
                  setEmailLocal('');
                  setPassword('');
                  setIsRegistering(false);
                }}
              >
                <div className="xp-avatar xp-guest-avatar">
                  <span className="xp-guest-icon">&#128273;</span>
                </div>
                <span className="xp-username">Andere gebruiker</span>
              </div>

              <div
                className={`xp-user-item xp-special-item ${availableUsers.length >= 5 ? 'xp-disabled' : ''}`}
                onClick={() => {
                  if (availableUsers.length >= 5) return;
                  setIsRegistering(true);
                  setSelectedUser('register');
                  setEmailLocal('');
                  setLocalName('');
                  setPassword('');
                  setRememberMe(true);
                }}
              >
                <div className="xp-avatar xp-guest-avatar">
                  <span className="xp-guest-icon">&#10133;</span>
                </div>
                <span className="xp-username">Nieuwe gebruiker</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="xp-bottom-bar">
        <div className="xp-bottom-left">
          {(selectedUser || isRegistering) && (
            <button
              className="xp-back-link"
              onClick={() => {
                setSelectedUser(null);
                setIsRegistering(false);
                setEmailLocal('');
                setLocalName('');
                setPassword('');
                setError('');
              }}
            >
              &larr; Terug naar gebruikersselectie
            </button>
          )}
        </div>
        <div className="xp-bottom-right">
          <button className="xp-shutdown-button" onClick={onShutdown}>
            <span className="xp-shutdown-icon">&#9211;</span>
            Computer uitschakelen
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
