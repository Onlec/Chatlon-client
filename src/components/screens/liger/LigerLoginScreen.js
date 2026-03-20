import React, { useEffect, useState } from 'react';
import useLoginScreenController, { COLDMAIL_DOMAINS } from '../useLoginScreenController';

function LigerLoginScreen({
  onLoginSuccess,
  fadeIn,
  onShutdown,
  sessionNotice = null,
  onDismissSessionNotice
}) {
  const [time, setTime] = useState('');
  const {
    availableUsers,
    confirmPassword,
    displayLabel,
    emailDomain,
    emailLocal,
    error,
    fullEmail,
    getLocalAvatar,
    handleDeleteUser,
    handleKeyPress,
    handleLogin,
    handleRegister,
    handleUserClick,
    isMaxUsersReached,
    isRegistering,
    localName,
    password,
    rememberMe,
    resetSelection,
    selectManualUser,
    selectRegistration,
    selectedUser,
    setConfirmPassword,
    setEmailDomain,
    setEmailLocal,
    setLocalName,
    setPassword,
    setRememberMe,
    showPasswordPanel
  } = useLoginScreenController({ onLoginSuccess });

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const intervalId = setInterval(update, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="liger-login" data-testid="liger-login-screen">
      {fadeIn && <div className="login-fade-overlay" />}

      <div className="liger-login-menubar">
        <span className="liger-login-menubar__brand">Liger OS</span>
        <span className="liger-login-menubar__clock">{time}</span>
      </div>

      <div className="liger-login-main">
        <div className="liger-login-brand">
          <div className="liger-login-brand__mark" aria-hidden="true">🐯</div>
          <div className="liger-login-brand__wordmark">Liger</div>
          <div className="liger-login-brand__subtitle">Fruitware Liger 10.4</div>
        </div>

        <div className="liger-login-panel">
          {sessionNotice?.type === 'conflict' && (
            <div className="liger-session-banner" role="status" aria-live="polite">
              <div>
                <div className="liger-session-banner__title">{sessionNotice.title}</div>
                <div className="liger-session-banner__message">{sessionNotice.message}</div>
              </div>
              {onDismissSessionNotice && (
                <button
                  type="button"
                  className="liger-session-banner__close"
                  onClick={onDismissSessionNotice}
                  aria-label="Sessie melding sluiten"
                >
                  &times;
                </button>
              )}
            </div>
          )}

          {showPasswordPanel ? (
            <div className="liger-login-form">
              <button type="button" className="liger-login-back" onClick={resetSelection}>
                &larr; Terug
              </button>

              <div className="liger-login-selected">
                <img
                  src={getLocalAvatar(selectedUser === 'manual' ? 'guest' : selectedUser)}
                  alt="avatar"
                  className="liger-login-selected__avatar"
                />
                <div className="liger-login-selected__name">{displayLabel}</div>
              </div>

              {isRegistering && (
                <>
                  <label className="liger-login-field">
                    <span>E-mailadres</span>
                    <div className="liger-login-field__row">
                      <input
                        type="text"
                        value={emailLocal}
                        onChange={(event) => setEmailLocal(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                        onKeyDown={handleKeyPress}
                        autoFocus
                        placeholder="gebruikersnaam"
                        maxLength={40}
                        autoComplete="off"
                        name="register-email-local"
                        data-lpignore="true"
                      />
                      <select value={emailDomain} onChange={(event) => setEmailDomain(event.target.value)}>
                        {COLDMAIL_DOMAINS.map((domain) => (
                          <option key={domain} value={domain}>{domain}</option>
                        ))}
                      </select>
                    </div>
                    <small className={`liger-login-preview${!emailLocal ? ' liger-login-preview--empty' : ''}`}>
                      {emailLocal ? fullEmail : emailDomain}
                    </small>
                  </label>

                  <label className="liger-login-field">
                    <span>Naam</span>
                    <input
                      type="text"
                      value={localName}
                      onChange={(event) => setLocalName(event.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Weergavenaam"
                      maxLength={30}
                      autoComplete="given-name"
                    />
                  </label>
                </>
              )}

              {selectedUser === 'manual' && (
                <label className="liger-login-field">
                  <span>E-mailadres</span>
                  <input
                    type="text"
                    value={emailLocal}
                    onChange={(event) => setEmailLocal(event.target.value)}
                    onKeyDown={handleKeyPress}
                    autoFocus
                    autoComplete="username"
                  />
                </label>
              )}

              <label className="liger-login-field">
                <span>Wachtwoord</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={handleKeyPress}
                  autoFocus={!isRegistering && selectedUser !== 'manual'}
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                />
              </label>

              {isRegistering && (
                <label className="liger-login-field">
                  <span>Bevestig wachtwoord</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    onKeyDown={handleKeyPress}
                    autoComplete="new-password"
                  />
                </label>
              )}

              {!isRegistering && (
                <label className="liger-login-checkbox">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>Mijn wachtwoord onthouden</span>
                </label>
              )}

              {error && <div className="liger-login-error">{error}</div>}

              <div className="liger-login-actions">
                <button
                  type="button"
                  className="liger-login-submit"
                  onClick={isRegistering ? handleRegister : handleLogin}
                >
                  {isRegistering ? 'Account aanmaken' : 'Inloggen'}
                </button>
              </div>
            </div>
          ) : (
            <div className="liger-user-chooser">
              {availableUsers.length === 0 && (
                <div className="liger-user-chooser__empty">
                  Geen gebruikers gevonden. Maak een nieuwe gebruiker aan om te beginnen.
                </div>
              )}

              <div className="liger-user-chooser__row">
                {availableUsers.map((userObj) => (
                  <div
                    key={userObj.email}
                    className="liger-user-tile"
                    onClick={() => handleUserClick(userObj)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        void handleUserClick(userObj);
                      }
                    }}
                  >
                    <button
                      type="button"
                      className="liger-user-tile__delete"
                      onClick={(event) => handleDeleteUser(userObj, event)}
                      title="Verwijder uit lijst"
                    >
                      &#10005;
                    </button>
                    <img
                      src={getLocalAvatar(userObj.email)}
                      alt={userObj.localName}
                      className="liger-user-tile__avatar"
                    />
                    <span className="liger-user-tile__name">{userObj.localName}</span>
                  </div>
                ))}

                <div
                  className={`liger-user-tile liger-user-tile--special${isMaxUsersReached ? ' liger-user-tile--disabled' : ''}`}
                  onClick={selectManualUser}
                  role="button"
                  tabIndex={0}
                >
                  <div className="liger-user-tile__avatar liger-user-tile__avatar--placeholder">🔐</div>
                  <span className="liger-user-tile__name">Andere gebruiker</span>
                </div>

                <div
                  className={`liger-user-tile liger-user-tile--special${isMaxUsersReached ? ' liger-user-tile--disabled' : ''}`}
                  onClick={selectRegistration}
                  role="button"
                  tabIndex={0}
                >
                  <div className="liger-user-tile__avatar liger-user-tile__avatar--placeholder">＋</div>
                  <span className="liger-user-tile__name">Nieuwe gebruiker</span>
                </div>
              </div>

              {isMaxUsersReached && (
                <div className="liger-user-chooser__hint">
                  Maximum aantal gebruikers bereikt. Verwijder eerst een gebruiker.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="liger-login-footer">
        <button type="button" className="liger-login-footer__shutdown" onClick={onShutdown}>
          <span aria-hidden="true">{'\u23FB'}</span>
          <span>Schakel uit</span>
        </button>
      </div>
    </div>
  );
}

export default LigerLoginScreen;
