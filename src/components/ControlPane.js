import React, { useState, useEffect } from 'react';
import { useScanlinesPreference } from '../contexts/ScanlinesContext';
import { useBezel } from '../contexts/BezelContext';
import { useSettings } from '../contexts/SettingsContext';
import { useDialog } from '../contexts/DialogContext';
import { user } from '../gun';
import WallpaperPickerModal from './modals/WallpaperPickerModal';
import ChangePasswordModal from './modals/ChangePasswordModal';
import { clearAllCaches } from '../utils/cacheCleanup';
import { log } from '../utils/debug';
import {
  DEFAULT_LUNA_CUSTOM_SEED,
  isValidHexColor,
  LUNA_CUSTOM_THEME_ID,
  normalizeCustomLunaTheme,
  normalizeHexColor
} from '../utils/lunaCustomTheme';

const PRESET_AVATARS = ['cat.jpg', 'egg.jpg', 'crab.jpg', 'blocks.jpg', 'pug.jpg'];

function matchesQuery(values, query) {
  if (!query) return true;
  return values.some((value) => String(value || '').toLowerCase().includes(query));
}

function ControlPane() {
  const { scanlinesEnabled, toggleScanlines } = useScanlinesPreference();
  const { bezel, updateBezel } = useBezel();
  const { settings, updateSetting, resetSettings, appearanceVariant } = useSettings();
  const { confirm, alert } = useDialog();
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentEmail = user.is?.alias || '';
  const [localName, setLocalName] = useState('');
  const [localAvatar, setLocalAvatar] = useState('');
  const [accountSaved, setAccountSaved] = useState(false);

  useEffect(() => {
    if (!currentEmail) return;
    try {
      const users = JSON.parse(localStorage.getItem('chatlon_users') || '[]');
      const userObj = users.find((entry) => (typeof entry === 'string' ? entry : entry.email) === currentEmail);
      if (userObj && typeof userObj === 'object') {
        setLocalName(userObj.localName || currentEmail);
        setLocalAvatar(userObj.localAvatar || '');
      } else {
        setLocalName(currentEmail);
      }
    } catch {
      // Ignore local account parsing failures.
    }
  }, [currentEmail]);

  const saveAccountSettings = () => {
    try {
      const users = JSON.parse(localStorage.getItem('chatlon_users') || '[]');
      const normalized = users.map((entry) => (typeof entry === 'string' ? { email: entry, localName: entry } : entry));
      const index = normalized.findIndex((entry) => entry.email === currentEmail);

      if (index >= 0) {
        normalized[index] = {
          ...normalized[index],
          localName: localName.trim() || currentEmail,
          localAvatar
        };
      } else {
        normalized.push({ email: currentEmail, localName: localName.trim() || currentEmail, localAvatar });
      }

      localStorage.setItem('chatlon_users', JSON.stringify(normalized));
      setAccountSaved(true);
      setTimeout(() => setAccountSaved(false), 3000);
    } catch (error) {
      log('[ControlPane] Error saving account:', error);
    }
  };

  const {
    autoReconnect,
    superpeerEnabled,
    debugMode,
    fontSize,
    colorScheme,
    systemSounds,
    customLunaTheme
  } = settings;
  const normalizedCustomLunaTheme = normalizeCustomLunaTheme(customLunaTheme);
  const [customSeedInput, setCustomSeedInput] = useState(normalizedCustomLunaTheme.seed);

  useEffect(() => {
    setCustomSeedInput(normalizedCustomLunaTheme.seed);
  }, [normalizedCustomLunaTheme.seed]);

  const commitCustomLunaSeed = (rawValue, fallbackValue = normalizedCustomLunaTheme.seed) => {
    const nextSeed = normalizeHexColor(rawValue, fallbackValue);
    setCustomSeedInput(nextSeed);
    updateSetting('customLunaTheme', { seed: nextSeed });
  };

  const handleCustomLunaSeedInputChange = (event) => {
    const nextValue = event.target.value;
    setCustomSeedInput(nextValue);
    if (!isValidHexColor(nextValue)) return;
    updateSetting('customLunaTheme', {
      seed: normalizeHexColor(nextValue, normalizedCustomLunaTheme.seed),
    });
  };

  const getOptionLabel = (settingId, option) => {
    if (settingId === 'colorScheme' && option === LUNA_CUSTOM_THEME_ID) {
      return 'Luna Custom';
    }
    return option;
  };

  const isLigerAppearance = appearanceVariant === 'liger';
  const categories = [
    {
      id: 'account',
      icon: '👤',
      title: 'Gebruikersaccount',
      description: 'Lokale naam en avatar wijzigen',
      section: 'Persoonlijk',
      customRender: true
    },
    {
      id: 'appearance',
      icon: '🎨',
      title: 'Uiterlijk en thema\'s',
      description: 'Wijzig het uiterlijk van uw bureaublad',
      section: 'Weergave en media',
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
          id: 'bezelEnabled',
          label: 'Monitor bezel weergeven',
          type: 'checkbox',
          value: bezel.bezelEnabled,
          onChange: () => updateBezel('bezelEnabled', !bezel.bezelEnabled),
          description: 'Simuleert een 4:3 CRT-monitor rondom het bureaublad'
        },
        {
          id: 'crtCurve',
          label: 'Schermcurvatuur',
          type: 'checkbox',
          value: bezel.crtCurve,
          onChange: () => updateBezel('crtCurve', !bezel.crtCurve),
          description: 'Lichte bolling van het CRT-scherm'
        },
        {
          id: 'crtScanlines',
          label: 'Bezel scanlines',
          type: 'checkbox',
          value: bezel.crtScanlines,
          onChange: () => updateBezel('crtScanlines', !bezel.crtScanlines),
          description: 'Extra subtiele scanlines binnen de bezel'
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
          options: ['blauw', 'olijfgroen', 'zilver', 'royale', 'zune', 'royale-noir', 'energy-blue', 'klassiek', LUNA_CUSTOM_THEME_ID],
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
      section: 'Weergave en media',
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
      section: 'Systeem',
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
      section: 'Systeem',
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
          action: resetSettings,
          description: 'Zet alle instellingen terug naar standaardwaarden'
        }
      ]
    }
  ];

  const selectedCategory = selectedCategoryId
    ? categories.find((category) => category.id === selectedCategoryId)
    : null;
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredCategories = categories.filter((category) => matchesQuery(
    [
      category.section,
      category.title,
      category.description,
      ...(category.settings || []).flatMap((setting) => [setting.label, setting.description, setting.id])
    ],
    normalizedSearchQuery
  ));
  const categoriesBySection = filteredCategories.reduce((groups, category) => {
    const nextGroups = groups;
    if (!nextGroups[category.section]) {
      nextGroups[category.section] = [];
    }
    nextGroups[category.section].push(category);
    return nextGroups;
  }, {});
  const visibleSettings = selectedCategory?.settings?.filter((setting) => matchesQuery(
    [setting.label, setting.description, setting.id],
    normalizedSearchQuery
  )) || [];
  const showThemeEditor = selectedCategory?.id === 'appearance'
    && colorScheme === LUNA_CUSTOM_THEME_ID
    && matchesQuery(
      ['luna custom', 'seedkleur', 'hex', 'kleurenschema', 'thema'],
      normalizedSearchQuery
    );

  const handleSettingChange = (categoryId, settingId, value) => {
    log('[ControlPane] Setting change:', categoryId, settingId, value);
    updateSetting(settingId, value);
  };

  const renderSearchControl = () => (
    <div className="cp-search">
      <span className="cp-search__icon" aria-hidden="true">{'\u2315'}</span>
      <input
        type="search"
        className="cp-search__input"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Zoek voorkeuren"
        aria-label="Zoek voorkeuren"
      />
    </div>
  );

  const renderCategoryCard = (category, variant = 'dx') => {
    if (variant === 'liger') {
      return (
        <button
          key={category.id}
          type="button"
          className="cp-category cp-category--liger"
          onClick={() => setSelectedCategoryId(category.id)}
        >
          <div className="cp-category-icon cp-category-icon--liger">{category.icon}</div>
          <div className="cp-category-content">
            <div className="cp-category-title">{category.title}</div>
            <div className="cp-category-description">{category.description}</div>
          </div>
          <span className="cp-category-chevron" aria-hidden="true">{'\u203A'}</span>
        </button>
      );
    }

    return (
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
    );
  };

  const renderAccountSettings = () => (
    <div className={`cp-settings-list ${isLigerAppearance ? 'cp-settings-list--liger' : ''}`}>
      <div className="cp-setting-item">
        <div className="cp-setting-main">
          <div className="cp-select-row">
            <label>Lokale naam</label>
            <input
              type="text"
              className="cp-text-input"
              value={localName}
              onChange={(event) => setLocalName(event.target.value)}
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
            {PRESET_AVATARS.map((avatar) => (
              <img
                key={avatar}
                src={`/avatars/${avatar}`}
                alt={avatar}
                className={`cp-avatar-option ${localAvatar === avatar ? 'cp-avatar-option--selected' : ''}`}
                onClick={() => setLocalAvatar(avatar)}
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
  );

  const renderSettingsList = () => (
    <div className={`cp-settings-list ${isLigerAppearance ? 'cp-settings-list--liger' : ''}`}>
      {selectedCategory?.id === 'appearance' && (
        <div className="cp-setting-item cp-setting-item--intro">
          <div className="cp-setting-description">
            Deze thema-instellingen gelden voor {appearanceVariant === 'liger' ? 'Liger OS' : 'Panes dX'}.
          </div>
        </div>
      )}

      {visibleSettings.length === 0 && normalizedSearchQuery && (
        <div className="cp-empty-state cp-empty-state--settings">
          Geen voorkeuren gevonden binnen {selectedCategory?.title}.
        </div>
      )}

      {visibleSettings.map((setting) => (
        <div key={setting.id} className="cp-setting-item">
          <div className="cp-setting-main">
            {setting.type === 'checkbox' && (
              <label className="cp-checkbox-label">
                <input
                  type="checkbox"
                  checked={setting.value}
                  onChange={(event) => {
                    if (setting.onChange) {
                      setting.onChange();
                    } else {
                      handleSettingChange(selectedCategory.id, setting.id, event.target.checked);
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
                  onChange={(event) => handleSettingChange(selectedCategory.id, setting.id, event.target.value)}
                  className="cp-select"
                >
                  {setting.options.map((option) => (
                    <option key={option} value={option}>
                      {getOptionLabel(setting.id, option)}
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

      {showThemeEditor && (
        <div className="cp-setting-item cp-setting-item--theme-editor">
          <div className="cp-setting-main">
            <div className="cp-select-row cp-theme-custom-row">
              <label htmlFor="cp-luna-custom-seed-input">Luna seedkleur</label>
              <div className="cp-theme-custom-controls">
                <span
                  className="cp-theme-custom-swatch"
                  style={{ backgroundColor: normalizedCustomLunaTheme.seed }}
                  aria-hidden="true"
                />
                <input
                  id="cp-luna-custom-seed-picker"
                  aria-label="Luna Custom seedkleur"
                  className="cp-theme-color-input"
                  type="color"
                  value={normalizedCustomLunaTheme.seed}
                  onChange={(event) => commitCustomLunaSeed(event.target.value)}
                />
                <input
                  id="cp-luna-custom-seed-input"
                  aria-label="Luna Custom seed hex"
                  className="cp-text-input cp-theme-hex-input"
                  type="text"
                  inputMode="text"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={customSeedInput}
                  onChange={handleCustomLunaSeedInputChange}
                  onBlur={() => commitCustomLunaSeed(customSeedInput)}
                  placeholder={DEFAULT_LUNA_CUSTOM_SEED}
                />
                <button
                  type="button"
                  className="dx-button cp-action-button"
                  onClick={() => commitCustomLunaSeed(DEFAULT_LUNA_CUSTOM_SEED, DEFAULT_LUNA_CUSTOM_SEED)}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
          <div className="cp-setting-description">
            Kies een seedkleur voor het Luna Custom thema. Titelbalken, taakbalk, systray,
            contextmenu&apos;s en startmenu-oppervlakken worden hier automatisch van afgeleid.
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`control-panel ${isLigerAppearance ? 'control-panel--liger' : ''}`}
      data-appearance-variant={appearanceVariant}
    >
      {!selectedCategory ? (
        isLigerAppearance ? (
          <div className="cp-home cp-home--liger">
            <div className="cp-toolbar cp-toolbar--liger">
              <div className="cp-toolbar__copy">
                <span className="cp-toolbar__eyebrow">Liger</span>
                <h2>Systeemvoorkeuren</h2>
                <p>Beheer uiterlijk, account en systeemgedrag vanuit een Aqua-geinspireerde voorkeurenweergave.</p>
              </div>
              {renderSearchControl()}
            </div>

            {Object.entries(categoriesBySection).length > 0 ? (
              Object.entries(categoriesBySection).map(([section, sectionCategories]) => (
                <section key={section} className="cp-section cp-section--liger">
                  <div className="cp-section-heading">
                    <h3>{section}</h3>
                    <span>{sectionCategories.length} paneel{sectionCategories.length === 1 ? '' : 'en'}</span>
                  </div>
                  <div className="cp-categories cp-categories--liger">
                    {sectionCategories.map((category) => renderCategoryCard(category, 'liger'))}
                  </div>
                </section>
              ))
            ) : (
              <div className="cp-empty-state cp-empty-state--liger">
                Geen voorkeuren gevonden voor deze zoekopdracht.
              </div>
            )}
          </div>
        ) : (
          <div className="cp-home">
            <div className="cp-header">
              <h2>Selecteer een categorie</h2>
            </div>

            <div className="cp-categories">
              {categories.map((category) => renderCategoryCard(category))}
            </div>
          </div>
        )
      ) : (
        isLigerAppearance ? (
          <div className="cp-settings cp-settings--liger">
            <aside className="cp-sidebar">
              <button
                type="button"
                className="cp-sidebar__home"
                onClick={() => setSelectedCategoryId(null)}
              >
                Alle voorkeuren
              </button>
              <div className="cp-sidebar__list">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`cp-sidebar__item ${selectedCategoryId === category.id ? 'cp-sidebar__item--active' : ''}`}
                    onClick={() => setSelectedCategoryId(category.id)}
                  >
                    <span className="cp-sidebar__icon">{category.icon}</span>
                    <span className="cp-sidebar__label">{category.title}</span>
                  </button>
                ))}
              </div>
            </aside>

            <div className="cp-settings-panel">
              <div className="cp-settings-toolbar cp-settings-toolbar--liger">
                <div className="cp-settings-header cp-settings-header--liger">
                  <span className="cp-settings-icon">{selectedCategory.icon}</span>
                  <div className="cp-settings-heading">
                    <h2>{selectedCategory.title}</h2>
                    <p>{selectedCategory.description}</p>
                  </div>
                </div>
                {renderSearchControl()}
              </div>

              {selectedCategory.customRender && selectedCategory.id === 'account'
                ? renderAccountSettings()
                : renderSettingsList()}
            </div>
          </div>
        ) : (
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

            {selectedCategory.customRender && selectedCategory.id === 'account'
              ? renderAccountSettings()
              : renderSettingsList()}
          </div>
        )
      )}

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
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
