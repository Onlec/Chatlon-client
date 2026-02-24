import { useCallback, useRef, useState } from 'react';

export function useContextMenuManager({ enabled = false } = {}) {
  const [menuState, setMenuState] = useState(null);
  const hostRef = useRef(null);

  const openMenu = useCallback((payload) => {
    if (!enabled) return;
    setMenuState(payload || null);
  }, [enabled]);

  const closeMenu = useCallback(() => {
    setMenuState(null);
  }, []);

  const handleContextMenu = useCallback((event) => {
    if (!enabled) return;
    event.preventDefault();
    setMenuState({
      x: event.clientX,
      y: event.clientY,
      type: 'global',
      target: null,
      actions: []
    });
  }, [enabled]);

  return {
    enabled,
    hostRef,
    menuState,
    openMenu,
    closeMenu,
    handleContextMenu
  };
}

export default useContextMenuManager;
