import { useCallback, useEffect, useRef, useState } from 'react';
import { getInitialPaneState } from '../paneConfig';
import { log } from '../utils/debug';

function blurEditableIfInside(selector) {
  if (typeof document === 'undefined') return;
  const active = document.activeElement;
  if (!active || typeof active.matches !== 'function' || typeof active.closest !== 'function') return;
  const isEditable = active.matches('input, textarea, [contenteditable="true"]');
  if (!isEditable) return;
  if (!active.closest(selector)) return;
  if (typeof active.blur === 'function') {
    active.blur();
  }
}

export function useWindowManager() {
  const [panes, setPanes] = useState(getInitialPaneState());
  const [paneOrder, setPaneOrder] = useState([]);
  const [activePane, setActivePane] = useState(null);
  const [savedSizes, setSavedSizes] = useState({});
  const [savedPositions, setSavedPositions] = useState({});
  const [cascadeOffset, setCascadeOffset] = useState(0);
  const [conversations, setConversations] = useState({});
  const [games, setGames] = useState({});

  const conversationsRef = useRef({});
  const gamesRef = useRef({});
  const activePaneRef = useRef(null);
  const paneOrderRef = useRef([]);
  const panesRef = useRef({});

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    gamesRef.current = games;
  }, [games]);

  useEffect(() => {
    activePaneRef.current = activePane;
  }, [activePane]);

  useEffect(() => {
    panesRef.current = panes;
  }, [panes]);

  useEffect(() => {
    paneOrderRef.current = paneOrder;
  }, [paneOrder]);

  const getNextCascadeOffset = useCallback(() => {
    const current = cascadeOffset;
    setCascadeOffset((prev) => (prev + 30) % 150);
    return current;
  }, [cascadeOffset]);

  const focusPane = useCallback((paneName) => {
    if (!paneName) return;
    setActivePane(paneName);
  }, []);

  const openPane = useCallback((paneName) => {
    log('[usePaneManager] Opening pane:', paneName);
    setPanes((prev) => {
      const pane = prev[paneName];

      if (pane?.isOpen && !pane?.isMinimized) return prev;

      if (pane?.isOpen && pane?.isMinimized) {
        return {
          ...prev,
          [paneName]: { ...prev[paneName], isMinimized: false }
        };
      }

      const offset = getNextCascadeOffset();
      return {
        ...prev,
        [paneName]: {
          ...prev[paneName],
          isOpen: true,
          isMinimized: false,
          initialPos: { left: 100 + offset, top: 50 + offset }
        }
      };
    });

    setPaneOrder((prev) => {
      if (prev.includes(paneName)) return prev;
      return [...prev, paneName];
    });

    setActivePane(paneName);
  }, [getNextCascadeOffset]);

  const closePane = useCallback((paneName) => {
    log('[usePaneManager] Closing pane:', paneName);
    blurEditableIfInside('.pane-frame');

    setPanes((prev) => ({
      ...prev,
      [paneName]: { isOpen: false, isMinimized: false, isMaximized: false }
    }));

    setPaneOrder((prev) => prev.filter((p) => p !== paneName));

    setActivePane((prev) => {
      if (prev !== paneName) return prev;
      const remaining = paneOrderRef.current.filter((p) => {
        if (p === paneName) return false;
        if (p.startsWith('conv_')) {
          const conv = conversationsRef.current[p];
          return conv && conv.isOpen && !conv.isMinimized;
        }
        if (p.startsWith('game_')) {
          const game = gamesRef.current[p];
          return game && game.isOpen && !game.isMinimized;
        }
        const pane = panesRef.current[p];
        return pane && pane.isOpen && !pane.isMinimized;
      });
      return remaining[remaining.length - 1] || null;
    });
  }, []);

  const minimizePane = useCallback((paneName) => {
    log('[usePaneManager] Minimizing pane:', paneName);
    blurEditableIfInside('.pane-frame');

    setPanes((prev) => ({
      ...prev,
      [paneName]: { ...prev[paneName], isMinimized: true }
    }));

    setActivePane((prev) => {
      if (prev !== paneName) return prev;
      const visiblePanes = paneOrderRef.current.filter((p) => {
        if (p === paneName) return false;
        if (p.startsWith('conv_')) {
          const conv = conversationsRef.current[p];
          return conv && conv.isOpen && !conv.isMinimized;
        }
        if (p.startsWith('game_')) {
          const game = gamesRef.current[p];
          return game && game.isOpen && !game.isMinimized;
        }
        const pane = panesRef.current[p];
        return pane && pane.isOpen && !pane.isMinimized;
      });
      return visiblePanes[visiblePanes.length - 1] || null;
    });
  }, []);

  const toggleMaximizePane = useCallback((paneName) => {
    log('[usePaneManager] Toggling maximize:', paneName);

    setPanes((prev) => ({
      ...prev,
      [paneName]: { ...prev[paneName], isMaximized: !prev[paneName].isMaximized }
    }));
  }, []);

  const openConversation = useCallback((contactName) => {
    const convId = `conv_${contactName}`;
    log('[usePaneManager] Opening conversation:', convId);
    const offset = getNextCascadeOffset();

    setConversations((prev) => {
      if (!prev[convId]) {
        return {
          ...prev,
          [convId]: {
            contactName,
            isOpen: true,
            isMinimized: false,
            isMaximized: false,
            initialPos: { left: 100 + offset, top: 50 + offset }
          }
        };
      }
      return {
        ...prev,
        [convId]: { ...prev[convId], isOpen: true, isMinimized: false }
      };
    });

    setPaneOrder((prev) => {
      const filtered = prev.filter((p) => p !== convId);
      return [...filtered, convId];
    });

    setActivePane(convId);
  }, [getNextCascadeOffset]);

  const closeConversation = useCallback((convId, onBeforeClose) => {
    log('[usePaneManager] Closing conversation:', convId);
    blurEditableIfInside('.pane-frame');
    const contactName = convId.replace('conv_', '');
    if (typeof onBeforeClose === 'function') {
      onBeforeClose(contactName);
    }

    setConversations((prev) => {
      const updated = { ...prev };
      delete updated[convId];
      return updated;
    });

    setPaneOrder((prev) => prev.filter((p) => p !== convId));

    setActivePane((prev) => {
      if (prev !== convId) return prev;
      const visiblePanes = paneOrderRef.current.filter((p) => {
        if (p === convId) return false;
        if (p.startsWith('conv_')) {
          const conv = conversationsRef.current[p];
          return conv && conv.isOpen && !conv.isMinimized;
        }
        if (p.startsWith('game_')) {
          const game = gamesRef.current[p];
          return game && game.isOpen && !game.isMinimized;
        }
        const pane = panesRef.current[p];
        return pane && pane.isOpen && !pane.isMinimized;
      });
      return visiblePanes[visiblePanes.length - 1] || null;
    });
  }, []);

  const minimizeConversation = useCallback((convId) => {
    log('[usePaneManager] Minimizing conversation:', convId);
    blurEditableIfInside('.pane-frame');

    setConversations((prev) => ({
      ...prev,
      [convId]: { ...prev[convId], isMinimized: true }
    }));

    setActivePane((prev) => {
      if (prev !== convId) return prev;
      const visiblePanes = paneOrderRef.current.filter((p) => {
        if (p === convId) return false;
        if (p.startsWith('conv_')) {
          const conv = conversationsRef.current[p];
          return conv && conv.isOpen && !conv.isMinimized;
        }
        const pane = panesRef.current[p];
        return pane && pane.isOpen && !pane.isMinimized;
      });
      return visiblePanes[visiblePanes.length - 1] || null;
    });
  }, []);

  const toggleMaximizeConversation = useCallback((convId) => {
    setConversations((prev) => ({
      ...prev,
      [convId]: { ...prev[convId], isMaximized: !prev[convId]?.isMaximized }
    }));
  }, []);

  const openGamePane = useCallback((contactName, gameSessionId, gameType) => {
    const gameId = `game_${contactName}_${gameType}`;
    log('[usePaneManager] Opening game pane:', gameId);

    // Dedupe: skip if this exact session is already open and visible
    const existing = gamesRef.current[gameId];
    if (existing?.isOpen && !existing?.isMinimized && existing?.gameSessionId === gameSessionId) {
      return;
    }

    const offset = getNextCascadeOffset();

    setGames((prev) => {
      if (!prev[gameId]) {
        return {
          ...prev,
          [gameId]: {
            contactName,
            gameSessionId,
            gameType,
            isOpen: true,
            isMinimized: false,
            isMaximized: false,
            initialPos: { left: 120 + offset, top: 70 + offset }
          }
        };
      }
      return {
        ...prev,
        [gameId]: { ...prev[gameId], gameSessionId, isOpen: true, isMinimized: false }
      };
    });

    setPaneOrder((prev) => {
      const filtered = prev.filter((p) => p !== gameId);
      return [...filtered, gameId];
    });

    setActivePane(gameId);
  }, [getNextCascadeOffset]);

  const closeGamePane = useCallback((gameId) => {
    log('[usePaneManager] Closing game pane:', gameId);
    blurEditableIfInside('.pane-frame');

    setGames((prev) => {
      const updated = { ...prev };
      delete updated[gameId];
      return updated;
    });

    setPaneOrder((prev) => prev.filter((p) => p !== gameId));

    setActivePane((prev) => {
      if (prev !== gameId) return prev;
      const visiblePanes = paneOrderRef.current.filter((p) => {
        if (p === gameId) return false;
        if (p.startsWith('conv_')) {
          const conv = conversationsRef.current[p];
          return conv && conv.isOpen && !conv.isMinimized;
        }
        if (p.startsWith('game_')) {
          const game = gamesRef.current[p];
          return game && game.isOpen && !game.isMinimized;
        }
        const pane = panesRef.current[p];
        return pane && pane.isOpen && !pane.isMinimized;
      });
      return visiblePanes[visiblePanes.length - 1] || null;
    });
  }, []);

  const minimizeGamePane = useCallback((gameId) => {
    log('[usePaneManager] Minimizing game pane:', gameId);
    blurEditableIfInside('.pane-frame');

    setGames((prev) => ({
      ...prev,
      [gameId]: { ...prev[gameId], isMinimized: true }
    }));

    setActivePane((prev) => {
      if (prev !== gameId) return prev;
      const visiblePanes = paneOrderRef.current.filter((p) => {
        if (p === gameId) return false;
        if (p.startsWith('conv_')) {
          const conv = conversationsRef.current[p];
          return conv && conv.isOpen && !conv.isMinimized;
        }
        if (p.startsWith('game_')) {
          const game = gamesRef.current[p];
          return game && game.isOpen && !game.isMinimized;
        }
        const pane = panesRef.current[p];
        return pane && pane.isOpen && !pane.isMinimized;
      });
      return visiblePanes[visiblePanes.length - 1] || null;
    });
  }, []);

  const toggleMaximizeGamePane = useCallback((gameId) => {
    setGames((prev) => ({
      ...prev,
      [gameId]: { ...prev[gameId], isMaximized: !prev[gameId]?.isMaximized }
    }));
  }, []);

  const getZIndex = useCallback((paneName) => {
    const currentOrder = paneOrder;
    const index = currentOrder.indexOf(paneName);
    if (index === -1) return 100;
    const baseZ = 100 + index;
    return activePane === paneName ? 1000 : baseZ;
  }, [paneOrder, activePane]);

  const handleSizeChange = useCallback((paneName, newSize) => {
    setSavedSizes((prev) => ({
      ...prev,
      [paneName]: newSize
    }));
  }, []);

  const handlePositionChange = useCallback((paneName, newPosition) => {
    setSavedPositions((prev) => ({
      ...prev,
      [paneName]: newPosition
    }));
  }, []);

  const getInitialPosition = useCallback((paneName) => {
    if (savedPositions[paneName]) {
      return savedPositions[paneName];
    }

    const paneState = panes[paneName] || conversations[paneName] || games[paneName];
    if (paneState && paneState.initialPos) {
      return paneState.initialPos;
    }

    return { left: 100, top: 50 };
  }, [savedPositions, panes, conversations, games]);

  const closeAllConversations = useCallback(() => {
    blurEditableIfInside('.pane-frame');
    setConversations({});
    setPaneOrder((prev) => prev.filter((p) => !p.startsWith('conv_')));
    setActivePane((prevActive) => {
      if (!prevActive || !prevActive.startsWith('conv_')) return prevActive;
      const visiblePanes = paneOrderRef.current.filter((p) => {
        if (p.startsWith('conv_')) return false;
        if (p.startsWith('game_')) {
          const game = gamesRef.current[p];
          return game && game.isOpen && !game.isMinimized;
        }
        const pane = panesRef.current[p];
        return pane && pane.isOpen && !pane.isMinimized;
      });
      return visiblePanes[visiblePanes.length - 1] || null;
    });
    log('[usePaneManager] All conversations closed');
  }, []);

  const closeAllGames = useCallback(() => {
    blurEditableIfInside('.pane-frame');
    setGames({});
    setPaneOrder((prev) => prev.filter((p) => !p.startsWith('game_')));
    setActivePane((prevActive) => {
      if (!prevActive || !prevActive.startsWith('game_')) return prevActive;
      const visiblePanes = paneOrderRef.current.filter((p) => {
        if (p.startsWith('game_')) return false;
        if (p.startsWith('conv_')) {
          const conv = conversationsRef.current[p];
          return conv && conv.isOpen && !conv.isMinimized;
        }
        const pane = panesRef.current[p];
        return pane && pane.isOpen && !pane.isMinimized;
      });
      return visiblePanes[visiblePanes.length - 1] || null;
    });
    log('[usePaneManager] All game panes closed');
  }, []);

  const resetWindowState = useCallback(() => {
    blurEditableIfInside('.pane-frame');
    setPanes(getInitialPaneState());
    setPaneOrder([]);
    setActivePane(null);
    setSavedSizes({});
    setSavedPositions({});
    setCascadeOffset(0);
    setConversations({});
  }, []);

  return {
    panes,
    setPanes,
    paneOrder,
    setPaneOrder,
    activePane,
    setActivePane,
    savedSizes,
    savedPositions,
    conversations,
    setConversations,
    conversationsRef,
    games,
    gamesRef,
    activePaneRef,
    paneOrderRef,
    panesRef,
    openPane,
    closePane,
    minimizePane,
    toggleMaximizePane,
    focusPane,
    openConversation,
    closeConversation,
    closeAllConversations,
    closeAllGames,
    minimizeConversation,
    toggleMaximizeConversation,
    openGamePane,
    closeGamePane,
    minimizeGamePane,
    toggleMaximizeGamePane,
    getZIndex,
    handleSizeChange,
    handlePositionChange,
    getInitialPosition,
    resetWindowState
  };
}

export default useWindowManager;
