import { useCallback, useMemo } from 'react';
import { buildDesktopShortcuts } from '../models/desktopShortcuts';

export function useDesktopManager({ paneConfig, onOpenPane }) {
  const shortcuts = useMemo(() => buildDesktopShortcuts(paneConfig), [paneConfig]);

  const openShortcut = useCallback((shortcutId) => {
    if (!shortcutId) return;
    onOpenPane(shortcutId);
  }, [onOpenPane]);

  return {
    shortcuts,
    openShortcut
  };
}

export default useDesktopManager;
