import React, { useState } from 'react';
import { gun, user } from './gun';

function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!username || !password) {
      setError('Vul alle velden in');
      return;
    }

    user.auth(username, password, (ack) => {
      if (ack.err) {
        setError('Onjuiste gebruikersnaam of wachtwoord');
      } else {
        setError('');
        onLoginSuccess(username);
      }
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

    user.create(username, password, (ack) => {
      if (ack.err) {
        setError('Gebruikersnaam bestaat al of is ongeldig');
      } else {
        // Auto-login na registratie
        user.auth(username, password, (authAck) => {
          if (!authAck.err) {
            setError('');
            onLoginSuccess(username);
          }
        });
      }
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      isRegistering ? handleRegister() : handleLogin();
    }
  };

  return (
    <div className="login-screen">
      <div className="login-content">
        <div className="login-logo">
          <div className="dx-logo">
            <span className="dx-logo-text">Macrohard</span>
            <span className="dx-logo-panes">Panes</span>
            <span className="dx-logo-xp">dX</span>
          </div>
        </div>

        <div className="login-box">
          <div className="login-header">
            <p className="login-instruction">
              {isRegistering ? 'Maak een nieuw account aan' : 'Typ uw gebruikersnaam om te beginnen'}
            </p>
          </div>

          <div className="login-form">
            <div className="login-field">
              <label>Gebruikersnaam:</label>
              <input 
                type="text" 
                className="dx-login-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                autoFocus
              />
            </div>

            <div className="login-field">
              <label>Wachtwoord:</label>
              <input 
                type="password" 
                className="dx-login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>

            {error && <div className="login-error">{error}</div>}

            <div className="login-actions">
              <button 
                className="dx-button login-btn" 
                onClick={isRegistering ? handleRegister : handleLogin}
              >
                {isRegistering ? 'Account aanmaken' : 'Aanmelden'}
              </button>
            </div>

            <div className="login-footer">
              <a 
                href="#" 
                onClick={(e) => { 
                  e.preventDefault(); 
                  setIsRegistering(!isRegistering); 
                  setError('');
                }}
              >
                {isRegistering ? 'Al een account? Aanmelden' : 'Nieuw account aanmaken'}
              </a>
            </div>
          </div>
        </div>

        <div className="login-bottom">
          <div className="login-options">
            <button className="login-option-btn">Afsluiten</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;