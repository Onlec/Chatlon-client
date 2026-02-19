import React, { useState } from 'react';
import { user } from '../../gun';
import { log } from '../../utils/debug';
import ModalPane from './ModalPane';

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

    const username = user.is.alias;

    // Gun SEA: auth met { change: newPassword } om het wachtwoord te wijzigen
    user.auth(username, currentPassword, (ack) => {
      if (ack.err) {
        setError('Huidig wachtwoord is incorrect');
        return;
      }

      user.auth(username, currentPassword, (ack2) => {
        if (ack2.err) {
          setError('Wachtwoord wijzigen mislukt: ' + ack2.err);
          return;
        }
        log('[ChangePassword] Password changed successfully');
        setSuccess(true);
        setTimeout(() => onClose(), 1500);
      }, { change: newPassword });
    });
  };

  return (
    <ModalPane title="Wachtwoord wijzigen" icon="🔑" onClose={onClose} width="360px">
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
    </ModalPane>
  );
}

export default ChangePasswordModal;