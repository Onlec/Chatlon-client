// src/hooks/usePaneManager.js
/**
 * Pane/Window Manager Hook
 * 
 * Beheert alle window/pane operaties voor de desktop omgeving.
 * Ondersteunt normale panes en dynamische conversation panes.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { paneConfig, getInitialPaneState } from '../paneConfig';
import { log } from '../utils/debug';

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
  const [unreadMetadata, setUnreadMetadata] = useState({});

  // Refs voor real-time access in callbacks/listeners
  const conversationsRef = useRef({});
  const activePaneRef = useRef(null);
  const paneOrderRef = useRef([]); // FIX: Ref voor paneOrder
  const panesRef = useRef({});

  // Sync refs met state
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    activePaneRef.current = activePane;
  }, [activePane]);

  useEffect(() => {
    panesRef.current = panes;
  }, [panes]);

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
  log('[usePaneManager] Opening pane:', paneName);
  setPanes(prev => {
    const pane = prev[paneName];

    // Al open en zichtbaar — niets wijzigen, focusPane handelt de rest
    if (pane?.isOpen && !pane?.isMinimized) return prev;

    // Open maar geminimaliseerd — alleen restoren
    if (pane?.isOpen && pane?.isMinimized) {
      return {
        ...prev,
        [paneName]: { ...prev[paneName], isMinimized: false }
      };
    }

    // Nog niet open — nieuw openen met cascade positie
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

  // Alleen aan paneOrder toevoegen als het er nog niet in zit
  setPaneOrder(prev => {
    if (prev.includes(paneName)) return prev;
    return [...prev, paneName];
  });

  setActivePane(paneName);
}, [getNextCascadeOffset]);

  /**
   * Sluit een pane.
   * @param {string} paneName - Naam van de pane
   */
  const closePane = useCallback((paneName) => {
    log('[usePaneManager] Closing pane:', paneName);
    
    setPanes(prev => ({
      ...prev,
      [paneName]: { isOpen: false, isMinimized: false, isMaximized: false }
    }));

    setPaneOrder(prev => prev.filter(p => p !== paneName));

    // FIX: Gebruik refs om het volgende zichtbare venster te vinden
    setActivePane(prev => {
      if (prev !== paneName) return prev;
      const remaining = paneOrderRef.current.filter(p => {
        if (p === paneName) return false;
        if (p.startsWith('conv_')) {
          const conv = conversationsRef.current[p];
          return conv && conv.isOpen && !conv.isMinimized;
        }
        const pane = panesRef.current[p];
        return pane && pane.isOpen && !pane.isMinimized;
      });
      return remaining[remaining.length - 1] || null;
    });
  }, []);

  /**
   * Minimaliseer een pane.
   * @param {string} paneName - Naam van de pane
   */
  const minimizePane = useCallback((paneName) => {
    log('[usePaneManager] Minimizing pane:', paneName);
    
    setPanes(prev => ({
      ...prev,
      [paneName]: { ...prev[paneName], isMinimized: true }
    }));

    // FIX: Update active pane naar volgende zichtbare venster
    setActivePane(prev => {
      if (prev !== paneName) return prev;
      const visiblePanes = paneOrderRef.current.filter(p => {
        if (p === paneName) return false;
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

  /**
   * Toggle maximize voor een pane.
   * @param {string} paneName - Naam van de pane
   */
  const toggleMaximizePane = useCallback((paneName) => {
    log('[usePaneManager] Toggling maximize:', paneName);
    
    setPanes(prev => ({
      ...prev,
      [paneName]: { ...prev[paneName], isMaximized: !prev[paneName].isMaximized }
    }));
  }, []);

/**
   * Registreer de tijdstempel van een inkomende melding.
   * Wordt aangeroepen door useMessageListeners via App.js.
   */
  const setNotificationTime = useCallback((contactName, timeRef) => {
  setUnreadMetadata(prev => {
    // Als er al een tijd staat voor dit contact, NIET overschrijven.
    // We willen de grens bij het EERSTE ongelezen bericht houden.
    if (prev[contactName]) return prev;
    
    return {
      ...prev,
      [contactName]: timeRef
    };
  });
}, []);



  /**
   * Focus een pane (bring to front).
   * @param {string} paneName - Naam van de pane
   */
const focusPane = useCallback((paneName) => {
    if (!paneName) return;
    setActivePane(paneName);
    // paneOrder blijft ongewijzigd
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
    log('[usePaneManager] Opening conversation:', convId);
    const offset = getNextCascadeOffset();
    
    setConversations(prev => {
      if (!prev[convId]) {
        // Nieuwe conversation
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
  }, [getNextCascadeOffset]);

  const clearNotificationTime = useCallback((contactName) => {
  setUnreadMetadata(prev => {
    const newMetadata = { ...prev };
    delete newMetadata[contactName];
    return newMetadata;
  });
}, []);
  /**
   * Sluit een conversation.
   * @param {string} convId - Conversation ID (conv_<contactName>)
   */
  const closeConversation = useCallback((convId) => {
    log('[usePaneManager] Closing conversation:', convId);
    const contactName = convId.replace('conv_', '');
    clearNotificationTime(contactName); // Ruim de metadata op bij sluiten

    setConversations(prev => {
      const updated = { ...prev };
      delete updated[convId];
      return updated;
    });

    setPaneOrder(prev => prev.filter(p => p !== convId));

    setActivePane(prev => {
      if (prev !== convId) return prev;
      const visiblePanes = paneOrderRef.current.filter(p => {
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
  }, [clearNotificationTime]);

  /**
   * Minimaliseer een conversation.
   * @param {string} convId - Conversation ID
   */
  const minimizeConversation = useCallback((convId) => {
    log('[usePaneManager] Minimizing conversation:', convId);

    setConversations(prev => ({
      ...prev,
      [convId]: { ...prev[convId], isMinimized: true }
    }));

    setActivePane(prev => {
      if (prev !== convId) return prev;
      const visiblePanes = paneOrderRef.current.filter(p => {
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
  // Gebruik de state paneOrder voor de rendering (zodat React her-rendert)
  // en de Ref alleen als fallback voor listeners.
  const currentOrder = paneOrder; 
  const index = currentOrder.indexOf(paneName);
  
  if (index === -1) return 100;

  // De basis is 100 + de plek in de rij (0, 1, 2...)
  const baseZ = 100 + index;

  // Is dit het actieve venster? Geef het een flinke boost.
  return activePane === paneName ? 1000 : baseZ;
}, [paneOrder, activePane]); // BELANGRIJK: voeg deze dependencies toe!



  /**
   * Handle taskbar click.
   * @param {string} paneName - Pane of conversation ID
   */
  const handleTaskbarClick = useCallback((paneName) => {
    // Helper: vind volgende zichtbare pane na minimaliseren
    const clearActivePaneAfterMinimize = (minimizedPane) => {
      setActivePane(prev => {
        if (prev !== minimizedPane) return prev;
        const visiblePanes = paneOrderRef.current.filter(p => {
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

    // Check of het een conversation is
    if (paneName.startsWith('conv_')) {
      setConversations(prev => {
        const conv = prev[paneName];
        if (!conv) return prev;

        if (conv.isMinimized) {
          // Restore
          setActivePane(paneName);
          return {
            ...prev,
            [paneName]: { ...prev[paneName], isMinimized: false }
          };
        } else if (activePaneRef.current === paneName) {
          // Minimize
          clearActivePaneAfterMinimize(paneName);
          return {
            ...prev,
            [paneName]: { ...prev[paneName], isMinimized: true }
          };
        } else {
          // Focus
          setActivePane(paneName);
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
        return {
          ...prev,
          [paneName]: { ...prev[paneName], isMinimized: false }
        };
      } else if (activePaneRef.current === paneName) {
        // Minimize
        clearActivePaneAfterMinimize(paneName);
        return {
          ...prev,
          [paneName]: { ...prev[paneName], isMinimized: true }
        };
      } else {
        // Focus
        setActivePane(paneName);
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

    // Zoek de pane op in normale panes OF conversations
    const paneState = panes[paneName] || conversations[paneName];
    
    // Als we een opgeslagen cascade-positie hebben, gebruik die!
    if (paneState && paneState.initialPos) {
      return paneState.initialPos;
    }

    return { left: 100, top: 50 };
  }, [savedPositions, panes, conversations]);

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
    log('[usePaneManager] Reset all');
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
    unreadMetadata,
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
    setNotificationTime,
    clearNotificationTime,
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