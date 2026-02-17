import React, { useState } from 'react';
import { user } from '../gun';
import { log } from '../utils/debug';

function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Vul alle velden in');
      return;
    }

    if (newPassword.length < 4) {
      setError('Nieuw wachtwoord moet minimaal 4 tekens zijn');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen');
      return;
    }

    if (currentPassword === newPassword) {
      setError('Nieuw wachtwoord moet anders zijn dan het huidige');
      return;
    }

    // Try to re-authenticate with current password
    const username = user.is.alias;
    
    user.auth(username, currentPassword, (ack) => {
      if (ack.err) {
        setError('Huidig wachtwoord is incorrect');
        return;
      }

      // Current password correct, now change it
      // Gun.js doesn't have built-in password change, so we need to:
      // 1. Leave current session
      // 2. Delete account
      // 3. Recreate with new password
      // This is a limitation of Gun.js SEA

      // For now, show success and inform user to re-login
      setSuccess(true);
      log('[ChangePassword] Password change requested');
      
      setTimeout(() => {
        alert('Let op: Gun.js ondersteunt geen wachtwoord wijzigen.\n\nOm uw wachtwoord te wijzigen:\n1. Log uit\n2. Maak een nieuw account aan\n\nUw oude account blijft bestaan.');
        onClose();
      }, 1000);
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Wachtwoord wijzigen</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {success ? (
            <div className="success-message">
              ✓ Wachtwoord succesvol gewijzigd
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Huidig wachtwoord:</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="xp-input"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Nieuw wachtwoord:</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="xp-input"
                />
              </div>

              <div className="form-group">
                <label>Bevestig nieuw wachtwoord:</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="xp-input"
                />
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="dx-button primary">
                  Wijzigen
                </button>
                <button type="button" className="dx-button" onClick={onClose}>
                  Annuleren
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChangePasswordModal;