import { useCallback, useEffect, useRef, useState } from 'react';

const CHABLO_WINDOW_PADDING = 12;

function clampWindowPosition(position, size, bounds) {
  if (!bounds) {
    return position;
  }

  return {
    left: Math.max(
      CHABLO_WINDOW_PADDING,
      Math.min(position.left, Math.max(CHABLO_WINDOW_PADDING, bounds.width - size.width - CHABLO_WINDOW_PADDING))
    ),
    top: Math.max(
      CHABLO_WINDOW_PADDING,
      Math.min(position.top, Math.max(CHABLO_WINDOW_PADDING, bounds.height - size.height - CHABLO_WINDOW_PADDING))
    )
  };
}

function getViewportBounds(viewportRef) {
  const rect = viewportRef?.current?.getBoundingClientRect?.();
  if (!rect) {
    return null;
  }

  return {
    width: rect.width,
    height: rect.height
  };
}

export function useChabloHudState(initialWindowStateFactory) {
  const [windowStateById, setWindowStateById] = useState(() => initialWindowStateFactory());
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [hudChatMode, setHudChatMode] = useState('say');
  const [hudWhisperTarget, setHudWhisperTarget] = useState(null);
  const viewportRef = useRef(null);
  const avatarMenuRef = useRef(null);
  const avatarButtonRef = useRef(null);
  const topWindowZRef = useRef(Object.keys(initialWindowStateFactory()).length + 2);

  const focusWindow = useCallback((windowId) => {
    setWindowStateById((previous) => {
      const currentWindow = previous[windowId];
      if (!currentWindow) {
        return previous;
      }

      const nextZIndex = topWindowZRef.current + 1;
      topWindowZRef.current = nextZIndex;
      return {
        ...previous,
        [windowId]: {
          ...currentWindow,
          zIndex: nextZIndex
        }
      };
    });
  }, []);

  const updateWindowPosition = useCallback((windowId, nextPosition) => {
    setWindowStateById((previous) => {
      if (!previous[windowId]) {
        return previous;
      }

      return {
        ...previous,
        [windowId]: {
          ...previous[windowId],
          position: nextPosition
        }
      };
    });
  }, []);

  const setWindowSubview = useCallback((windowId, activeSubview) => {
    setWindowStateById((previous) => {
      if (!previous[windowId]) {
        return previous;
      }

      return {
        ...previous,
        [windowId]: {
          ...previous[windowId],
          activeSubview
        }
      };
    });
  }, []);

  const openWindow = useCallback((windowId, options = {}) => {
    setWindowStateById((previous) => {
      const currentWindow = previous[windowId];
      if (!currentWindow) {
        return previous;
      }

      const nextZIndex = topWindowZRef.current + 1;
      topWindowZRef.current = nextZIndex;
      return {
        ...previous,
        [windowId]: {
          ...currentWindow,
          open: true,
          zIndex: nextZIndex,
          ...(options.subview ? { activeSubview: options.subview } : {}),
          ...(options.title ? { title: options.title } : {})
        }
      };
    });
  }, []);

  const closeWindow = useCallback((windowId) => {
    setWindowStateById((previous) => {
      if (!previous[windowId]) {
        return previous;
      }

      return {
        ...previous,
        [windowId]: {
          ...previous[windowId],
          open: false
        }
      };
    });
  }, []);

  useEffect(() => {
    if (!isAvatarMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (
        avatarMenuRef.current?.contains?.(event.target)
        || avatarButtonRef.current?.contains?.(event.target)
      ) {
        return;
      }
      setIsAvatarMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isAvatarMenuOpen]);

  useEffect(() => {
    const clampAllWindows = () => {
      const bounds = getViewportBounds(viewportRef);
      if (!bounds) {
        return;
      }

      setWindowStateById((previous) => (
        Object.entries(previous).reduce((next, [windowId, entry]) => {
          next[windowId] = {
            ...entry,
            position: clampWindowPosition(entry.position, entry.size, bounds)
          };
          return next;
        }, {})
      ));
    };

    window.addEventListener('resize', clampAllWindows);
    return () => window.removeEventListener('resize', clampAllWindows);
  }, []);

  return {
    avatarButtonRef,
    avatarMenuRef,
    closeWindow,
    focusWindow,
    hudChatMode,
    hudWhisperTarget,
    isAvatarMenuOpen,
    openWindow,
    setHudChatMode,
    setHudWhisperTarget,
    setIsAvatarMenuOpen,
    setWindowStateById,
    setWindowSubview,
    updateWindowPosition,
    viewportRef,
    windowStateById
  };
}
