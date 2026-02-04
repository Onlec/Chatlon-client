// src/hooks/useMessageListeners.js
import { useEffect, useRef } from 'react';
import { gun, user } from '../gun';

export function useMessageListeners(isLoggedIn, conversationsRef, activePaneRef, onShowToast) {
  const messageListenersRef = useRef({});
  const shownToastsRef = useRef(new Set());

  const setupMessageListeners = () => { /* ... */ };
  const setupFriendRequestListener = () => { /* ... */ };

  useEffect(() => {
    if (!isLoggedIn) return;
    
    setupMessageListeners();
    setupFriendRequestListener();
    
    return () => {
      // Cleanup listeners
    };
  }, [isLoggedIn]);

  return { shownToastsRef }; // Als App.js dit nog nodig heeft
}