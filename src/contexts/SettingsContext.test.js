import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DEFAULT_LUNA_CUSTOM_SEED } from '../utils/lunaCustomTheme';
import { SettingsProvider, useSettings } from './SettingsContext';
import { readUserPrefOnce, writeUserPref } from '../utils/userPrefsGun';

jest.mock('../utils/userPrefsGun', () => ({
  readUserPrefOnce: jest.fn(),
  writeUserPref: jest.fn(() => Promise.resolve()),
  PREF_KEYS: {
    SETTINGS: 'settings',
  },
}));

function SettingsProbe() {
  const {
    settings,
    updateSetting,
    setAppearanceVariant,
  } = useSettings();

  return (
    <div>
      <div data-testid="current-theme">{settings.colorScheme}</div>
      <div data-testid="current-seed">{settings.customLunaTheme.seed}</div>
      <div data-testid="system-sounds">{String(settings.systemSounds)}</div>
      <div data-testid="dx-theme">{settings.appearanceByOS.dx.colorScheme}</div>
      <div data-testid="liger-theme">{settings.appearanceByOS.liger.colorScheme}</div>
      <button type="button" onClick={() => setAppearanceVariant('dx')}>dx</button>
      <button type="button" onClick={() => setAppearanceVariant('liger')}>liger</button>
      <button type="button" onClick={() => updateSetting('colorScheme', 'royale')}>set-theme</button>
      <button type="button" onClick={() => updateSetting('systemSounds', false)}>mute</button>
    </div>
  );
}

describe('SettingsContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    writeUserPref.mockResolvedValue(undefined);
  });

  test('hydrates older settings payloads into both OS appearance slots', async () => {
    readUserPrefOnce.mockResolvedValue({
      colorScheme: 'luna-custom',
    });

    render(
      <SettingsProvider>
        <SettingsProbe />
      </SettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('current-theme')).toHaveTextContent('luna-custom');
      expect(screen.getByTestId('current-seed')).toHaveTextContent(DEFAULT_LUNA_CUSTOM_SEED);
      expect(screen.getByTestId('dx-theme')).toHaveTextContent('luna-custom');
      expect(screen.getByTestId('liger-theme')).toHaveTextContent('luna-custom');
    });

    await waitFor(() => {
      expect(writeUserPref).toHaveBeenCalledWith(
        'guest',
        'settings',
        expect.objectContaining({
          colorScheme: 'luna-custom',
          customLunaTheme: { seed: DEFAULT_LUNA_CUSTOM_SEED },
          appearanceByOS: expect.objectContaining({
            dx: expect.objectContaining({ colorScheme: 'luna-custom' }),
            liger: expect.objectContaining({ colorScheme: 'luna-custom' }),
          }),
        })
      );
    });
  });

  test('keeps dX and Liger appearance settings separate while shared settings stay global', async () => {
    readUserPrefOnce.mockResolvedValue({
      appearanceByOS: {
        dx: {
          colorScheme: 'zilver',
          customLunaTheme: { seed: '#111111' },
        },
        liger: {
          colorScheme: 'klassiek',
          customLunaTheme: { seed: '#222222' },
        },
      },
      systemSounds: true,
    });

    render(
      <SettingsProvider>
        <SettingsProbe />
      </SettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dx-theme')).toHaveTextContent('zilver');
      expect(screen.getByTestId('liger-theme')).toHaveTextContent('klassiek');
      expect(screen.getByTestId('current-theme')).toHaveTextContent('zilver');
    });

    fireEvent.click(screen.getByRole('button', { name: 'liger' }));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('klassiek');

    fireEvent.click(screen.getByRole('button', { name: 'set-theme' }));
    expect(screen.getByTestId('liger-theme')).toHaveTextContent('royale');
    expect(screen.getByTestId('dx-theme')).toHaveTextContent('zilver');

    fireEvent.click(screen.getByRole('button', { name: 'mute' }));
    expect(screen.getByTestId('system-sounds')).toHaveTextContent('false');

    fireEvent.click(screen.getByRole('button', { name: 'dx' }));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('zilver');
    expect(screen.getByTestId('system-sounds')).toHaveTextContent('false');
  });
});
