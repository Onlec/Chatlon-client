import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import LigerMenuBar from './LigerMenuBar';

function buildProps(overrides = {}) {
  return {
    activeAppName: 'Chatlon Messenger',
    menus: [
      {
        label: 'Archief',
        items: [
          { label: 'Sluiten', action: 'closeActive' },
          { label: 'Afmelden', action: 'logoff' },
          { label: 'Afsluiten', action: 'shutdown' },
          { label: 'Niet beschikbaar', disabled: true }
        ]
      },
      {
        label: 'Venster',
        items: [
          {
            label: 'Alice - Gesprek',
            icon: '\u{1F4AC}',
            isActive: false,
            onSelect: jest.fn()
          }
        ]
      }
    ],
    onMenuAction: jest.fn(),
    currentUser: 'alice@coldmail.com',
    relayStatus: { anyOnline: true },
    isSuperpeer: false,
    connectedSuperpeers: 0,
    currentStatusOption: { label: 'Online', color: '#00aa00' },
    onOpenContacts: jest.fn(),
    onLogoff: jest.fn(),
    onShutdown: jest.fn(),
    ...overrides
  };
}

describe('LigerMenuBar', () => {
  test('dispatches app menu actions', () => {
    const props = buildProps();
    render(<LigerMenuBar {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Archief' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sluiten' }));
    fireEvent.click(screen.getByRole('button', { name: 'Archief' }));
    fireEvent.click(screen.getByRole('button', { name: 'Afmelden' }));
    fireEvent.click(screen.getByRole('button', { name: 'Archief' }));
    fireEvent.click(screen.getByRole('button', { name: 'Afsluiten' }));

    expect(props.onMenuAction).toHaveBeenNthCalledWith(1, 'closeActive');
    expect(props.onMenuAction).toHaveBeenNthCalledWith(2, 'logoff');
    expect(props.onMenuAction).toHaveBeenNthCalledWith(3, 'shutdown');
  });

  test('does not invoke disabled menu items', () => {
    const props = buildProps();
    render(<LigerMenuBar {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Archief' }));
    fireEvent.click(screen.getByRole('button', { name: 'Niet beschikbaar' }));

    expect(props.onMenuAction).not.toHaveBeenCalled();
  });

  test('selects window items through the generic menu API', () => {
    const props = buildProps();
    render(<LigerMenuBar {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Venster' }));
    fireEvent.click(screen.getByRole('button', { name: 'Alice - Gesprek' }));

    expect(props.menus[1].items[0].onSelect).toHaveBeenCalledTimes(1);
  });

  test('opens the system menu and exposes launcher actions', () => {
    const props = buildProps();
    render(<LigerMenuBar {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Liger-menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chatlon openen' }));

    expect(props.onOpenContacts).toHaveBeenCalledTimes(1);
  });
});
