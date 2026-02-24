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

    const setPanes = jest.fn((updater) => {
      panesState = typeof updater === 'function' ? updater(panesState) : updater;
    });
    const setConversations = jest.fn((updater) => {
      conversationsState = typeof updater === 'function' ? updater(conversationsState) : updater;
    });
    const setActivePane = jest.fn();

    const activePaneRef = { current: null };
    const paneOrderRef = { current: ['contacts'] };
    const conversationsRef = { current: conversationsState };
    const panesRef = { current: panesState };

    render(
      <Harness
        setConversations={setConversations}
        setPanes={setPanes}
        setActivePane={setActivePane}
        paneOrderRef={paneOrderRef}
        conversationsRef={conversationsRef}
        panesRef={panesRef}
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
});
