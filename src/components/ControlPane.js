import React, { useState, useEffect } from 'react';
import { useScanlinesPreference } from '../contexts/ScanlinesContext';
import { useSettings } from '../contexts/SettingsContext';
import { useDialog } from '../contexts/DialogContext';
import { user } from '../gun';
import WallpaperPickerModal from './modals/WallpaperPickerModal';
import ChangePasswordModal from './modals/ChangePasswordModal';
import { clearAllCaches } from '../utils/cacheCleanup';
import { log } from '../utils/debug';

const PRESET_AVATARS = ['cat.jpg', 'egg.jpg', 'crab.jpg', 'blocks.jpg', 'pug.jpg'];

function ControlPane() {
  const { scanlinesEnabled, toggleScanlines } = useScanlinesPreference();
  const { settings, updateSetting, resetSettings } = useSettings();
  const { confirm, alert } = useDialog();
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Account state (lokale naam + avatar uit localStorage)
  const currentEmail = user.is?.alias || '';
  const [localName, setLocalName] = useState('');
  const [localAvatar, setLocalAvatar] = useState('');
  const [accountSaved, setAccountSaved] = useState(false);

  useEffect(() => {
    if (!currentEmail) return;
    try {
      const users = JSON.parse(localStorage.getItem('chatlon_users') || '[]');
      const userObj = users.find(u => (typeof u === 'string' ? u : u.email) === currentEmail);
      if (userObj && typeof userObj === 'object') {
        setLocalName(userObj.localName || currentEmail);
        setLocalAvatar(userObj.localAvatar || '');
      } else {
        setLocalName(currentEmail);
      }
    } catch { /* ignore */ }
  }, [currentEmail]);

  const saveAccountSettings = () => {
    try {
      const users = JSON.parse(localStorage.getItem('chatlon_users') || '[]');
      const normalized = users.map(u => typeof u === 'string' ? { email: u, localName: u } : u);
      const idx = normalized.findIndex(u => u.email === currentEmail);
      if (idx >= 0) {
        normalized[idx] = { ...normalized[idx], localName: localName.trim() || currentEmail, localAvatar };
      } else {
        normalized.push({ email: currentEmail, localName: localName.trim() || currentEmail, localAvatar });
      }
      localStorage.setItem('chatlon_users', JSON.stringify(normalized));
      setAccountSaved(true);
      setTimeout(() => setAccountSaved(false), 3000);
    } catch (e) {
      log('[ControlPane] Error saving account:', e);
    }
  };

  const {
    autoReconnect,
    superpeerEnabled,
    debugMode,
    fontSize,
    colorScheme,
    systemSounds
  } = settings;
  
  const categories =  [
    {
      id: 'account',
      icon: '👤',
      title: 'Gebruikersaccount',
      description: 'Lokale naam en avatar wijzigen',
      customRender: true
    },
    {
      id: 'appearance',
      icon: '🎨',
      title: 'Uiterlijk en thema\'s',
      description: 'Wijzig het uiterlijk van uw bureaublad',
      settings: [
        { 
          id: 'scanlines', 
          label: 'CRT Scanlines Effect', 
          type: 'checkbox',
          value: scanlinesEnabled,
          onChange: toggleScanlines,
          description: 'Retro CRT monitor effect met scanlines'
        },
        { 
          id: 'fontSize', 
          label: 'Lettergrootte', 
          type: 'select',
          options: ['klein', 'normaal', 'groot'],
          value: fontSize,
          description: 'Grootte van tekst in vensters'
        },
        { 
          id: 'colorScheme', 
          label: 'Kleurenschema', 
          type: 'select',
          options: ['blauw', 'olijfgroen', 'zilver', 'royale', 'zune', 'royale-noir', 'energy-blue', 'klassiek'],
          value: colorScheme,
          description: 'Kleur van vensters en knoppen'
        },
        {
          id: 'changeWallpaper',
          label: 'Bureaublad achtergrond',
          type: 'button',
          description: 'Kies een achtergrondafbeelding of kleur voor uw bureaublad'
        }
      ]
    },
    {
      id: 'sounds',
      icon: '🔊',
      title: 'Geluiden',
      description: 'Systeemgeluiden en meldingen beheren',
      settings: [
        {
          id: 'systemSounds',
          label: 'Systeemgeluiden afspelen',
          type: 'checkbox',
          value: systemSounds !== false,
          description: 'Speel geluiden af bij aanmelden, afmelden en meldingen'
        }
      ]
    },
    {
      id: 'network',
      icon: '🌐',
      title: 'Netwerk en verbindingen',
      description: 'Beheer netwerkverbindingen en relay-instellingen',
      settings: [
        { 
          id: 'autoReconnect', 
          label: 'Automatisch opnieuw verbinden', 
          type: 'checkbox',
          value: autoReconnect,
          description: 'Automatisch verbinden bij connectieverlies'
        },
        { 
          id: 'superpeerEnabled', 
          label: 'Superpeer modus', 
          type: 'checkbox',
          value: superpeerEnabled,
          description: 'Help andere gebruikers door als relay te fungeren'
        }
      ]
    },
    {
      id: 'advanced',
      icon: '⚙️',
      title: 'Geavanceerd',
      description: 'Geavanceerde opties voor ervaren gebruikers',
      settings: [
        { 
          id: 'debugMode', 
          label: 'Debug modus', 
          type: 'checkbox',
          value: debugMode,
          description: 'Toon technische informatie in console'
        },
        { 
          id: 'cleanupCache', 
          label: 'Cache wissen', 
          type: 'button',
          description: 'Verwijder opgeslagen tijdelijke gegevens'
        },
        { 
          id: 'resetSettings', 
          label: 'Instellingen resetten', 
          type: 'button',
          action: resetSettings, // ✅ Voeg action property toe
          description: 'Zet alle instellingen terug naar standaardwaarden'
        }
      ]
    }
  ];

  const selectedCategory = selectedCategoryId ? categories.find(c => c.id === selectedCategoryId) : null;

  const handleSettingChange = (categoryId, settingId, value) => {
    log('[ControlPane] Setting change:', settingId, value);
    updateSetting(settingId, value);
    
    // Check settings after update
    setTimeout(() => {
      const updated = localStorage.getItem('chatlon_settings');
      log('[ControlPane] Settings after update:', JSON.parse(updated));
    }, 100);
  };

  return (
    <div className="control-panel">
      {!selectedCategory ? (
        // Category View (zoals XP Control Panel home)
        <div className="cp-home">
          <div className="cp-header">
            <h2>Selecteer een categorie</h2>
          </div>
          
          <div className="cp-categories">
            {categories.map(category => (
              <div 
                key={category.id}
                className="cp-category"
                onClick={() => setSelectedCategoryId(category.id)}
              >
                <div className="cp-category-icon">{category.icon}</div>
                <div className="cp-category-content">
                  <div className="cp-category-title">{category.title}</div>
                  <div className="cp-category-description">{category.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Settings View
        <div className="cp-settings">
          <div className="cp-breadcrumb">
            <span 
              className="cp-back-link"
              onClick={() => setSelectedCategoryId(null)}
            >
              ← Terug naar Configuratiescherm
            </span>
          </div>

          <div className="cp-settings-header">
            <span className="cp-settings-icon">{selectedCategory.icon}</span>
            <h2>{selectedCategory.title}</h2>
          </div>

          {selectedCategory.customRender && selectedCategory.id === 'account' && (
            <div className="cp-settings-list">
              <div className="cp-setting-item">
                <div className="cp-setting-main">
                  <div className="cp-select-row">
                    <label>Lokale naam</label>
                    <input
                      type="text"
                      className="cp-text-input"
                      value={localName}
                      onChange={(e) => setLocalName(e.target.value)}
                      placeholder="Uw naam"
                    />
                  </div>
                </div>
                <div className="cp-setting-description">
                  De naam die wordt getoond in het startmenu en aanmeldscherm
                </div>
              </div>

              <div className="cp-setting-item">
                <div className="cp-setting-main">
                  <label className="cp-avatar-label">Lokale avatar</label>
                  <div className="cp-avatar-grid">
                    {PRESET_AVATARS.map(av => (
                      <img
                        key={av}
                        src={`/avatars/${av}`}
                        alt={av}
                        className={`cp-avatar-option ${localAvatar === av ? 'cp-avatar-option--selected' : ''}`}
                        onClick={() => setLocalAvatar(av)}
                      />
                    ))}
                  </div>
                </div>
                <div className="cp-setting-description">
                  Kies een avatar voor uw lokaal account (login scherm)
                </div>
              </div>

              <div className="cp-setting-item">
                <div className="cp-setting-main">
                  <button className="dx-button cp-action-button" onClick={saveAccountSettings}>
                    Opslaan
                  </button>
                  {accountSaved && <span className="cp-save-indicator">✓ Opgeslagen</span>}
                </div>
              </div>

              <div className="cp-setting-item">
                <div className="cp-setting-main">
                  <div className="cp-button-row">
                    <label>Wachtwoord</label>
                    <button className="dx-button cp-action-button" onClick={() => setShowPasswordModal(true)}>
                      Wachtwoord wijzigen...
                    </button>
                  </div>
                </div>
                <div className="cp-setting-description">
                  Wijzig het wachtwoord van uw Chatlon account
                </div>
              </div>
            </div>
          )}

          {showPasswordModal && (
            <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
          )}

          {!selectedCategory.customRender && <div className="cp-settings-list">
            {selectedCategory.settings.map(setting => (
              <div key={setting.id} className="cp-setting-item">
                <div className="cp-setting-main">
                  {setting.type === 'checkbox' && (
                    <label className="cp-checkbox-label">
                      <input
                        type="checkbox"
                        checked={setting.value}
                        onChange={(e) => {
                          if (setting.onChange) {
                            setting.onChange();
                          } else {
                            handleSettingChange(selectedCategory.id, setting.id, e.target.checked);
                          }
                        }}
                      />
                      <span>{setting.label}</span>
                    </label>
                  )}

                  {setting.type === 'select' && (
                    <div className="cp-select-row">
                      <label>{setting.label}</label>
                      <select
                        value={setting.value}
                        onChange={(e) => handleSettingChange(selectedCategory.id, setting.id, e.target.value)}
                        className="cp-select"
                      >
                        {setting.options.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {setting.type === 'button' && (
                    <div className="cp-button-row">
                      <label>{setting.label}</label>
                      <button 
                        className="dx-button cp-action-button"
                        onClick={async () => {
                          if (setting.id === 'changeWallpaper') {
                            setShowWallpaperModal(true);
                          } else if (setting.id === 'resetSettings') {
                            if (await confirm('Weet je zeker dat je alle instellingen wilt resetten?', 'Instellingen resetten')) {
                              resetSettings();
                              setShowResetSuccess(true);
                              setTimeout(() => setShowResetSuccess(false), 3000);
                            }
                          } else if (setting.id === 'cleanupCache') {
                            if (await confirm('Dit wist tijdelijke gegevens en kan de app sneller maken.\n\nDoorgaan?', 'Cache wissen')) {
                              const cleared = clearAllCaches();
                              await alert(`✓ ${cleared} cache(s) gewist.\n\nVoor beste resultaat, ververs de pagina.`, 'Cache gewist');
                            }
                          } else if (setting.action) {
                            setting.action();
                          }
                        }}
                      >
                        {setting.label}
                      </button>
                    </div>
                  )}
                </div>

                {setting.description && (
                  <div className="cp-setting-description">
                    {setting.description}
                  </div>
                )}
              </div>
            ))}
          </div>}
        </div>
      )}
      {showResetSuccess && (
        <div className="cp-success-message">
          ✓ Instellingen zijn gereset naar standaardwaarden
        </div>
      )}
      {showWallpaperModal && (
        <WallpaperPickerModal onClose={() => setShowWallpaperModal(false)} />
      )}
    </div>
  );
}

export default ControlPane;
