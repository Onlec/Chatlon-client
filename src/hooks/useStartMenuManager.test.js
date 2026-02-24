import React from 'react';
import { act, render } from '@testing-library/react';
import { useStartMenuManager } from './useStartMenuManager';

let latest = null;

function Harness() {
  latest = useStartMenuManager();
  return null;
}

describe('useStartMenuManager', () => {
  test('toggles and closes start menu', () => {
    render(<Harness />);
    expect(latest.isStartOpen).toBe(false);

    act(() => {
      latest.toggleStartMenu();
    });
    expect(latest.isStartOpen).toBe(true);

    act(() => {
      latest.closeStartMenu();
    });
    expect(latest.isStartOpen).toBe(false);
  });
});
