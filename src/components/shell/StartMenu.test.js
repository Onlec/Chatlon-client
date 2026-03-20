import React from 'react';
import { render, screen } from '@testing-library/react';
import StartMenu from './StartMenu';

function buildPaneConfig() {
  return {
    browser: {
      desktopIcon: 'browser.png',
      desktopLabel: 'Internet Adventurer',
      startMenu: { section: 'pinned', order: 10 },
    },
    contacts: {
      desktopIcon: 'contacts.png',
      desktopLabel: 'Chatlon Messenger',
      startMenu: { section: 'pinned', order: 30 },
    },
    notepad: {
      desktopIcon: 'notepad.png',
      desktopLabel: 'Kladblok',
      startMenu: { section: 'programs', order: 10 },
    },
    chat: {
      desktopIcon: 'chat.png',
      desktopLabel: 'Gesprek',
    },
  };
}

describe('StartMenu', () => {
  test('renders pinned and programs groups with divider and hides panes without startMenu metadata', () => {
    const { container } = render(
      <StartMenu
        isOpen
        paneConfig={buildPaneConfig()}
        currentUser="alice"
        getAvatar={() => '/avatar.png'}
        getLocalUserInfo={() => ({ localName: 'Alice', localAvatar: null })}
        onOpenPane={jest.fn()}
        onCloseStartMenu={jest.fn()}
        onLogoff={jest.fn()}
        onShutdown={jest.fn()}
      />
    );

    expect(screen.getByText('Internet Adventurer')).toBeInTheDocument();
    expect(screen.getByText('Chatlon Messenger')).toBeInTheDocument();
    expect(screen.getByText('Kladblok')).toBeInTheDocument();
    expect(screen.queryByText('Gesprek')).not.toBeInTheDocument();

    expect(container.querySelectorAll('.start-left-group')).toHaveLength(2);
    expect(container.querySelectorAll('.start-left-divider')).toHaveLength(1);
    expect(container.querySelectorAll('.start-right-divider')).toHaveLength(1);
  });
});
