// src/hooks/usePaneManager.js
import { useState, useRef, useEffect } from 'react';
import { getInitialPaneState } from '../paneConfig';

export function useWindowManager() {
  const [panes, setPanes] = useState(getInitialPaneState());
  const [paneOrder, setPaneOrder] = useState([]);
  const [activePane, setActivePane] = useState(null);
  const [savedSizes, setSavedSizes] = useState({});
  const [savedPositions, setSavedPositions] = useState({});
  const [cascadeOffset, setCascadeOffset] = useState(0);
  const [conversations, setConversations] = useState({});
  
  const conversationsRef = useRef({});
  const activePaneRef = useRef(null);

  // Sync refs
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  useEffect(() => { activePaneRef.current = activePane; }, [activePane]);

  // Pane operations
  const openPane = (paneName) => { /* ... */ };
  const closePane = (paneName) => { /* ... */ };
  const minimizePane = (paneName) => { /* ... */ };
  const toggleMaximizePane = (paneName) => { /* ... */ };
  const focusPane = (paneName) => { /* ... */ };

  // Conversation operations
  const openConversation = (contactName) => { /* ... */ };
  const closeConversation = (convId) => { /* ... */ };
  const minimizeConversation = (convId) => { /* ... */ };
  const toggleMaximizeConversation = (convId) => { /* ... */ };

  // Helpers
  const getZIndex = (paneName) => { /* ... */ };
  const handleTaskbarClick = (paneName) => { /* ... */ };
  const handleSizeChange = (paneName, newSize) => { /* ... */ };
  const handlePositionChange = (paneName, newPosition) => { /* ... */ };
  const getInitialPosition = (paneName) => { /* ... */ };

  const resetAll = () => {
    setPanes(getInitialPaneState());
    setPaneOrder([]);
    setActivePane(null);
  };

  return {
    // State
    panes,
    paneOrder,
    activePane,
    savedSizes,
    savedPositions,
    conversations,
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
    resetAll
  };
}