// src/hooks/usePaneManager.js
/**
 * Pane/Window Manager Hook
 * 
 * Beheert alle window/pane operaties voor de desktop omgeving.
 * Ondersteunt normale panes en dynamische conversation panes.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { paneConfig, getInitialPaneState } from '../paneConfig';

/**
 * Hook voor pane/window management.
 * 
 * @returns {Object} Window manager state en functies
 */
export function usePaneManager() {
  // ============================================
  // STATE
  // ============================================
  
  const [panes, setPanes] = useState(getInitialPaneState());
  const [paneOrder, setPaneOrder] = useState([]);
  const [activePane, setActivePane] = useState(null);
  const [savedSizes, setSavedSizes] = useState({});
  const [savedPositions, setSavedPositions] = useState({});
  const [cascadeOffset, setCascadeOffset] = useState(0);
  const [conversations, setConversations] = useState({});
  const [isStartOpen, setIsStartOpen] = useState(false);

  // Refs voor real-time access in callbacks/listeners
  const conversationsRef = useRef({});
  const activePaneRef = useRef(null);
  const paneOrderRef = useRef([]); // FIX: Ref voor paneOrder

  // Sync refs met state
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    activePaneRef.current = activePane;
  }, [activePane]);

  // FIX: Sync paneOrder ref
  useEffect(() => {
    paneOrderRef.current = paneOrder;
  }, [paneOrder]);

  // ============================================
  // CASCADE OFFSET HELPER
  // ============================================

  const getNextCascadeOffset = useCallback(() => {
    const current = cascadeOffset;
    setCascadeOffset(prev => (prev + 30) % 150);
    return current;
  }, [cascadeOffset]);

  // ============================================
  // PANE OPERATIES
  // ============================================

  /**
   * Open een pane.
   * @param {string} paneName - Naam van de pane (key uit paneConfig)
   */
  const openPane = useCallback((paneName) => {
    console.log('[usePaneManager] Opening pane:', paneName);
    
    setPanes(prev => ({
      ...prev,
      [paneName]: { ...prev[paneName], isOpen: true, isMinimized: false }
    }));
    
    setIsStartOpen(false);
    
    setPaneOrder(prev => {
      if (!prev.includes(paneName)) {
        return [...prev, paneName];
      }
      // FIX: Breng naar voren in order als al open
      const filtered = prev.filter(p => p !== paneName);
      return [...filtered, paneName];
    });
    
    setActivePane(paneName);
  }, []); // FIX: Geen dependencies nodig - we gebruiken functional updates

  /**
   * Sluit een pane.
   * @param {string} paneName - Naam van de pane
   */
  const closePane = useCallback((paneName) => {
    console.log('[usePaneManager] Closing pane:', paneName);
    
    setPanes(prev => ({
      ...prev,
      [paneName]: { isOpen: false, isMinimized: false, isMaximized: false }
    }));

    setPaneOrder(prev => prev.filter(p => p !== paneName));

    // FIX: Gebruik ref voor actuele paneOrder
    setActivePane(prev => {
      if (prev === paneName) {
        const remaining = paneOrderRef.current.filter(p => p !== paneName);
        return remaining[remaining.length - 1] || null;
      }
      return prev;
    });
  }, []);

  /**
   * Minimaliseer een pane.
   * @param {string} paneName - Naam van de pane
   */
  const minimizePane = useCallback((paneName) => {
    console.log('[usePaneManager] Minimizing pane:', paneName);
    
    setPanes(prev => ({
      ...prev,
      [paneName]: { ...prev[paneName], isMinimized: true }
    }));

    // FIX: Update active pane naar volgende in order
    setActivePane(prev => {
      if (prev === paneName) {
        const currentOrder = paneOrderRef.current;
        const visiblePanes = currentOrder.filter(p => {
          if (p === paneName) return false;
          if (p.startsWith('conv_')) {
            const conv = conversationsRef.current[p];
            return conv && conv.isOpen && !conv.isMinimized;
          }
          // Voor normale panes moeten we state checken
          return true; // We kunnen niet synchroon panes state checken hier
        });
        return visiblePanes[visiblePanes.length - 1] || null;
      }
      return prev;
    });
  }, []);

  /**
   * Toggle maximize voor een pane.
   * @param {string} paneName - Naam van de pane
   */
  const toggleMaximizePane = useCallback((paneName) => {
    console.log('[usePaneManager] Toggling maximize:', paneName);
    
    setPanes(prev => ({
      ...prev,
      [paneName]: { ...prev[paneName], isMaximized: !prev[paneName].isMaximized }
    }));
  }, []);

  /**
   * Focus een pane (bring to front).
   * @param {string} paneName - Naam van de pane
   */
  const focusPane = useCallback((paneName) => {
    console.log('[usePaneManager] Focusing pane:', paneName);
    
    setActivePane(paneName);
    
    // FIX: Update paneOrder om focused pane naar voren te brengen
    setPaneOrder(prev => {
      if (prev[prev.length - 1] === paneName) return prev; // Al bovenaan
      const filtered = prev.filter(p => p !== paneName);
      return [...filtered, paneName];
    });
  }, []);

  // ============================================
  // CONVERSATION OPERATIES
  // ============================================

  /**
   * Open een conversation met een contact.
   * @param {string} contactName - Naam van het contact
   */
  const openConversation = useCallback((contactName) => {
    const convId = `conv_${contactName}`;
    console.log('[usePaneManager] Opening conversation:', convId);

    setConversations(prev => {
      if (!prev[convId]) {
        // Nieuwe conversation
        return {
          ...prev,
          [convId]: {
            contactName,
            isOpen: true,
            isMinimized: false,
            isMaximized: false
          }
        };
      } else {
        // Bestaande conversation - open en focus
        return {
          ...prev,
          [convId]: { ...prev[convId], isOpen: true, isMinimized: false }
        };
      }
    });

    setPaneOrder(prev => {
      const filtered = prev.filter(p => p !== convId);
      return [...filtered, convId];
    });

    setActivePane(convId);
  }, []);

  /**
   * Sluit een conversation.
   * @param {string} convId - Conversation ID (conv_<contactName>)
   */
  const closeConversation = useCallback((convId) => {
    console.log('[usePaneManager] Closing conversation:', convId);

    setConversations(prev => {
      const updated = { ...prev };
      delete updated[convId];
      return updated;
    });

    setPaneOrder(prev => prev.filter(p => p !== convId));

    setActivePane(prev => {
      if (prev === convId) {
        const remaining = paneOrderRef.current.filter(p => p !== convId);
        return remaining[remaining.length - 1] || null;
      }
      return prev;
    });
  }, []);

  /**
   * Minimaliseer een conversation.
   * @param {string} convId - Conversation ID
   */
  const minimizeConversation = useCallback((convId) => {
    console.log('[usePaneManager] Minimizing conversation:', convId);

    setConversations(prev => ({
      ...prev,
      [convId]: { ...prev[convId], isMinimized: true }
    }));

    setActivePane(prev => {
      if (prev === convId) {
        const remaining = paneOrderRef.current.filter(p => p !== convId);
        return remaining[remaining.length - 1] || null;
      }
      return prev;
    });
  }, []);

  /**
   * Toggle maximize voor een conversation.
   * @param {string} convId - Conversation ID
   */
  const toggleMaximizeConversation = useCallback((convId) => {
    setConversations(prev => ({
      ...prev,
      [convId]: { ...prev[convId], isMaximized: !prev[convId]?.isMaximized }
    }));
  }, []);

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Get z-index voor een pane/conversation.
   * FIX: Gebruik paneOrder direct uit state, niet uit closure
   * @param {string} paneName - Pane of conversation ID
   * @returns {number} z-index waarde
   */
  const getZIndex = useCallback((paneName) => {
    // FIX: Gebruik paneOrderRef voor actuele waarde
    const currentOrder = paneOrderRef.current;
    const index = currentOrder.indexOf(paneName);
    
    // Actieve pane krijgt hoogste z-index
    if (activePaneRef.current === paneName) {
      return 1000;
    }
    
    // Andere panes op basis van positie in order
    return 100 + (index >= 0 ? index : 0);
  }, []); // FIX: Geen dependencies - we gebruiken refs

  /**
   * Handle taskbar click.
   * @param {string} paneName - Pane of conversation ID
   */
  const handleTaskbarClick = useCallback((paneName) => {
    // Check of het een conversation is
    if (paneName.startsWith('conv_')) {
      setConversations(prev => {
        const conv = prev[paneName];
        if (!conv) return prev;

        if (conv.isMinimized) {
          // Restore
          setActivePane(paneName);
          setPaneOrder(order => {
            const filtered = order.filter(p => p !== paneName);
            return [...filtered, paneName];
          });
          return {
            ...prev,
            [paneName]: { ...prev[paneName], isMinimized: false }
          };
        } else if (activePaneRef.current === paneName) {
          // Minimize
          return {
            ...prev,
            [paneName]: { ...prev[paneName], isMinimized: true }
          };
        } else {
          // Focus
          setActivePane(paneName);
          setPaneOrder(order => {
            const filtered = order.filter(p => p !== paneName);
            return [...filtered, paneName];
          });
          return prev;
        }
      });
      return;
    }

    // Normale pane
    setPanes(prev => {
      const pane = prev[paneName];
      if (!pane) return prev;

      if (pane.isMinimized) {
        // Restore
        setActivePane(paneName);
        setPaneOrder(order => {
          const filtered = order.filter(p => p !== paneName);
          return [...filtered, paneName];
        });
        return {
          ...prev,
          [paneName]: { ...prev[paneName], isMinimized: false }
        };
      } else if (activePaneRef.current === paneName) {
        // Minimize
        return {
          ...prev,
          [paneName]: { ...prev[paneName], isMinimized: true }
        };
      } else {
        // Focus
        setActivePane(paneName);
        setPaneOrder(order => {
          const filtered = order.filter(p => p !== paneName);
          return [...filtered, paneName];
        });
        return prev;
      }
    });
  }, []);

  /**
   * Handle size change voor een pane.
   * @param {string} paneName - Pane ID
   * @param {Object} newSize - Nieuwe grootte { width, height }
   */
  const handleSizeChange = useCallback((paneName, newSize) => {
    setSavedSizes(prev => ({
      ...prev,
      [paneName]: newSize
    }));
  }, []);

  /**
   * Handle position change voor een pane.
   * @param {string} paneName - Pane ID
   * @param {Object} newPosition - Nieuwe positie { left, top }
   */
  const handlePositionChange = useCallback((paneName, newPosition) => {
    setSavedPositions(prev => ({
      ...prev,
      [paneName]: newPosition
    }));
  }, []);

  /**
   * Get initial position voor een pane.
   * @param {string} paneName - Pane ID
   * @returns {Object} Positie { left, top }
   */
  const getInitialPosition = useCallback((paneName) => {
    if (savedPositions[paneName]) {
      return savedPositions[paneName];
    }
    return {
      left: 100 + cascadeOffset,
      top: 50 + cascadeOffset
    };
  }, [savedPositions, cascadeOffset]);

  /**
   * Reset alle panes en conversations.
   * Gebruik bij logout.
   */
  const resetAll = useCallback(() => {
    setPanes(getInitialPaneState());
    setPaneOrder([]);
    setActivePane(null);
    setSavedSizes({});
    setSavedPositions({});
    setCascadeOffset(0);
    setConversations({});
    setIsStartOpen(false);
    console.log('[usePaneManager] Reset all');
  }, []);

  /**
   * Toggle start menu.
   */
  const toggleStartMenu = useCallback(() => {
    setIsStartOpen(prev => !prev);
  }, []);

  /**
   * Close start menu.
   */
  const closeStartMenu = useCallback(() => {
    setIsStartOpen(false);
  }, []);

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    panes,
    paneOrder,
    activePane,
    savedSizes,
    savedPositions,
    conversations,
    isStartOpen,
    
    // Refs (voor listeners)
    conversationsRef,
    activePaneRef,

    // Pane actions
    openPane,
    closePane,
    minimizePane,
    toggleMaximizePane,
    focusPane,

    // Conversation actions
    openConversation,
    closeConversation,
    minimizeConversation,
    toggleMaximizeConversation,

    // Helpers
    getZIndex,
    handleTaskbarClick,
    handleSizeChange,
    handlePositionChange,
    getInitialPosition,
    
    // Start menu
    toggleStartMenu,
    closeStartMenu,

    // Reset
    resetAll
  };
}

export default usePaneManager;