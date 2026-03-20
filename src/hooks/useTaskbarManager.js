import { useCallback } from 'react';

export function useTaskbarManager({
  setConversations,
  setGames,
  setPanes,
  setActivePane,
  activePaneRef
}) {
  const handleTaskbarClick = useCallback((paneName) => {
    if (paneName.startsWith('conv_')) {
      setConversations((prev) => {
        const conv = prev[paneName];
        if (!conv) return prev;

        if (conv.isMinimized) {
          setActivePane(paneName);
          return {
            ...prev,
            [paneName]: { ...prev[paneName], isMinimized: false }
          };
        } else if (activePaneRef.current === paneName) {
          setActivePane(null);
          return prev;
        } else {
          setActivePane(paneName);
          return prev;
        }
      });
      return;
    }

    if (paneName.startsWith('game_')) {
      setGames((prev) => {
        const game = prev[paneName];
        if (!game) return prev;

        if (game.isMinimized) {
          setActivePane(paneName);
          return {
            ...prev,
            [paneName]: { ...prev[paneName], isMinimized: false }
          };
        } else if (activePaneRef.current === paneName) {
          setActivePane(null);
          return prev;
        } else {
          setActivePane(paneName);
          return prev;
        }
      });
      return;
    }

    setPanes((prev) => {
      const pane = prev[paneName];
      if (!pane) return prev;

      if (pane.isMinimized) {
        setActivePane(paneName);
        return {
            ...prev,
            [paneName]: { ...prev[paneName], isMinimized: false }
          };
        } else if (activePaneRef.current === paneName) {
        setActivePane(null);
        return prev;
      } else {
        setActivePane(paneName);
        return prev;
      }
    });
  }, [
    activePaneRef,
    setActivePane,
    setConversations,
    setGames,
    setPanes
  ]);

  return {
    handleTaskbarClick
  };
}

export default useTaskbarManager;
