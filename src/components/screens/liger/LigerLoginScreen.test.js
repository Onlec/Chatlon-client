import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('../../../contexts/DialogContext', () => ({
  useDialog: () => ({
    confirm: jest.fn().mockResolvedValue(true)
  })
}));

jest.mock('../../../contexts/AvatarContext', () => ({
  useAvatar: () => ({
    setMyAvatar: jest.fn(),
    setMyDisplayName: jest.fn()
  })
}));

jest.mock('../../../gun', () => {
  const mockGunOnce = jest.fn();
  return {
    gun: {
      get: jest.fn(() => ({
        get: jest.fn(() => ({
          once: mockGunOnce
        }))
      }))
    },
    user: {
      auth: jest.fn(),
      create: jest.fn(),
      is: null
    },
    __mockGunOnce: mockGunOnce
  };
});

jest.mock('../../../utils/storageScope', () => {
  const mockReadScopedJSON = jest.fn(() => ({}));
  return {
    readScopedJSON: (...args) => mockReadScopedJSON(...args),
    writeScopedJSON: jest.fn(),
    removeScoped: jest.fn(),
    resolveUserKey: jest.fn((value) => value),
    __mockReadScopedJSON: mockReadScopedJSON
  };
});

jest.mock('../../../utils/userPrefsGun', () => ({
  readUserPrefOnce: jest.fn().mockResolvedValue(false),
  writeUserPref: jest.fn(),
  PREF_KEYS: {
    REMEMBER_ME: 'remember-me'
  }
}));

jest.mock('../../../utils/sessionOwnership', () => ({
  isForeignActiveSession: jest.fn(() => false)
}));

const LigerLoginScreen = require('./LigerLoginScreen').default;
const gunModule = require('../../../gun');
const storageScopeModule = require('../../../utils/storageScope');

describe('LigerLoginScreen', () => {
  const notice = {
    id: 'conflict_1',
    type: 'conflict',
    title: 'Sessie beëindigd',
    message: 'Je bent aangemeld op een andere locatie. Deze sessie is afgesloten.',
    createdAt: 1
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    gunModule.gun.get.mockImplementation(() => ({
      get: jest.fn(() => ({
        once: gunModule.__mockGunOnce
      }))
    }));
    gunModule.__mockGunOnce.mockImplementation((callback) => callback(null));
    gunModule.user.auth.mockImplementation((email, password, callback) => callback({}));
    gunModule.user.create.mockImplementation((email, password, callback) => callback({}));
    storageScopeModule.__mockReadScopedJSON.mockReturnValue({});
    sessionStorage.setItem('chatlon_tab_client_id', 'tab-1');
  });

  test('shows the session conflict banner and allows dismissing it', () => {
    const onDismiss = jest.fn();
    render(
      <LigerLoginScreen
        onLoginSuccess={jest.fn()}
        fadeIn={false}
        onShutdown={jest.fn()}
        sessionNotice={notice}
        onDismissSessionNotice={onDismiss}
      />
    );

    expect(screen.getByText('Sessie beëindigd')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Sessie melding sluiten'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('calls the shutdown callback from the footer control', () => {
    const onShutdown = jest.fn();
    render(
      <LigerLoginScreen
        onLoginSuccess={jest.fn()}
        fadeIn={false}
        onShutdown={onShutdown}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /schakel uit/i }));
    expect(onShutdown).toHaveBeenCalledTimes(1);
  });

  test('reuses the saved-user login flow and calls onLoginSuccess with the email', async () => {
    localStorage.setItem('chatlon_users', JSON.stringify([
      { email: 'alice@coldmail.com', localName: 'Alice' }
    ]));
    storageScopeModule.__mockReadScopedJSON.mockReturnValue({});

    const onLoginSuccess = jest.fn();
    render(
      <LigerLoginScreen
        onLoginSuccess={onLoginSuccess}
        fadeIn={false}
        onShutdown={jest.fn()}
      />
    );

    fireEvent.click(screen.getByText('Alice'));
    fireEvent.change(screen.getByLabelText('Wachtwoord'), {
      target: { value: 'secret' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Inloggen' }));

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalledWith('alice@coldmail.com');
    });
  });
});
