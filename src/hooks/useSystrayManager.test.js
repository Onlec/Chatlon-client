import React from 'react';
import { act, render } from '@testing-library/react';
import { useSystrayManager } from './useSystrayManager';

let latest = null;

function Harness(props) {
  latest = useSystrayManager(props);
  return null;
}

describe('useSystrayManager', () => {
  test('opens/closes and dispatches actions while closing menu', () => {
    const onStatusChange = jest.fn();
    const onOpenContacts = jest.fn();
    const onSignOut = jest.fn();
    const onCloseMessenger = jest.fn();

    render(
      <Harness
        userStatus="online"
        onStatusChange={onStatusChange}
        onOpenContacts={onOpenContacts}
        onSignOut={onSignOut}
        onCloseMessenger={onCloseMessenger}
      />
    );

    expect(latest.showSystrayMenu).toBe(false);

    act(() => {
      latest.onToggleMenu({ stopPropagation: () => {} });
    });
    expect(latest.showSystrayMenu).toBe(true);

    act(() => {
      latest.onStatusChange('busy');
    });
    expect(onStatusChange).toHaveBeenCalledWith('busy');
    expect(latest.showSystrayMenu).toBe(false);

    act(() => {
      latest.onToggleMenu({ stopPropagation: () => {} });
      latest.onOpenContacts();
    });
    expect(onOpenContacts).toHaveBeenCalledTimes(1);
    expect(latest.showSystrayMenu).toBe(false);

    act(() => {
      latest.onToggleMenu({ stopPropagation: () => {} });
      latest.onSignOut();
    });
    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(latest.showSystrayMenu).toBe(false);

    act(() => {
      latest.onToggleMenu({ stopPropagation: () => {} });
      latest.onCloseMessenger();
    });
    expect(onCloseMessenger).toHaveBeenCalledTimes(1);
    expect(latest.showSystrayMenu).toBe(false);
  });
});
