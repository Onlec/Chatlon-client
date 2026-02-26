import { useCallback, useMemo, useState } from 'react';
import { buildDesktopShortcuts } from '../models/desktopShortcuts';

const SHORTCUTS_STORAGE_KEY = 'chatlon_desktop_shortcuts';

function loadShortcutOverrides() {
  try {
    const raw = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveShortcutOverrides(overrides) {
  try {
    if (!overrides || Object.keys(overrides).length === 0) {
      localStorage.removeItem(SHORTCUTS_STORAGE_KEY);
      return;
    }
    localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // Storage write failure should not block UI.
  }
}

export function useDesktopManager({ paneConfig, onOpenPane }) {
  const baseShortcuts = useMemo(() => buildDesktopShortcuts(paneConfig), [paneConfig]);
  const [shortcutOverrides, setShortcutOverrides] = useState(() => loadShortcutOverrides());

  const shortcuts = useMemo(() => {
    return baseShortcuts
      .filter((shortcut) => !shortcutOverrides[shortcut.id]?.hidden)
      .map((shortcut) => ({
        ...shortcut,
        label: shortcutOverrides[shortcut.id]?.label || shortcut.label
      }));
  }, [baseShortcuts, shortcutOverrides]);

  const openShortcut = useCallback((shortcutId) => {
    if (!shortcutId) return;
    onOpenPane(shortcutId);
  }, [onOpenPane]);

  const renameShortcut = useCallback((shortcutId, newLabel) => {
    const nextLabel = typeof newLabel === 'string' ? newLabel.trim() : '';
    if (!shortcutId || !nextLabel) return;
    setShortcutOverrides((prev) => {
      const next = {
        ...prev,
        [shortcutId]: {
          ...(prev[shortcutId] || {}),
          label: nextLabel
        }
      };
      saveShortcutOverrides(next);
      return next;
    });
  }, []);

  const removeShortcut = useCallback((shortcutId) => {
    if (!shortcutId) return;
    setShortcutOverrides((prev) => {
      const next = {
        ...prev,
        [shortcutId]: {
          ...(prev[shortcutId] || {}),
          hidden: true
        }
      };
      saveShortcutOverrides(next);
      return next;
    });
  }, []);

  const resetShortcuts = useCallback(() => {
    setShortcutOverrides({});
    saveShortcutOverrides({});
  }, []);

  return {
    shortcuts,
    openShortcut,
    renameShortcut,
    removeShortcut,
    resetShortcuts
  };
}

export default useDesktopManager;
