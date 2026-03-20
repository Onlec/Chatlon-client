import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ControlPane from './ControlPane';
import { DEFAULT_LUNA_CUSTOM_SEED, LUNA_CUSTOM_THEME_ID } from '../utils/lunaCustomTheme';
import { useScanlinesPreference } from '../contexts/ScanlinesContext';
import { useSettings } from '../contexts/SettingsContext';
import { useDialog } from '../contexts/DialogContext';

jest.mock('../contexts/ScanlinesContext', () => ({
  useScanlinesPreference: jest.fn(),
}));

jest.mock('../contexts/SettingsContext', () => ({
  useSettings: jest.fn(),
}));

jest.mock('../contexts/DialogContext', () => ({
  useDialog: jest.fn(),
}));

jest.mock('../gun', () => ({
  user: { is: null },
}));

jest.mock('./modals/WallpaperPickerModal', () => () => <div>WallpaperPickerModal</div>);
jest.mock('./modals/ChangePasswordModal', () => () => <div>ChangePasswordModal</div>);
jest.mock('../utils/cacheCleanup', () => ({
  clearAllCaches: jest.fn(() => 0),
}));
jest.mock('../utils/debug', () => ({
  log: jest.fn(),
}));

const mockUpdateSetting = jest.fn();
const mockResetSettings = jest.fn();

function buildSettings(overrides = {}) {
  return {
    autoReconnect: true,
    superpeerEnabled: false,
    debugMode: false,
    fontSize: 'normaal',
    colorScheme: 'blauw',
    systemSounds: true,
    customLunaTheme: { seed: '#112233' },
    ...overrides,
  };
}

function openAppearanceCategory() {
  const appearanceCard = screen.getByText(/Uiterlijk en thema/i).closest('.cp-category');
  fireEvent.click(appearanceCard);
}

describe('ControlPane', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useScanlinesPreference.mockReturnValue({
      scanlinesEnabled: false,
      toggleScanlines: jest.fn(),
    });
    useDialog.mockReturnValue({
      confirm: jest.fn(),
      alert: jest.fn(),
    });
  });

  test('shows luna custom in the theme list and renders the seed editor when active', () => {
    useSettings.mockReturnValue({
      settings: buildSettings({
        colorScheme: LUNA_CUSTOM_THEME_ID,
        customLunaTheme: { seed: '#112233' },
      }),
      updateSetting: mockUpdateSetting,
      resetSettings: mockResetSettings,
      appearanceVariant: 'dx',
    });

    render(<ControlPane />);
    openAppearanceCategory();

    const themeSelect = screen
      .getByText('Kleurenschema')
      .closest('.cp-select-row')
      .querySelector('select');

    expect(
      Array.from(themeSelect.options).map((option) => option.value)
    ).toContain(LUNA_CUSTOM_THEME_ID);
    expect(screen.getByLabelText('Luna Custom seedkleur')).toBeInTheDocument();
    expect(screen.getByLabelText('Luna Custom seed hex')).toHaveValue('#112233');

    fireEvent.change(screen.getByLabelText('Luna Custom seedkleur'), {
      target: { value: '#334455' },
    });
    expect(mockUpdateSetting).toHaveBeenCalledWith('customLunaTheme', { seed: '#334455' });

    fireEvent.change(screen.getByLabelText('Luna Custom seed hex'), {
      target: { value: '445566' },
    });
    expect(mockUpdateSetting).toHaveBeenCalledWith('customLunaTheme', { seed: '#445566' });

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(mockUpdateSetting).toHaveBeenLastCalledWith('customLunaTheme', {
      seed: DEFAULT_LUNA_CUSTOM_SEED,
    });
  });

  test('hides the luna seed editor for non-custom themes', () => {
    useSettings.mockReturnValue({
      settings: buildSettings({
        colorScheme: 'blauw',
      }),
      updateSetting: mockUpdateSetting,
      resetSettings: mockResetSettings,
      appearanceVariant: 'dx',
    });

    render(<ControlPane />);
    openAppearanceCategory();

    expect(screen.queryByLabelText('Luna Custom seedkleur')).not.toBeInTheDocument();
  });
});
