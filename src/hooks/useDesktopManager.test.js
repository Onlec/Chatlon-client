import React from 'react';
import { act, render } from '@testing-library/react';
import { useDesktopManager } from './useDesktopManager';

let latest = null;

function Harness(props) {
  latest = useDesktopManager(props);
  return null;
}

describe('useDesktopManager', () => {
  test('builds shortcuts from pane config and opens selected shortcut', () => {
    const onOpenPane = jest.fn();
    const paneConfig = {
      contacts: { desktopLabel: 'Contacts', desktopIcon: 'favicon.ico' },
      notepad: { desktopLabel: 'Kladblok', desktopIcon: '\u{1F4DD}' }
    };

    render(<Harness paneConfig={paneConfig} onOpenPane={onOpenPane} />);

    expect(latest.shortcuts).toHaveLength(2);
    expect(latest.shortcuts[0]).toEqual(expect.objectContaining({
      id: 'contacts',
      paneName: 'contacts',
      label: 'Contacts'
    }));

    act(() => {
      latest.openShortcut('notepad');
    });
    expect(onOpenPane).toHaveBeenCalledWith('notepad');
  });
});
