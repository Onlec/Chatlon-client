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
import { getContactPairId, getAvatarUrl } from '../utils/chatUtils';

/**
 * Hook voor message en friend request listeners.
 */
export function useMessageListeners({
  isLoggedIn,
  currentUser,
  conversationsRef,
  activePaneRef,
  showToast,
  shownToastsRef
}) {
  // Tracking refs
  const messageListenersRef = useRef({});
  const friendRequestListenerRef = useRef(null);
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
    
    console.log('[useMessageListeners] isConversationActive check:', {
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
    console.log('[useMessageListeners] Setting up friend request listener for:', currentUser);

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
      console.log('[useMessageListeners] Showing friend request toast from:', requestData.from);

      showToast({
        from: requestData.from,
        message: 'wil je toevoegen als contact',
        avatar: getAvatarUrl(requestData.from),
        type: 'friendRequest',
        requestId: requestId
      });
    });

    friendRequestListenerRef.current = () => {
      friendRequestsNode.off();
    };
  }, [currentUser, showToast, shownToastsRef]);

  /**
   * Setup listener voor messages van een specifiek contact.
   * OPTIE A: Simpele sessie tracking - volg ACTIVE_SESSIONS
   */
  const setupContactMessageListener = useCallback((contactName, pairId) => {
    if (messageListenersRef.current[pairId]) {
      console.log('[useMessageListeners] Listener already exists for:', pairId);
      return;
    }

    console.log('[useMessageListeners] ✅ Setting up session listener for:', pairId);

    let currentSessionListener = null;
    let currentListeningSessionId = null;
    const listenerCreatedAt = Date.now();

    // Luister naar de ACTIVE_SESSIONS node
    const activeSessionNode = gun.get('ACTIVE_SESSIONS').get(pairId);

    activeSessionNode.on((sessionData) => {
      // Check of sessie data geldig is
      if (!sessionData || !sessionData.sessionId) {
        console.log('[useMessageListeners] No session data for:', pairId);
        
        if (currentSessionListener) {
          currentSessionListener();
          currentSessionListener = null;
          currentListeningSessionId = null;
        }
        delete activeSessionsRef.current[pairId];
        return;
      }

      const activeSessionId = sessionData.sessionId;
      const sessionTimestamp = parseInt(activeSessionId.split('_').pop()) || 0;

      // OPTIE A LOGICA: Alleen luisteren naar sessies die NIEUWER zijn dan onze listener
      // Dit voorkomt dat oude zombie sessies worden opgepikt
      if (sessionTimestamp < listenerCreatedAt - 5000) {
        // Sessie is ouder dan onze listener - waarschijnlijk stale data
        console.log('[useMessageListeners] ⏭️ Ignoring stale session:', activeSessionId);
        return;
      }

      // Skip als we al naar deze sessie luisteren
      if (currentListeningSessionId === activeSessionId) {
        return;
      }

      console.log('[useMessageListeners] 🔄 New session for', pairId, ':', activeSessionId);

      // Cleanup oude session listener
      if (currentSessionListener) {
        console.log('[useMessageListeners] Cleaning up old session listener');
        currentSessionListener();
      }

      currentListeningSessionId = activeSessionId;
      activeSessionsRef.current[pairId] = {
        sessionId: activeSessionId,
        startTime: sessionTimestamp
      };

      // Track processed messages
      const processedMessages = new Set();

      // Setup listener voor berichten in deze sessie
      const chatNode = gun.get(activeSessionId);

      chatNode.map().on((data, id) => {
        if (!data || !data.content || !data.sender || !data.timeRef) {
          return;
        }
        
        if (!user.is) return;
        
        // Skip eigen berichten
        if (data.sender === user.is.alias) {
          return;
        }
        
        // Alleen berichten van het juiste contact
        if (data.sender !== contactName) {
          return;
        }

        // Skip duplicates
        if (processedMessages.has(id)) {
          return;
        }
        processedMessages.add(id);

        // Filter oude berichten
        if (data.timeRef < sessionTimestamp - 1000) {
          console.log('[useMessageListeners] ⏭️ Skipping old message:', id);
          return;
        }
        
        console.log('[useMessageListeners] 📨 NEW message from:', contactName);
        console.log('[useMessageListeners] Content preview:', data.content.substring(0, 30));

        // Check of toast nodig is
        const shouldShowToast = !isConversationActive(contactName);

        console.log('[useMessageListeners] 🔔 Should show toast:', shouldShowToast);

        if (shouldShowToast) {
          const toastKey = `msg_${contactName}_${id}_${activeSessionId}`;
          
          if (shownToastsRef.current.has(toastKey)) {
            console.log('[useMessageListeners] ⚠️ Toast already shown:', toastKey);
            return;
          }

          console.log('[useMessageListeners] ✅ SHOWING TOAST for message from:', contactName);
          shownToastsRef.current.add(toastKey);

          showToast({
            from: contactName,
            message: data.content,
            avatar: getAvatarUrl(contactName),
            contactName: contactName,
            type: 'message',
            messageId: id,
            sessionId: activeSessionId
          });
        } else {
          console.log('[useMessageListeners] ❌ NOT showing toast - conversation is active');
        }
      });

      currentSessionListener = () => {
        chatNode.off();
      };
    });

    // Store cleanup
    messageListenersRef.current[pairId] = {
      cleanup: () => {
        activeSessionNode.off();
        if (currentSessionListener) {
          currentSessionListener();
        }
        delete activeSessionsRef.current[pairId];
      }
    };
  }, [currentUser, showToast, shownToastsRef, isConversationActive]);

  /**
   * Setup listeners voor alle contacten.
   */
  const setupMessageListeners = useCallback(() => {
    if (!user.is || !currentUser) return;

    console.log('[useMessageListeners] 🚀 Setting up message listeners for:', currentUser);
    listenerStartTimeRef.current = Date.now();

    user.get('contacts').map().on((contactData) => {
      if (contactData && contactData.status === 'accepted') {
        const contactName = contactData.username;
        const pairId = getContactPairId(currentUser, contactName);
        
        console.log('[useMessageListeners] 📋 Setting up listener for contact:', contactName);
        setupContactMessageListener(contactName, pairId);
      }
    });
  }, [currentUser, setupContactMessageListener]);

  /**
   * Cleanup alle listeners.
   */
  const cleanup = useCallback(() => {
    console.log('[useMessageListeners] 🧹 Cleaning up all listeners');

    if (friendRequestListenerRef.current) {
      friendRequestListenerRef.current();
      friendRequestListenerRef.current = null;
    }

    Object.values(messageListenersRef.current).forEach(listener => {
      if (listener.cleanup) {
        listener.cleanup();
      }
    });
    messageListenersRef.current = {};
    activeSessionsRef.current = {};
  }, []);

  // Setup listeners when logged in
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    console.log('[useMessageListeners] 🎬 Initializing listeners...');

    const timer = setTimeout(() => {
      setupMessageListeners();
      setupFriendRequestListener();
    }, 500);

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [isLoggedIn, currentUser, setupMessageListeners, setupFriendRequestListener, cleanup]);

  return {
    cleanup,
    setupMessageListeners,
    setupFriendRequestListener,
    messageListenersRef,
    activeSessionsRef
  };
}

export default useMessageListeners;