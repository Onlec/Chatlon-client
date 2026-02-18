// src/hooks/useMessageListeners.js
/**
 * Message Listeners Hook - OPTIE A
 * 
 * Simpele "oudste sessie wint" logica.
 * Geen openBy tracking nodig, geen cleanup nodig.
 * 
 * Luistert naar ACTIVE_SESSIONS en volgt automatisch de actieve sessie.
 */

import { useEffect, useRef, useCallback } from 'react';
import { gun, user } from '../gun';
import { getContactPairId } from '../utils/chatUtils';
import { log } from '../utils/debug';
import { createListenerManager } from '../utils/gunListenerManager';
import { decryptMessage } from '../utils/encryption';

/**
 * Hook voor message en friend request listeners.
 */
export function useMessageListeners({
  isLoggedIn,
  currentUser,
  conversationsRef,
  activePaneRef,
  showToast,
  shownToastsRef,
  onMessage,
  onNotification,
  getAvatar
}) {
  // Tracking refs
  const listenersRef = useRef(createListenerManager());
  const listenerStartTimeRef = useRef(null);
  const activeSessionsRef = useRef({});

  /**
   * Check of een conversation open en actief is.
   */
  const isConversationActive = useCallback((contactName) => {
    const convId = `conv_${contactName}`;
    const conv = conversationsRef.current[convId];
    
    const isConvOpen = conv && conv.isOpen && !conv.isMinimized;
    const isConvActive = activePaneRef.current === convId;
    
    log('[useMessageListeners] isConversationActive check:', {
      contactName,
      convId,
      hasConv: !!conv,
      isOpen: conv?.isOpen,
      isMinimized: conv?.isMinimized,
      result: isConvOpen && isConvActive
    });
    
    return isConvOpen && isConvActive;
  }, [conversationsRef, activePaneRef]);

  /**
   * Setup listener voor friend requests.
   */
  const setupFriendRequestListener = useCallback(() => {
    if (!user.is || !currentUser) return;

    const listenerStartTime = Date.now();
    log('[useMessageListeners] Setting up friend request listener for:', currentUser);

    const friendRequestsNode = gun.get('friendRequests').get(currentUser);
    
    friendRequestsNode.map().on((requestData, requestId) => {
      if (!requestData || !requestData.from || requestData.status !== 'pending') {
        return;
      }

      const requestTimestamp = requestData.timestamp || 0;

      if (requestTimestamp < listenerStartTime) {
        return;
      }

      const toastKey = `friendreq_${requestData.from}_${requestTimestamp}`;
      if (shownToastsRef.current.has(toastKey)) {
        return;
      }

      shownToastsRef.current.add(toastKey);
      log('[useMessageListeners] Showing friend request toast from:', requestData.from);

      showToast({
        from: requestData.from,
        message: 'wil je toevoegen als contact',
        avatar: getAvatar(requestData.from),
        type: 'friendRequest',
        requestId: requestId
      });
    });

    listenersRef.current.add('friendRequests', friendRequestsNode);
  }, [currentUser, showToast, shownToastsRef, getAvatar]);

  /**
   * Setup listener voor messages van een specifiek contact.
   * OPTIE A: Simpele sessie tracking - volg ACTIVE_SESSIONS
   */
  const setupContactMessageListener = useCallback((contactName, pairId) => {
  // 1. Voorkom dubbele listeners per contact (Ref blijft bestaan tussen renders)
  if (listenersRef.current.has(pairId)) {
    return;
  }

  log(`[useMessageListeners] 🛡️ Start persistente listener voor: ${contactName}`);

  let currentSessionId = null;
  const activeSessionNode = gun.get('ACTIVE_SESSIONS').get(pairId);

  // We luisteren specifiek naar de sessionId pointer
  activeSessionNode.get('sessionId').on((activeSessionId) => {
    if (!activeSessionId || activeSessionId === currentSessionId) return;
    
    currentSessionId = activeSessionId;
    log(`[useMessageListeners] 📡 Hook verbonden met sessie-node: ${activeSessionId}`);

    gun.get(activeSessionId).map().on(async (data, id) => {
      if (!data || !data.content || !data.sender) return;
      if (data.sender === (user.is && user.is.alias)) return;

      const msgKey = `processed_${id}`;
      if (shownToastsRef.current.has(msgKey)) return;
      shownToastsRef.current.add(msgKey);

      const now = Date.now();
      const isRecent = data.timeRef > (now - 15000);

      if (isRecent) {
        log('[useMessageListeners] 📨 Bericht ontvangen:', contactName);

        // Decrypt voor preview
        const decryptedContent = await decryptMessage(data.content, contactName);

        // Geef door aan App.js (voor de oranje taakbalk)
        if (onMessage) {
          onMessage({ ...data, content: decryptedContent }, contactName, id, activeSessionId);
        }

        // Toon Toast als het venster niet gefocust is
        
        if (!isConversationActive(contactName)) {
            if (onNotification) {
            onNotification(contactName, data.timeRef);
          }
          showToast({
            from: contactName,
            message: decryptedContent,
            avatar: getAvatar(contactName),
            contactName: contactName,
            type: 'message',
            messageId: id,
            sessionId: activeSessionId
          });
        }
      }
    });
  });

  // Markeer als actief zonder cleanup toe te voegen
  listenersRef.current.add(pairId, activeSessionNode);
  
}, [onMessage, isConversationActive, showToast, getAvatar, onNotification, shownToastsRef]);
  /**
   * Setup listeners voor alle contacten.
   */
  const setupMessageListeners = useCallback(() => {
    if (!user.is || !currentUser) return;

    log('[useMessageListeners] 🚀 Setting up message listeners for:', currentUser);
    listenerStartTimeRef.current = Date.now();

    user.get('contacts').map().on((contactData) => {
      if (contactData && contactData.status === 'accepted') {
        const contactName = contactData.username;
        const pairId = getContactPairId(currentUser, contactName);
        
        log('[useMessageListeners] 📋 Setting up listener for contact:', contactName);
        setupContactMessageListener(contactName, pairId);
      }
    });
  }, [currentUser, setupContactMessageListener]);

  /**
   * Cleanup alle listeners.
   */
  const cleanup = useCallback(() => {
    log('[useMessageListeners] 🧹 Cleaning up all listeners');
    listenersRef.current.cleanup();
    activeSessionsRef.current = {};
  }, []);

  // Setup listeners when logged in
useEffect(() => {
  if (!isLoggedIn || !currentUser) return;

  // Alleen opstarten als er nog geen listeners zijn
  if (listenersRef.current.size === 0) {
    log('[useMessageListeners] 🚀 Initializing persistent listeners...');
    setupMessageListeners();
    setupFriendRequestListener();
  }

  // Verwijder de cleanup die alles stopt bij elke kleine re-render
  // Alleen cleanen bij ECHTE logout (gebeurt in handleLogoff in App.js)
}, [isLoggedIn, currentUser]);

  return {
    cleanup,
    setupMessageListeners,
    setupFriendRequestListener,
    listenersRef,
    activeSessionsRef
  };
}

export default useMessageListeners;