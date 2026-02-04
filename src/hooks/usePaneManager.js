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
 * @typedef {Object} PaneState
 * @property {boolean} isOpen - Of de pane open is
 * @property {boolean} isMinimized - Of de pane geminimaliseerd is
 * @property {boolean} isMaximized - Of de pane gemaximaliseerd is
 */

/**
 * @typedef {Object} ConversationState
 * @property {string} contactName - Naam van het contact
 * @property {boolean} isOpen - Of de conversation open is
 * @property {boolean} isMinimized - Of de conversation geminimaliseerd is
 * @property {boolean} isMaximized - Of de conversation gemaximaliseerd is
 */

/**
 * Hook voor pane/window management.
 * 
 * @returns {Object} Window manager state en functies
 * 
 * @example
 * const {
 *   panes,
 *   conversations,
 *   openPane,
 *   openConversation,
 *   closePane,
 *   ...
 * } = usePaneManager();
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

  // Sync refs met state
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    activePaneRef.current = activePane;
  }, [activePane]);

  // ============================================
  // CASCADE OFFSET HELPER
  // ============================================

  const getNextCascadeOffset = useCallback(() => {
    setCascadeOffset(prev => (prev + 30) % 150);
    return cascadeOffset;
  }, [cascadeOffset]);

  // ============================================
  // PANE OPERATIES
  // ============================================

  /**
   * Open een pane.
   * @param {string} paneName - Naam van de pane (key uit paneConfig)
   */
  const openPane = useCallback((paneName) => {
    setPanes(prev => ({
      ...prev,
      [paneName]: { ...prev[paneName], isOpen: true, isMinimized: false }
    }));
    
    setIsStartOpen(false);
    
    setPaneOrder(prev => {
      if (!prev.includes(paneName)) {
        return [...prev, paneName];
      }
      return prev;
    });
    
    setActivePane(paneName);

    // Cascade offset voor nieuwe positie
    if (!savedPositions[paneName]) {
      getNextCascadeOffset();
    }

    console.log('[usePaneManager] Opened pane:', paneName);
  }, [savedPositions, getNextCascadeOffset]);

  /**
   * Sluit een pane.
   * @param {string} paneName - Naam van de pane
   */
  const closePane = useCallback((paneName) => {
    setPanes(prev => ({
      ...prev,
      [paneName]: { isOpen: false, isMinimized: false, isMaximized: false }
    }));

    setPaneOrder(prev => prev.filter(p => p !== paneName));

    setActivePane(prev => {
      if (prev === paneName) {
        const remaining = paneOrder.filter(p => p !== paneName);
        return remaining[remaining.length - 1] || null;
      }
      return prev;
    });

    console.log('[usePaneManager] Closed pane:', paneName);
  }, [paneOrder]);

  /**
   * Minimaliseer een pane.
   * @param {string} paneName - Naam van de pane
   */
  const minimizePane = useCallback((paneName) => {
    setPanes(prev => ({
      ...prev,
      [paneName]: { ...prev[paneName], isMinimized: true }
    }));

    console.log('[usePaneManager] Minimized pane:', paneName);
  }, []);

  /**
   * Toggle maximize voor een pane.
   * @param {string} paneName - Naam van de pane
   */
  const toggleMaximizePane = useCallback((paneName) => {
    setPanes(prev => ({
      ...prev,
      [paneName]: { ...prev[paneName], isMaximized: !prev[paneName].isMaximized }
    }));

    console.log('[usePaneManager] Toggled maximize pane:', paneName);
  }, []);

  /**
   * Focus een pane (bring to front).
   * @param {string} paneName - Naam van de pane
   */
  const focusPane = useCallback((paneName) => {
    setActivePane(paneName);
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

    console.log('[usePaneManager] Opening conversation with:', contactName);

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
      if (!prev.includes(convId)) {
        return [...prev, convId];
      }
      return prev;
    });

    // Cascade offset voor nieuwe positie
    if (!savedPositions[convId]) {
      getNextCascadeOffset();
    }

    setActivePane(convId);
  }, [savedPositions, getNextCascadeOffset]);

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
        const remaining = paneOrder.filter(p => p !== convId);
        return remaining[remaining.length - 1] || null;
      }
      return prev;
    });
  }, [paneOrder]);

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
  }, []);

  /**
   * Toggle maximize voor een conversation.
   * @param {string} convId - Conversation ID
   */
  const toggleMaximizeConversation = useCallback((convId) => {
    setConversations(prev => ({
      ...prev,
      [convId]: { ...prev[convId], isMaximized: !prev[convId].isMaximized }
    }));
  }, []);

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Get z-index voor een pane/conversation.
   * @param {string} paneName - Pane of conversation ID
   * @returns {number} z-index waarde
   */
  const getZIndex = useCallback((paneName) => {
    if (activePane === paneName) return 1000;
    const index = paneOrder.indexOf(paneName);
    return 100 + index;
  }, [activePane, paneOrder]);

  /**
   * Handle taskbar click.
   * @param {string} paneName - Pane of conversation ID
   */
  const handleTaskbarClick = useCallback((paneName) => {
    // Check of het een conversation is
    if (paneName.startsWith('conv_')) {
      const conv = conversations[paneName];
      if (!conv) return;

      if (conv.isMinimized) {
        setConversations(prev => ({
          ...prev,
          [paneName]: { ...prev[paneName], isMinimized: false }
        }));
        setActivePane(paneName);
      } else if (activePane === paneName) {
        minimizeConversation(paneName);
      } else {
        setActivePane(paneName);
      }
      return;
    }

    // Normale pane
    const pane = panes[paneName];
    if (!pane) return;

    if (pane.isMinimized) {
      setPanes(prev => ({
        ...prev,
        [paneName]: { ...prev[paneName], isMinimized: false }
      }));
      setActivePane(paneName);
    } else if (activePane === paneName) {
      minimizePane(paneName);
    } else {
      setActivePane(paneName);
    }
  }, [panes, conversations, activePane, minimizePane, minimizeConversation]);

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