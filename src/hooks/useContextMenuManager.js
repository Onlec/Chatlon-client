import { useCallback, useEffect, useRef, useState } from 'react';

export function useContextMenuManager({ enabled = false } = {}) {
  const [menuState, setMenuState] = useState(null);
  const hostRef = useRef(null);

  const closeMenu = useCallback(() => {
    setMenuState(null);
  }, []);

  const openMenu = useCallback((payload) => {
    if (!enabled) return;
    if (!payload || typeof payload.x !== 'number' || typeof payload.y !== 'number') {
      setMenuState(null);
      return;
    }
    setMenuState({
      x: payload.x,
      y: payload.y,
      type: payload.type || 'desktop',
      target: payload.target || null,
      actions: Array.isArray(payload.actions) ? payload.actions : []
    });
  }, [enabled]);

  const handleContextMenu = useCallback((event) => {
    if (!enabled) return;
    event.preventDefault();
    openMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'desktop',
      target: null,
      actions: []
    });
  }, [enabled, openMenu]);

  useEffect(() => {
    if (!enabled || !menuState) return undefined;

    const handleMouseDown = (event) => {
      if (!hostRef.current) return;
      if (hostRef.current.contains(event.target)) return;
      closeMenu();
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, menuState, closeMenu]);

  useEffect(() => {
    if (!enabled || !menuState || !hostRef.current) return undefined;
    let rafId = null;

    rafId = requestAnimationFrame(() => {
      const rect = hostRef.current?.getBoundingClientRect();
      if (!rect) return;
      const maxX = Math.max(0, window.innerWidth - rect.width - 2);
      const maxY = Math.max(0, window.innerHeight - rect.height - 2);
      const nextX = Math.min(Math.max(0, menuState.x), maxX);
      const nextY = Math.min(Math.max(0, menuState.y), maxY);
      if (nextX !== menuState.x || nextY !== menuState.y) {
        setMenuState((prev) => {
          if (!prev) return prev;
          return { ...prev, x: nextX, y: nextY };
        });
      }
    });

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [enabled, menuState]);

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
