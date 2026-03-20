import React from 'react';
import { act, render } from '@testing-library/react';
import { useTaskbarManager } from './useTaskbarManager';

let latest = null;

function Harness(props) {
  latest = useTaskbarManager(props);
  return null;
}

describe('useTaskbarManager', () => {
  test('restores minimized normal pane on taskbar click', () => {
    let panesState = {
      contacts: { isOpen: true, isMinimized: true }
    };
    let conversationsState = {};
    let gamesState = {};

    const setPanes = jest.fn((updater) => {
      panesState = typeof updater === 'function' ? updater(panesState) : updater;
    });
    const setConversations = jest.fn((updater) => {
      conversationsState = typeof updater === 'function' ? updater(conversationsState) : updater;
    });
    const setGames = jest.fn((updater) => {
      gamesState = typeof updater === 'function' ? updater(gamesState) : updater;
    });
    const setActivePane = jest.fn();

    const activePaneRef = { current: null };

    render(
      <Harness
        setConversations={setConversations}
        setGames={setGames}
        setPanes={setPanes}
        setActivePane={setActivePane}
        activePaneRef={activePaneRef}
      />
    );

    act(() => {
      latest.handleTaskbarClick('contacts');
    });

    expect(setPanes).toHaveBeenCalled();
    expect(setActivePane).toHaveBeenCalledWith('contacts');
    expect(panesState.contacts.isMinimized).toBe(false);
  });

  test('clicking an active taskbar tab clears focus without minimizing the pane', () => {
    let panesState = {
      contacts: { isOpen: true, isMinimized: false }
    };
    let conversationsState = {};
    let gamesState = {};

    const setPanes = jest.fn((updater) => {
      panesState = typeof updater === 'function' ? updater(panesState) : updater;
    });
    const setConversations = jest.fn((updater) => {
      conversationsState = typeof updater === 'function' ? updater(conversationsState) : updater;
    });
    const setGames = jest.fn((updater) => {
      gamesState = typeof updater === 'function' ? updater(gamesState) : updater;
    });
    const setActivePane = jest.fn();

    const activePaneRef = { current: 'contacts' };

    render(
      <Harness
        setConversations={setConversations}
        setGames={setGames}
        setPanes={setPanes}
        setActivePane={setActivePane}
        activePaneRef={activePaneRef}
      />
    );

    act(() => {
      latest.handleTaskbarClick('contacts');
    });

    expect(setPanes).toHaveBeenCalled();
    expect(setActivePane).toHaveBeenCalledWith(null);
    expect(panesState.contacts.isMinimized).toBe(false);
  });

  test('restores minimized game pane on taskbar click', () => {
    let panesState = {};
    let conversationsState = {};
    let gamesState = {
      game_alice_tictactoe: { isOpen: true, isMinimized: true }
    };

    const setPanes = jest.fn((updater) => {
      panesState = typeof updater === 'function' ? updater(panesState) : updater;
    });
    const setConversations = jest.fn((updater) => {
      conversationsState = typeof updater === 'function' ? updater(conversationsState) : updater;
    });
    const setGames = jest.fn((updater) => {
      gamesState = typeof updater === 'function' ? updater(gamesState) : updater;
    });
    const setActivePane = jest.fn();

    const activePaneRef = { current: null };

    render(
      <Harness
        setConversations={setConversations}
        setGames={setGames}
        setPanes={setPanes}
        setActivePane={setActivePane}
        activePaneRef={activePaneRef}
      />
    );

    act(() => {
      latest.handleTaskbarClick('game_alice_tictactoe');
    });

    expect(setGames).toHaveBeenCalled();
    expect(setActivePane).toHaveBeenCalledWith('game_alice_tictactoe');
    expect(gamesState.game_alice_tictactoe.isMinimized).toBe(false);
  });
});
