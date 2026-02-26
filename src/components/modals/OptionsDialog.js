import React, { useState, useEffect } from 'react';
import { user } from '../../gun';
import { useAvatar } from '../../contexts/AvatarContext';
import { useSettings } from '../../contexts/SettingsContext';
import { readUserPrefOnce, writeUserPref, PREF_KEYS } from '../../utils/userPrefsGun';
import AvatarPickerModal from './AvatarPickerModal';
import ChangePasswordModal from './ChangePasswordModal';
import ModalPane from './ModalPane';

const TABS = [
  { id: 'account', label: 'Account', icon: '\uD83D\uDC64' },
  { id: 'berichten', label: 'Berichten', icon: '\uD83D\uDCAC' },
  { id: 'geluiden', label: 'Geluiden', icon: '\uD83D\uDD14' },
  { id: 'muziek', label: 'Muziek', icon: '\uD83C\uDFB5' }
];

function OptionsDialog({ onClose }) {
  const [activeTab, setActiveTab] = useState('account');

  return (
    <ModalPane title="Opties" icon="⚙️" onClose={onClose} width="500px">
        <div className="options-body">
          <div className="options-sidebar">
            {TABS.map(tab => (
              <div
                key={tab.id}
                className={`options-sidebar-item ${activeTab === tab.id ? 'options-sidebar-item--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="options-sidebar-icon">{tab.icon}</span> {tab.label}
              </div>
            ))}
          </div>
          <div className="options-content">
            {activeTab === 'account' && <AccountTab />}
            {activeTab === 'berichten' && <BerichtenTab />}
            {activeTab === 'geluiden' && <GeluidenTab />}
            {activeTab === 'muziek' && <MuziekTab />}
          </div>
        </div>
        <div className="options-footer">
          <button className="dx-button" onClick={onClose}>OK</button>
          <button className="dx-button" onClick={onClose}>Annuleren</button>
        </div>
    </ModalPane>
  );
}

function AccountTab() {
  const { getAvatar, getDisplayName, setMyDisplayName } = useAvatar();
  const username = user.is?.alias || '';
  const [displayName, setDisplayName] = useState('');
  const [saved, setSaved] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const scopedUserKey = username || 'guest';
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const current = getDisplayName(username);
    // Als displayName gelijk is aan username, toon leeg veld
    setDisplayName(current === username ? '' : current);
  }, [username, getDisplayName]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const enabled = await readUserPrefOnce(scopedUserKey, PREF_KEYS.REMEMBER_ME, false);
        if (!cancelled) setRememberMe(Boolean(enabled));
      } catch {
        if (!cancelled) setRememberMe(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scopedUserKey]);

  const handleSaveDisplayName = () => {
    setMyDisplayName(displayName.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleRememberMe = (checked) => {
    setRememberMe(checked);
    void writeUserPref(scopedUserKey, PREF_KEYS.REMEMBER_ME, Boolean(checked));
  };

  return (
    <div>
      <h3 className="options-title">Account</h3>

      <div className="options-field">
        <label>Weergavenaam:</label>
        <div className="options-row">
          <input
            className="dx-input options-input-grow"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveDisplayName()}
            placeholder={username}
          />
          <button className="dx-button" onClick={handleSaveDisplayName}>Opslaan</button>
        </div>
        {saved && <div className="success-message options-save-hint">Opgeslagen!</div>}
      </div>

      <div className="options-field">
        <label>Profielfoto:</label>
        <div className="options-row options-row--avatar">
          <img
            src={getAvatar(username)}
            alt="avatar"
            className="options-avatar-preview"
          />
          <button className="dx-button" onClick={() => setShowAvatarModal(true)}>Wijzigen...</button>
        </div>
      </div>

      <div className="options-field">
        <button className="dx-button" onClick={() => setShowPasswordModal(true)}>Wachtwoord wijzigen...</button>
      </div>

      <div className="options-field">
        <label className="options-checkbox-row">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => handleRememberMe(e.target.checked)}
          />
          Onthoud mijn gegevens
        </label>
      </div>

      {showAvatarModal && <AvatarPickerModal onClose={() => setShowAvatarModal(false)} />}
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
}

function BerichtenTab() {
  const { settings, updateSetting } = useSettings();

  return (
    <div>
      <h3 className="options-title">Berichten</h3>

      <div className="options-field">
        <label className="options-checkbox-row">
          <input
            type="checkbox"
            checked={settings.saveHistory}
            onChange={(e) => updateSetting('saveHistory', e.target.checked)}
          />
          Gesprekgeschiedenis bewaren
        </label>
      </div>

      <div className="options-field">
        <label className="options-checkbox-row">
          <input
            type="checkbox"
            checked={settings.showTyping}
            onChange={(e) => updateSetting('showTyping', e.target.checked)}
          />
          Toon typing indicator
        </label>
      </div>

      <div className="options-field">
        <label className="options-checkbox-row">
          <input
            type="checkbox"
            checked={settings.emoticons}
            onChange={(e) => updateSetting('emoticons', e.target.checked)}
          />
          Emoticons inschakelen
        </label>
      </div>
    </div>
  );
}

function GeluidenTab() {
  const { settings, updateSetting } = useSettings();

  return (
    <div>
      <h3 className="options-title">Geluiden</h3>

      <div className="options-field">
        <label className="options-checkbox-row">
          <input
            type="checkbox"
            checked={settings.systemSounds}
            onChange={(e) => updateSetting('systemSounds', e.target.checked)}
          />
          Systeemgeluiden
        </label>
      </div>

      <div className="options-field">
        <label className="options-checkbox-row">
          <input
            type="checkbox"
            checked={settings.toastNotifications}
            onChange={(e) => updateSetting('toastNotifications', e.target.checked)}
          />
          Toast meldingen
        </label>
      </div>

      <div className="options-field">
        <label className="options-checkbox-row">
          <input
            type="checkbox"
            checked={settings.nudgeSound}
            onChange={(e) => updateSetting('nudgeSound', e.target.checked)}
          />
          Nudge geluid
        </label>
      </div>

      <div className="options-field">
        <label className="options-checkbox-row">
          <input
            type="checkbox"
            checked={settings.typingSound}
            onChange={(e) => updateSetting('typingSound', e.target.checked)}
          />
          Typing geluid
        </label>
      </div>
    </div>
  );
}

function MuziekTab() {
  return (
    <div>
      <h3 className="options-title">Muziek</h3>

      <div className="options-field">
        <label className="options-checkbox-row options-checkbox-row--muted">
          <input type="checkbox" disabled />
          Nu afspelend als persoonlijk bericht tonen
        </label>
      </div>

      <div className="options-field options-field--spaced">
        <button className="dx-button" disabled>Verbind met Spotify</button>
        <div className="options-help-text">
          Spotify-integratie komt binnenkort beschikbaar.
        </div>
      </div>
    </div>
  );
}

export default OptionsDialog;
