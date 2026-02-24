import { useCallback } from 'react';

export function useTaskbarManager({
  setConversations,
  setPanes,
  setActivePane,
  paneOrderRef,
  conversationsRef,
  panesRef,
  activePaneRef
}) {
  const handleTaskbarClick = useCallback((paneName) => {
    const clearActivePaneAfterMinimize = (minimizedPane) => {
      setActivePane((prev) => {
        if (prev !== minimizedPane) return prev;
        const visiblePanes = paneOrderRef.current.filter((p) => {
          if (p === minimizedPane) return false;
          if (p.startsWith('conv_')) {
            const conv = conversationsRef.current[p];
            return conv && conv.isOpen && !conv.isMinimized;
          }
          const pane = panesRef.current[p];
          return pane && pane.isOpen && !pane.isMinimized;
        });
        return visiblePanes[visiblePanes.length - 1] || null;
      });
    };

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
          clearActivePaneAfterMinimize(paneName);
          return {
            ...prev,
            [paneName]: { ...prev[paneName], isMinimized: true }
          };
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
        clearActivePaneAfterMinimize(paneName);
        return {
          ...prev,
          [paneName]: { ...prev[paneName], isMinimized: true }
        };
      } else {
        setActivePane(paneName);
        return prev;
      }
    });
  }, [
    activePaneRef,
    conversationsRef,
    paneOrderRef,
    panesRef,
    setActivePane,
    setConversations,
    setPanes
  ]);

  return {
    handleTaskbarClick
  };
}

export default useTaskbarManager;
