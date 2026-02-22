import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import LoginScreen from './LoginScreen';

const mockConfirm = jest.fn().mockResolvedValue(true);
const mockSetMyAvatar = jest.fn();
const mockSetMyDisplayName = jest.fn();

jest.mock('../../contexts/DialogContext', () => ({
  useDialog: () => ({
    confirm: mockConfirm
  })
}));

jest.mock('../../contexts/AvatarContext', () => ({
  useAvatar: () => ({
    setMyAvatar: mockSetMyAvatar,
    setMyDisplayName: mockSetMyDisplayName
  })
}));

jest.mock('../../gun', () => ({
  gun: {
    get: jest.fn(() => ({
      get: jest.fn(() => ({
        once: jest.fn()
      }))
    }))
  },
  user: {
    auth: jest.fn(),
    create: jest.fn(),
    is: null
  }
}));

describe('LoginScreen session notice banner', () => {
  const notice = {
    id: 'conflict_1',
    type: 'conflict',
    title: 'Sessie beëindigd',
    message: 'Je bent aangemeld op een andere locatie. Deze sessie is afgesloten.',
    createdAt: 1
  };

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('shows session conflict banner and handles dismiss', () => {
    const onDismiss = jest.fn();
    render(
      <LoginScreen
        onLoginSuccess={jest.fn()}
        fadeIn={false}
        onShutdown={jest.fn()}
        sessionNotice={notice}
        onDismissSessionNotice={onDismiss}
      />
    );

    expect(screen.getByText('Sessie beëindigd')).toBeTruthy();
    expect(screen.getByText('Je bent aangemeld op een andere locatie. Deze sessie is afgesloten.')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Sessie melding sluiten'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('login screen remains interactive while banner is visible', () => {
    const { container } = render(
      <LoginScreen
        onLoginSuccess={jest.fn()}
        fadeIn={false}
        onShutdown={jest.fn()}
        sessionNotice={notice}
        onDismissSessionNotice={jest.fn()}
      />
    );

    fireEvent.click(screen.getByText('Andere gebruiker'));

    const emailInput = screen.getByPlaceholderText('naam@coldmail.com');
    const passwordInput = container.querySelector('input[type="password"]');

    expect(emailInput).toBeTruthy();
    expect(passwordInput).toBeTruthy();

    fireEvent.change(passwordInput, { target: { value: 'secret123' } });
    expect(passwordInput.value).toBe('secret123');
    expect(screen.getByText('Sessie beëindigd')).toBeTruthy();
  });
});
