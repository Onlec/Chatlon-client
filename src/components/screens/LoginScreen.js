import React from 'react';
import useLoginScreenController, { COLDMAIL_DOMAINS } from './useLoginScreenController';

function LoginScreen({ onLoginSuccess, fadeIn, onShutdown, sessionNotice = null, onDismissSessionNotice }) {
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

  return (
    <div className="xp-login">
      {fadeIn && <div className="login-fade-overlay" />}
      <div className="xp-top-bar" />

      <div className="xp-main">
        <div className="xp-left">
          <div className="xp-brand-layout xp-login-brand-layout">
            <div className="xp-brand-left">
              <span className="xp-brand-microsoft">Macrohard</span>
              <span className="xp-brand-windows">Panes<span className="xp-brand-xp">dX</span></span>
            </div>
            <div className="xp-brand-right">
              <div className="xp-boot-logo">
                <div className="xp-logo-stripe xp-stripe-green" />
                <div className="xp-logo-stripe xp-stripe-blue" />
                <div className="xp-logo-stripe xp-stripe-red" />
              </div>
            </div>
          </div>
          <div className="xp-login-instruction">Klik op uw gebruikersnaam om te beginnen...</div>
        </div>

        <div className="xp-divider" />

        <div className="xp-right">
          <div className="xp-right-content">
            {sessionNotice?.type === 'conflict' && (
              <div className="xp-session-banner" role="status" aria-live="polite">
                <div className="xp-session-banner-text">
                  <div className="xp-session-banner-title">{sessionNotice.title}</div>
                  <div className="xp-session-banner-message">{sessionNotice.message}</div>
                </div>
                {onDismissSessionNotice && (
                  <button
                    type="button"
                    className="xp-session-banner-close"
                    onClick={onDismissSessionNotice}
                    aria-label="Sessie melding sluiten"
                  >
                    &times;
                  </button>
                )}
              </div>
            )}

            {showPasswordPanel ? (
              <div className="xp-password-panel">
                <div className="xp-user-selected">
                  <img
                    src={getLocalAvatar(selectedUser === 'manual' ? 'guest' : selectedUser)}
                    alt="avatar"
                    className="xp-avatar-large"
                  />
                  <div className="xp-username-large">{displayLabel}</div>
                </div>

                {isRegistering && (
                  <>
                    <div className="xp-input-row">
                      <label className="xp-label">E-mailadres:</label>
                      <div className="xp-password-input-group">
                        <div className="xp-email-input-group">
                          <input
                            type="text"
                            className="xp-text-input xp-email-local"
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
                          <select
                            className="xp-email-domain"
                            value={emailDomain}
                            onChange={(event) => setEmailDomain(event.target.value)}
                          >
                            {COLDMAIL_DOMAINS.map((domain) => (
                              <option key={domain} value={domain}>{domain}</option>
                            ))}
                          </select>
                        </div>
                        <span className="xp-arrow-spacer" aria-hidden="true" />
                      </div>
                      <div className={`xp-full-email-preview${!emailLocal ? ' xp-full-email-preview--empty' : ''}`}>
                        {emailLocal ? fullEmail : emailDomain}
                      </div>
                    </div>

                    <div className="xp-input-row">
                      <label className="xp-label">Naam:</label>
                      <div className="xp-password-input-group">
                        <input
                          type="text"
                          className="xp-text-input"
                          value={localName}
                          onChange={(event) => setLocalName(event.target.value)}
                          onKeyDown={handleKeyPress}
                          placeholder="Weergavenaam (bijv. Bobby)"
                          maxLength={30}
                          autoComplete="given-name"
                        />
                        <span className="xp-arrow-spacer" aria-hidden="true" />
                      </div>
                    </div>
                  </>
                )}

                {selectedUser === 'manual' && (
                  <div className="xp-input-row">
                    <label className="xp-label">E-mailadres:</label>
                    <div className="xp-password-input-group">
                      <input
                        type="text"
                        className="xp-text-input"
                        value={emailLocal}
                        onChange={(event) => setEmailLocal(event.target.value)}
                        onKeyDown={handleKeyPress}
                        autoFocus
                        autoComplete="username"
                      />
                      <span className="xp-arrow-spacer" aria-hidden="true" />
                    </div>
                  </div>
                )}

                <div className="xp-input-row">
                  <label className="xp-label">Typ uw wachtwoord:</label>
                  <div className="xp-password-input-group">
                    <input
                      type="password"
                      className="xp-text-input"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onKeyDown={handleKeyPress}
                      autoFocus={!isRegistering && selectedUser !== 'manual'}
                      autoComplete={isRegistering ? 'new-password' : 'current-password'}
                    />
                    {!isRegistering ? (
                      <button type="button" className="xp-arrow-button" onClick={handleLogin}>
                        <span className="xp-arrow">&rarr;</span>
                      </button>
                    ) : (
                      <span className="xp-arrow-spacer" aria-hidden="true" />
                    )}
                  </div>
                </div>

                {isRegistering && (
                  <div className="xp-input-row">
                    <label className="xp-label">Bevestig wachtwoord:</label>
                    <div className="xp-password-input-group">
                      <input
                        type="password"
                        className="xp-text-input"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        onKeyDown={handleKeyPress}
                        autoComplete="new-password"
                      />
                      <button type="button" className="xp-arrow-button" onClick={handleRegister}>
                        <span className="xp-arrow">&rarr;</span>
                      </button>
                    </div>
                  </div>
                )}

                {!isRegistering && (
                  <div className="xp-checkbox-row">
                    <label className="xp-checkbox-label">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(event) => setRememberMe(event.target.checked)}
                      />
                      <span>Mijn wachtwoord onthouden</span>
                    </label>
                  </div>
                )}

                {error && <div className="xp-error-message">{error}</div>}

                <div className="xp-hint-text">
                  Tip: Druk op Enter nadat u uw wachtwoord hebt getypt
                </div>
              </div>
            ) : (
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
                      type="button"
                      className="xp-delete-user"
                      onClick={(event) => handleDeleteUser(userObj, event)}
                      title="Verwijder uit lijst"
                    >
                      &#10005;
                    </button>
                  </div>
                ))}

                {isMaxUsersReached && (
                  <div className="xp-max-users-hint">
                    <span className="xp-hint-icon">&#9888;&#65039;</span>
                    <span>Maximum aantal gebruikers bereikt. Verwijder een gebruiker om een nieuwe toe te voegen.</span>
                  </div>
                )}

                <div className="xp-user-item xp-separator-item">
                  <div className="xp-separator-line" />
                </div>

                <div
                  className={`xp-user-item xp-special-item ${isMaxUsersReached ? 'xp-disabled' : ''}`}
                  onClick={selectManualUser}
                >
                  <div className="xp-avatar xp-guest-avatar">
                    <span className="xp-guest-icon">&#128273;</span>
                  </div>
                  <span className="xp-username">Andere gebruiker</span>
                </div>

                <div
                  className={`xp-user-item xp-special-item ${isMaxUsersReached ? 'xp-disabled' : ''}`}
                  onClick={selectRegistration}
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
      </div>

      <div className="xp-bottom-bar">
        <div className="xp-bottom-left">
          {showPasswordPanel && (
            <button type="button" className="xp-back-link" onClick={resetSelection}>
              &larr; Terug naar gebruikersselectie
            </button>
          )}
        </div>
        <div className="xp-bottom-right">
          <button type="button" className="xp-shutdown-button" onClick={onShutdown}>
            <span className="xp-shutdown-icon">&#9211;</span>
            Computer uitschakelen
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
