import React from 'react';
import { act, render } from '@testing-library/react';
import { useContextMenuManager } from './useContextMenuManager';

let latest = null;

function Harness(props) {
  latest = useContextMenuManager(props);
  return null;
}

describe('useContextMenuManager', () => {
  test('opens and closes menu with callbacks and Escape', () => {
    const onMenuOpen = jest.fn();
    const onMenuClose = jest.fn();

    render(
      <Harness enabled onMenuOpen={onMenuOpen} onMenuClose={onMenuClose} />
    );

    act(() => {
      latest.openMenu({ x: 10, y: 20, actions: [] });
    });

    expect(latest.menuState).not.toBeNull();
    expect(onMenuOpen).toHaveBeenCalledTimes(1);

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(latest.menuState).toBeNull();
    expect(onMenuClose).toHaveBeenCalledTimes(1);
  });
});
