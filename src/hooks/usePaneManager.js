// src/hooks/usePaneManager.js
/**
 * Facade hook for pane/window management.
 *
 * This module intentionally preserves the legacy App contract while internally
 * delegating to specialized managers:
 * - useWindowManager
 * - useTaskbarManager
 * - useStartMenuManager
 *
 * Keep external consumers on this facade until migration is fully completed.
 */

import { useCallback, useState } from 'react';
import { log } from '../utils/debug';
import { useWindowManager } from './useWindowManager';
import { useTaskbarManager } from './useTaskbarManager';
import { useStartMenuManager } from './useStartMenuManager';

export function usePaneManager() {
  const window = useWindowManager();
  const startMenu = useStartMenuManager();
  const [unreadMetadata, setUnreadMetadata] = useState({});

  const setNotificationTime = useCallback((contactName, timeRef) => {
    setUnreadMetadata((prev) => {
      if (prev[contactName]) return prev;
      return {
        ...prev,
        [contactName]: timeRef
      };
    });
  }, []);

  const clearNotificationTime = useCallback((contactName) => {
    setUnreadMetadata((prev) => {
      const newMetadata = { ...prev };
      delete newMetadata[contactName];
      return newMetadata;
    });
  }, []);

  const closeConversation = useCallback((convId) => {
    window.closeConversation(convId, (contactName) => {
      clearNotificationTime(contactName);
    });
  }, [clearNotificationTime, window]);

  const { handleTaskbarClick } = useTaskbarManager({
    setConversations: window.setConversations,
    setPanes: window.setPanes,
    setActivePane: window.setActivePane,
    paneOrderRef: window.paneOrderRef,
    conversationsRef: window.conversationsRef,
    panesRef: window.panesRef,
    activePaneRef: window.activePaneRef
  });

  const resetAll = useCallback(() => {
    window.resetWindowState();
    startMenu.setIsStartOpen(false);
    log('[usePaneManager] Reset all');
  }, [startMenu, window]);

  return {
    // State
    panes: window.panes,
    paneOrder: window.paneOrder,
    activePane: window.activePane,
    savedSizes: window.savedSizes,
    savedPositions: window.savedPositions,
    conversations: window.conversations,
    unreadMetadata,
    isStartOpen: startMenu.isStartOpen,

    // Refs
    conversationsRef: window.conversationsRef,
    activePaneRef: window.activePaneRef,

    // Pane actions
    openPane: window.openPane,
    closePane: window.closePane,
    minimizePane: window.minimizePane,
    toggleMaximizePane: window.toggleMaximizePane,
    focusPane: window.focusPane,

    // Conversation actions
    openConversation: window.openConversation,
    setNotificationTime,
    clearNotificationTime,
    closeConversation,
    closeAllConversations: window.closeAllConversations,
    closeAllGames: window.closeAllGames,
    minimizeConversation: window.minimizeConversation,
    toggleMaximizeConversation: window.toggleMaximizeConversation,

    // Game actions
    games: window.games,
    openGamePane: window.openGamePane,
    closeGamePane: window.closeGamePane,
    minimizeGamePane: window.minimizeGamePane,
    toggleMaximizeGamePane: window.toggleMaximizeGamePane,

    // Helpers
    getZIndex: window.getZIndex,
    handleTaskbarClick,
    handleSizeChange: window.handleSizeChange,
    handlePositionChange: window.handlePositionChange,
    getInitialPosition: window.getInitialPosition,

    // Start menu
    toggleStartMenu: startMenu.toggleStartMenu,
    closeStartMenu: startMenu.closeStartMenu,

    // Reset
    resetAll
  };
}

export default usePaneManager;
