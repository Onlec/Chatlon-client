import React from 'react';
import { render } from '@testing-library/react';
import Taskbar from './Taskbar';

jest.mock('./Systray', () => () => <div data-testid="systray" />);

function buildProps(overrides = {}) {
  return {
    isStartOpen: false,
    onToggleStartMenu: jest.fn(),
    onStartButtonContextMenu: jest.fn(),
    onTaskbarContextMenu: jest.fn(),
    paneOrder: [],
    unreadChats: new Set(['conv_alice']),
    conversations: {
      conv_alice: { isOpen: false },
    },
    games: {},
    activePane: null,
    onTaskbarClick: jest.fn(),
    onTabContextMenu: jest.fn(),
    panes: {},
    paneConfig: {},
    getDisplayName: (name) => name,
    systrayProps: {},
    ...overrides,
  };
}

describe('Taskbar', () => {
  test('keeps unread chat tabs rendered with the unread state class', () => {
    const { container } = render(<Taskbar {...buildProps()} />);

    const unreadTab = container.querySelector('.taskbar-tab.taskbar-tab--unread');

    expect(unreadTab).not.toBeNull();
    expect(unreadTab?.textContent).toContain('alice');
  });
});
