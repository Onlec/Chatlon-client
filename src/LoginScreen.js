import React, { useState, useEffect } from 'react';
import { gun, user } from './gun';
import { log } from './utils/debug';

function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);

  // LOAD SAVED CREDENTIALS (maar login niet automatisch!)
  useEffect(() => {
    const savedCredentials = localStorage.getItem('chatlon_credentials');
    if (savedCredentials) {
      try {
        const { username: savedUser, password: savedPass } = JSON.parse(savedCredentials);
        // Vul username en password in, maar login NIET automatisch
        setUsername(savedUser);
        setPassword(savedPass);
        setRememberMe(true);
        // Selecteer de user zodat password field meteen zichtbaar is
        setSelectedUser(savedUser);
      } catch (e) {
        localStorage.removeItem('chatlon_credentials');
      }
    }
  }, []);

  // Load available users
  useEffect(() => {
    const savedUsers = localStorage.getItem('chatlon_users');
    if (savedUsers) {
      try {
        setAvailableUsers(JSON.parse(savedUsers));
      } catch (e) {
        setAvailableUsers([]);
      }
    }
  }, []);

  const handleLogin = () => {
    if (!username || !password) {
      setError('Typ een wachtwoord.');
      return;
    }

    gun.get('ACTIVE_TAB').get(username).once((data) => {
      if (data && data.heartbeat && (Date.now() - data.heartbeat < 10000)) {
        const forceLogin = window.confirm(
          'Dit account is al aangemeld in een ander venster.\n\n' +
          'Wil je de andere sessie afbreken en hier inloggen?'
        );
        if (!forceLogin) {
          setPassword('');
          return;
        }
        
        // Force logout van andere sessie door nieuwe tabId te claimen
        log('[Login] Forcing other session to close');
      }

      user.auth(username, password, (ack) => {
        if (ack.err) {
          setError('Typ het juiste wachtwoord.');
          setPassword('');
        } else {
          setError('');
          
          if (rememberMe) {
            localStorage.setItem('chatlon_credentials', JSON.stringify({ username, password }));
            localStorage.setItem('chatlon_remember_me', 'true');
          } else {
            localStorage.removeItem('chatlon_credentials');
            localStorage.removeItem('chatlon_remember_me');
          }

          // Voeg alleen toe aan lijst als user er nog niet in zit EN er nog ruimte is
          if (!availableUsers.includes(username) && availableUsers.length < 5) {
            const users = new Set(availableUsers);
            users.add(username);
            localStorage.setItem('chatlon_users', JSON.stringify(Array.from(users)));
          }
          
          onLoginSuccess(username);
          // Toon melding als user niet toegevoegd kon worden
        }
      });
    });
  };

  const handleRegister = () => {
    if (!username || !password) {
      setError('Vul alle velden in');
      return;
    }

    if (password.length < 4) {
      setError('Wachtwoord moet minimaal 4 tekens zijn');
      return;
    }

    if (selectedUser === 'manual') {
    setError('Gebruik "Nieuwe gebruiker" om een account aan te maken');
    return;
  }

    user.create(username, password, (ack) => {
      if (ack.err) {
        setError('Gebruikersnaam bestaat al');
      } else {
        user.auth(username, password, (authAck) => {
          if (!authAck.err) {
            setError('');
            
            if (rememberMe) {
              localStorage.setItem('chatlon_credentials', JSON.stringify({ username, password }));
              localStorage.setItem('chatlon_remember_me', 'true');
            }

            // Voeg alleen toe aan lijst als er nog ruimte is
            if (availableUsers.length < 5) {
              const users = new Set(availableUsers);
              users.add(username);
              localStorage.setItem('chatlon_users', JSON.stringify(Array.from(users)));
            }
            
            onLoginSuccess(username);
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

  const handleUserClick = (clickedUser) => {
    setSelectedUser(clickedUser);
    setUsername(clickedUser);
    setPassword('');
    setError('');
    setIsRegistering(false);
  };
  const handleDeleteUser = (userToDelete, e) => {
    e.stopPropagation(); // Voorkom dat de tile onClick triggered
    
    const confirmed = window.confirm(`Wilt u ${userToDelete} uit de lijst verwijderen?\n\nDit verwijdert alleen de snelkoppeling, niet het account.`);
    
    if (confirmed) {
      const updatedUsers = availableUsers.filter(u => u !== userToDelete);
      setAvailableUsers(updatedUsers);
      localStorage.setItem('chatlon_users', JSON.stringify(updatedUsers));
      
      // Als de verwijderde user geselecteerd was, terug naar lijst
      if (selectedUser === userToDelete) {
        setSelectedUser(null);
        setUsername('');
        setPassword('');
        setError('');
      }
    }
  };


  return (
    <div className="xp-login">
      {/* Top Bar */}
      <div className="xp-top-bar">
        <div className="xp-top-text">
          Voor het openen van dit bestand klikt u op de gebruikersnaam
        </div>
      </div>

      {/* Main Content */}
      <div className="xp-main">
        {/* Left Side - Logo */}
        <div className="xp-left">
          <div className="xp-logo-container">
            <div className="xp-logo-top">Macrohard</div>
            <div className="xp-logo-windows">
              <span className="xp-logo-win">Panes</span>
              <span className="xp-logo-xp">dX</span>
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
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username || 'guest'}`}
                  alt={username}
                  className="xp-avatar-large"
                />
                <div className="xp-username-large">
                  {isRegistering ? 'Nieuwe gebruiker' : (selectedUser === 'manual' ? 'Inloggen' : username)}
                </div>
              </div>

              
              {isRegistering && (
                <div className="xp-input-row">
                  <label className="xp-label">Gebruikersnaam:</label>
                  <input
                    type="text"
                    className="xp-text-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoFocus
                    placeholder="Nieuwe gebruikersnaam"
                  />
                </div>
              )}

              {selectedUser === 'manual' && (
                <div className="xp-input-row">
                  <label className="xp-label">Gebruikersnaam:</label>
                  <input
                    type="text"
                    className="xp-text-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoFocus
                    placeholder="Bestaande gebruikersnaam"
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
                    autoFocus={!isRegistering}
                  />
                  <button 
                    className="xp-arrow-button" 
                    onClick={isRegistering ? handleRegister : handleLogin}
                    autoFocus={password && !isRegistering} // Focus op pijl als wachtwoord al ingevuld is
                  >
                    <span className="xp-arrow">→</span>
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
                <div className="xp-error-message">
                  {error}
                </div>
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
                  <span className="xp-hint-icon">ℹ️</span>
                  <span>Geen gebruikers gevonden. Maak een nieuwe gebruiker aan.</span>
                </div>
              )}
              
              {availableUsers.map((user) => (
                <div
                  key={user}
                  className="xp-user-item"
                  onClick={() => handleUserClick(user)}
                >
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user}`}
                    alt={user}
                    className="xp-avatar"
                  />
                  <span className="xp-username">{user}</span>
                  <button
                    className="xp-delete-user"
                    onClick={(e) => handleDeleteUser(user, e)}
                    title="Verwijder uit lijst"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {availableUsers.length >= 5 && (
                <div className="xp-max-users-hint">
                  <span className="xp-hint-icon">⚠️</span>
                  <span>Maximum aantal gebruikers bereikt. Verwijder een gebruiker om een nieuwe toe te voegen.</span>
                </div>
              )}

              <div
                className="xp-user-item xp-separator-item"
              >
                <div className="xp-separator-line"></div>
              </div>

              <div
                className={`xp-user-item xp-special-item ${availableUsers.length >= 5 ? 'xp-disabled' : ''}`}
                onClick={() => {
                  if (availableUsers.length >= 5) return;
                  setSelectedUser('manual');
                  setUsername('');
                  setPassword('');
                  setIsRegistering(false);
                }}
                title={availableUsers.length >= 5 ? 'Maximum aantal gebruikers bereikt' : ''}
              >
                <div className="xp-avatar xp-guest-avatar">
                  <span className="xp-guest-icon">🔑</span>
                </div>
                <span className="xp-username">Andere gebruiker</span>
              </div>

              <div
                className={`xp-user-item xp-special-item ${availableUsers.length >= 5 ? 'xp-disabled' : ''}`}
                onClick={() => {
                  if (availableUsers.length >= 5) return;
                  setIsRegistering(true);
                  setSelectedUser('register');
                  setUsername('');
                  setPassword('');
                }}
                title={availableUsers.length >= 5 ? 'Maximum aantal gebruikers bereikt' : ''}
              >
                <div className="xp-avatar xp-guest-avatar">
                  <span className="xp-guest-icon">➕</span>
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
                setUsername('');
                setPassword('');
                setError('');
              }}
            >
              ← Terug naar gebruikersselectie
            </button>
          )}
        
        </div>
        <div className="xp-bottom-right">
          <button className="xp-shutdown-button">
            <span className="xp-shutdown-icon">⏻</span>
            Computer uitschakelen
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;