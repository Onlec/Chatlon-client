import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import LigerMenuBar from './LigerMenuBar';

function buildProps(overrides = {}) {
  return {
    activeAppName: 'Chatlon Messenger',
    currentUser: 'alice@coldmail.com',
    relayStatus: { anyOnline: true },
    isSuperpeer: false,
    connectedSuperpeers: 0,
    currentStatusOption: { label: 'Online', color: '#00aa00' },
    windowItems: [
      {
        id: 'conv_alice',
        icon: '💬',
        label: 'Alice - Gesprek',
        isActive: false,
        isMinimized: true,
        onSelect: jest.fn()
      }
    ],
    onOpenContacts: jest.fn(),
    onLogoff: jest.fn(),
    onShutdown: jest.fn(),
    ...overrides
  };
}

describe('LigerMenuBar', () => {
  test('shows the window list and selects an item', () => {
    const props = buildProps();
    render(<LigerMenuBar {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Venster' }));
    fireEvent.click(screen.getByText('Alice - Gesprek'));

    expect(props.windowItems[0].onSelect).toHaveBeenCalledTimes(1);
  });

  test('opens the system menu and exposes launcher actions', () => {
    const props = buildProps();
    render(<LigerMenuBar {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Liger-menu' }));
    fireEvent.click(screen.getByText('Chatlon openen'));

    expect(props.onOpenContacts).toHaveBeenCalledTimes(1);
  });
});
