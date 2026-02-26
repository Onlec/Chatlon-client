import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { useDesktopManager } from './useDesktopManager';
import { readUserPrefOnce, writeUserPref, PREF_KEYS } from '../utils/userPrefsGun';

jest.mock('../utils/userPrefsGun', () => ({
  readUserPrefOnce: jest.fn(),
  writeUserPref: jest.fn(() => Promise.resolve({ ok: true })),
  PREF_KEYS: {
    DESKTOP_SHORTCUTS: 'desktopShortcuts'
  }
}));

let latest = null;

function Harness(props) {
  latest = useDesktopManager(props);
  return null;
}

describe('useDesktopManager', () => {
  const paneConfig = {
    contacts: { desktopLabel: 'Contacts', desktopIcon: 'favicon.ico' },
    notepad: { desktopLabel: 'Kladblok', desktopIcon: '\u{1F4DD}' },
    calculator: { desktopLabel: 'Rekenmachine', desktopIcon: '\u{1F522}' }
  };

  let prefStore;

  beforeEach(() => {
    prefStore = {};
    readUserPrefOnce.mockImplementation((userKey, key, fallback) => {
      if (key !== PREF_KEYS.DESKTOP_SHORTCUTS) return Promise.resolve(fallback);
      return Promise.resolve(prefStore[userKey] || fallback);
    });
    writeUserPref.mockImplementation((userKey, key, value) => {
      if (key === PREF_KEYS.DESKTOP_SHORTCUTS) {
        prefStore[userKey] = value;
      }
      return Promise.resolve({ ok: true });
    });
    latest = null;
  });

  test('builds shortcuts from pane config and opens selected shortcut', async () => {
    const onOpenPane = jest.fn();

    render(<Harness paneConfig={paneConfig} onOpenPane={onOpenPane} currentUser="alice@coldmail.com" />);

    await waitFor(() => expect(latest.shortcuts).toHaveLength(3));
    expect(latest.shortcuts).toHaveLength(3);
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

  test('uses namespaced storage per local user key', () => {
    const onOpenPane = jest.fn();
    prefStore['alice@coldmail.com'] = {
      contacts: { label: 'Alice Contacts' }
    };
    prefStore['bob@coldmail.com'] = {
      contacts: { label: 'Bob Contacts' }
    };

    const { rerender } = render(<Harness paneConfig={paneConfig} onOpenPane={onOpenPane} currentUser="alice@coldmail.com" />);
    return waitFor(() => {
      expect(latest.shortcuts.find((s) => s.id === 'contacts')?.label).toBe('Alice Contacts');
      rerender(<Harness paneConfig={paneConfig} onOpenPane={onOpenPane} currentUser="bob@coldmail.com" />);
    }).then(() => waitFor(() => {
      expect(latest.shortcuts.find((s) => s.id === 'contacts')?.label).toBe('Bob Contacts');
    }));
  });

  test('falls back to defaults when no user pref exists', async () => {
    const onOpenPane = jest.fn();
    render(<Harness paneConfig={paneConfig} onOpenPane={onOpenPane} currentUser="legacy-user" />);
    await waitFor(() => {
      expect(latest.shortcuts.find((s) => s.id === 'contacts')?.label).toBe('Contacts');
    });
  });

  test('moveShortcut persists snapped position and can be loaded', async () => {
    const onOpenPane = jest.fn();
    render(<Harness paneConfig={paneConfig} onOpenPane={onOpenPane} currentUser="alice@coldmail.com" />);
    await waitFor(() => expect(latest.shortcuts).toHaveLength(3));

    act(() => {
      latest.moveShortcut('contacts', { x: 151, y: 123 });
    });

    await waitFor(() => expect(prefStore['alice@coldmail.com']).toBeTruthy());
    const persisted = prefStore['alice@coldmail.com'] || {};
    expect(persisted.contacts.position).toEqual({ x: 116, y: 112 });
  });

  test('alignShortcutsToGrid assigns valid positions for visible shortcuts', async () => {
    const onOpenPane = jest.fn();
    render(<Harness paneConfig={paneConfig} onOpenPane={onOpenPane} currentUser="alice@coldmail.com" />);
    await waitFor(() => expect(latest.shortcuts).toHaveLength(3));

    act(() => {
      latest.alignShortcutsToGrid();
    });

    await waitFor(() => expect(prefStore['alice@coldmail.com']).toBeTruthy());
    const persisted = prefStore['alice@coldmail.com'] || {};
    expect(persisted.contacts.position).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
    expect(persisted.notepad.position).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
    expect(persisted.calculator.position).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
  });

  test('moveShortcut does not allow overlap and picks nearest free grid slot', async () => {
    const onOpenPane = jest.fn();
    render(<Harness paneConfig={paneConfig} onOpenPane={onOpenPane} currentUser="alice@coldmail.com" />);
    await waitFor(() => expect(latest.shortcuts).toHaveLength(3));

    const notepadPos = latest.shortcuts.find((s) => s.id === 'notepad')?.position;
    expect(notepadPos).toBeTruthy();

    act(() => {
      latest.moveShortcut('contacts', notepadPos);
    });

    await waitFor(() => expect(prefStore['alice@coldmail.com']).toBeTruthy());
    const persisted = prefStore['alice@coldmail.com'] || {};
    const movedPos = persisted.contacts.position;
    expect(movedPos).toBeTruthy();
    expect(movedPos).not.toEqual(notepadPos);
  });

  test('reclamps positions into bounds after resize', async () => {
    const onOpenPane = jest.fn();
    render(<Harness paneConfig={paneConfig} onOpenPane={onOpenPane} currentUser="alice@coldmail.com" />);
    await waitFor(() => expect(latest.shortcuts).toHaveLength(3));

    act(() => {
      latest.moveShortcut('contacts', { x: 9000, y: 9000 });
    });

    act(() => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 640 });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 480 });
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => expect(prefStore['alice@coldmail.com']).toBeTruthy());
    const persisted = prefStore['alice@coldmail.com'] || {};
    expect(persisted.contacts.position.x).toBeLessThanOrEqual(560);
    expect(persisted.contacts.position.y).toBeLessThanOrEqual(378);
  });
});
