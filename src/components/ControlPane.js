import React, { useState } from 'react';
import { useScanlinesPreference } from '../contexts/ScanlinesContext';
import { useSettings } from '../contexts/SettingsContext';

function ControlPane() {
  const { scanlinesEnabled, toggleScanlines } = useScanlinesPreference();
  const { settings, updateSetting, resetSettings } = useSettings();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showResetSuccess, setShowResetSuccess] = useState(false);

  const categories = [
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
          value: settings.fontSize,
          description: 'Grootte van tekst in vensters'
        },
        { 
          id: 'colorScheme', 
          label: 'Kleurenschema', 
          type: 'select',
          options: ['blauw', 'olijfgroen', 'zilver'],
          value: settings.colorScheme,
          description: 'Kleur van vensters en knoppen'
        }
      ]
    },
    {
      id: 'sounds',
      icon: '🔔',
      title: 'Geluid en meldingen',
      description: 'Wijzig geluids- en meldingsinstellingen',
      settings: [
        { 
          id: 'systemSounds', 
          label: 'Systeemgeluiden', 
          type: 'checkbox',
          value: settings.systemSounds,
          description: 'Geluiden afspelen bij gebeurtenissen'
        },
        { 
          id: 'toastNotifications', 
          label: 'Toast meldingen', 
          type: 'checkbox',
          value: settings.toastNotifications,
          description: 'Pop-up meldingen voor nieuwe berichten'
        },
        { 
          id: 'nudgeSound', 
          label: 'Nudge geluid', 
          type: 'checkbox',
          value: settings.nudgeSound,
          description: 'Geluid afspelen bij nudge'
        },
        { 
          id: 'typingSound', 
          label: 'Typing geluid', 
          type: 'checkbox',
          value: settings.typingSound,
          description: 'Toetsenbordgeluid tijdens typen'
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
          value: settings.autoReconnect,
          description: 'Automatisch verbinden bij connectieverlies'
        },
        { 
          id: 'superpeerEnabled', 
          label: 'Superpeer modus', 
          type: 'checkbox',
          value: settings.superpeerEnabled,
          description: 'Help andere gebruikers door als relay te fungeren'
        }
      ]
    },
    {
      id: 'accounts',
      icon: '👤',
      title: 'Gebruikersaccounts',
      description: 'Wijzig gebruikersaccount en privacy-instellingen',
      settings: [
        { 
          id: 'changePassword', 
          label: 'Wachtwoord wijzigen', 
          type: 'button',
          description: 'Wijzig uw accountwachtwoord'
        },
        { 
          id: 'rememberMe', 
          label: 'Onthoud mijn gegevens', 
          type: 'checkbox',
          value: true,
          description: 'Blijf aangemeld na afsluiten'
        }
      ]
    },
    {
      id: 'chat',
      icon: '💬',
      title: 'Chat en berichten',
      description: 'Configureer chat-gedrag en voorkeuren',
      settings: [
        { 
          id: 'saveHistory', 
          label: 'Gesprekgeschiedenis bewaren', 
          type: 'checkbox',
          value: settings.saveHistory,
          description: 'Berichten lokaal opslaan (MSN-authentiek: uit)'
        },
        { 
          id: 'showTyping', 
          label: 'Toon typing indicator', 
          type: 'checkbox',
          value: settings.showTyping,
          description: 'Laat anderen zien wanneer u typt'
        },
        { 
          id: 'emoticons', 
          label: 'Emoticons inschakelen', 
          type: 'checkbox',
          value: settings.emoticons,
          description: 'Vervang tekst door emoticons'
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
          value: settings.debugMode,
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

  const handleSettingChange = (categoryId, settingId, value) => {
    updateSetting(settingId, value);
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
                onClick={() => setSelectedCategory(category)}
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
              onClick={() => setSelectedCategory(null)}
            >
              ← Terug naar Configuratiescherm
            </span>
          </div>

          <div className="cp-settings-header">
            <span className="cp-settings-icon">{selectedCategory.icon}</span>
            <h2>{selectedCategory.title}</h2>
          </div>

          <div className="cp-settings-list">
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
                        onClick={() => {
                          if (setting.id === 'resetSettings') {
                            if (window.confirm('Weet je zeker dat je alle instellingen wilt resetten?')) {
                              resetSettings();
                              setShowResetSuccess(true);
                              setTimeout(() => setShowResetSuccess(false), 3000);
                            }
                          } else if (setting.action) {
                            setting.action();
                          } else {
                            // Placeholder voor andere buttons (changePassword, cleanupCache)
                            alert(`${setting.label} functionaliteit komt in Part C!`);
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
          </div>
        </div>
      )}
    {showResetSuccess && (
        <div className="cp-success-message">
          ✓ Instellingen zijn gereset naar standaardwaarden
        </div>
      )}
    </div>
  );
}

export default ControlPane;