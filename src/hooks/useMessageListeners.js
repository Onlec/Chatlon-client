// src/hooks/useMessageListeners.js
/**
 * Message Listeners Hook
 * 
 * Beheert alle Gun.js listeners voor berichten en friend requests.
 * Dit is de meest complexe hook - behandelt real-time message notifications.
 */

import { useEffect, useRef, useCallback } from 'react';
import { gun, user } from '../gun';
import { getContactPairId, getAvatarUrl } from '../utils/chatUtils';

/**
 * Hook voor message en friend request listeners.
 * 
 * @param {Object} options - Configuratie opties
 * @param {boolean} options.isLoggedIn - Of de gebruiker is ingelogd
 * @param {string} options.currentUser - Huidige username
 * @param {React.MutableRefObject} options.conversationsRef - Ref naar conversations state
 * @param {React.MutableRefObject} options.activePaneRef - Ref naar active pane state
 * @param {Function} options.showToast - Functie om toast te tonen
 * @param {React.MutableRefObject} options.shownToastsRef - Ref voor duplicate tracking
 * @returns {Object} Listener controls
 * 
 * @example
 * const { cleanup } = useMessageListeners({
 *   isLoggedIn,
 *   currentUser,
 *   conversationsRef,
 *   activePaneRef,
 *   showToast,
 *   shownToastsRef
 * });
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

  /**
   * Check of een conversation open en actief is.
   * @param {string} contactName - Contact naam
   * @returns {boolean}
   */
  const isConversationActive = useCallback((contactName) => {
    const convId = `conv_${contactName}`;
    const conv = conversationsRef.current[convId];
    
    const isConvOpen = conv && conv.isOpen && !conv.isMinimized;
    const isConvActive = activePaneRef.current === convId;
    
    return isConvOpen && isConvActive;
  }, [conversationsRef, activePaneRef]);

  /**
   * Setup listener voor friend requests.
   */
  const setupFriendRequestListener = useCallback(() => {
    if (!user.is || !currentUser) return;

    const listenerStartTime = Date.now();
    console.log('[useMessageListeners] Setting up friend request listener for:', currentUser);

    // Luister naar nieuwe vriendenverzoeken in public space
    const friendRequestsNode = gun.get('friendRequests').get(currentUser);
    
    friendRequestsNode.map().on((requestData, requestId) => {
      if (!requestData || !requestData.from || requestData.status !== 'pending') {
        return;
      }

      const requestTimestamp = requestData.timestamp || 0;

      // Check of verzoek VOOR listener start was (oude verzoeken)
      if (requestTimestamp < listenerStartTime) {
        console.log('[useMessageListeners] Old friend request, skipping');
        return;
      }

      // Duplicate check
      const toastKey = `friendreq_${requestData.from}_${requestTimestamp}`;
      if (shownToastsRef.current.has(toastKey)) {
        console.log('[useMessageListeners] Friend request toast already shown');
        return;
      }

      // Markeer als getoond
      shownToastsRef.current.add(toastKey);
      console.log('[useMessageListeners] Showing friend request toast from:', requestData.from);

      // Toon toast
      showToast({
        from: requestData.from,
        message: 'wil je toevoegen als contact',
        avatar: getAvatarUrl(requestData.from),
        type: 'friendRequest',
        requestId: requestId
      });
    });

    // Store cleanup reference
    friendRequestListenerRef.current = () => {
      friendRequestsNode.off();
    };
  }, [currentUser, showToast, shownToastsRef]);

  /**
   * Setup listener voor messages van een specifiek contact.
   * @param {string} contactName - Contact naam
   * @param {string} pairId - Contact pair ID
   */
  const setupContactMessageListener = useCallback((contactName, pairId) => {
    // Als we AL een listener hebben voor dit contact pair, SKIP!
    if (messageListenersRef.current[pairId]) {
      console.log('[useMessageListeners] Listener already exists for:', pairId);
      return;
    }

    console.log('[useMessageListeners] Setting up NEW session listener for:', pairId);

    let currentSessionListener = null;

    // Luister naar de ACTIVE_SESSIONS node voor dit contact pair
    const activeSessionNode = gun.get('ACTIVE_SESSIONS').get(pairId);

    activeSessionNode.on((sessionData) => {
      if (!sessionData || !sessionData.sessionId) {
        console.log('[useMessageListeners] No active session for:', pairId);
        // Cleanup oude listener als sessie dood is
        if (currentSessionListener) {
          currentSessionListener();
          currentSessionListener = null;
        }
        return;
      }

      const activeSessionId = sessionData.sessionId;

      // Parse openBy van JSON string
      let openBy = [];
      try {
        openBy = sessionData.openBy ? JSON.parse(sessionData.openBy) : [];
      } catch (e) {
        openBy = Array.isArray(sessionData.openBy) ? sessionData.openBy : [sessionData.openBy];
      }

      console.log('[useMessageListeners] Active session for', pairId, ':', activeSessionId);

      // Cleanup oude session listener als er een nieuwe sessie is
      if (currentSessionListener) {
        console.log('[useMessageListeners] Cleaning up old session listener');
        currentSessionListener();
      }

      // Timestamp wanneer DEZE listener start
      const thisListenerStartTime = Date.now();

      // Setup nieuwe listener voor deze actieve sessie
      const chatNode = gun.get(activeSessionId);

      chatNode.map().on((data, id) => {
        // Validatie checks
        if (!data || !data.content || !data.sender || !data.timeRef) return;
        if (!user.is) return;
        if (data.sender === user.is.alias) return; // Self-messaging
        if (data.sender !== contactName) return; // Verkeerde contact

        const messageTimestamp = data.timeRef;

        // Check of bericht VOOR deze listener start was
        if (messageTimestamp < thisListenerStartTime) {
          return;
        }

        console.log('[useMessageListeners] NEW message from:', contactName);

        // Check of conversation open en actief is
        const shouldShowToast = !isConversationActive(contactName);

        if (shouldShowToast) {
          // Duplicate check
          const toastKey = `${contactName}_${messageTimestamp}_${activeSessionId}`;
          if (shownToastsRef.current.has(toastKey)) {
            console.log('[useMessageListeners] Toast already shown for message');
            return;
          }

          // Markeer als getoond
          shownToastsRef.current.add(toastKey);

          // Toon toast
          showToast({
            from: contactName,
            message: data.content,
            avatar: getAvatarUrl(contactName),
            contactName: contactName,
            type: 'message',
            messageId: id,
            sessionId: activeSessionId
          });
        }
      });

      // Store cleanup function
      currentSessionListener = () => {
        chatNode.off();
      };
    });

    // Markeer dat we een listener hebben voor dit contact pair
    messageListenersRef.current[pairId] = {
      cleanup: () => {
        activeSessionNode.off();
        if (currentSessionListener) {
          currentSessionListener();
        }
      }
    };
  }, [currentUser, showToast, shownToastsRef, isConversationActive]);

  /**
   * Setup listeners voor alle contacten.
   */
  const setupMessageListeners = useCallback(() => {
    if (!user.is || !currentUser) return;

    console.log('[useMessageListeners] Setting up message listeners for:', currentUser);
    listenerStartTimeRef.current = Date.now();

    // Luister naar contactenlijst
    user.get('contacts').map().on((contactData) => {
      if (contactData && contactData.status === 'accepted') {
        const contactName = contactData.username;
        const pairId = getContactPairId(currentUser, contactName);
        
        setupContactMessageListener(contactName, pairId);
      }
    });
  }, [currentUser, setupContactMessageListener]);

  /**
   * Cleanup alle listeners.
   */
  const cleanup = useCallback(() => {
    console.log('[useMessageListeners] Cleaning up all listeners');

    // Cleanup friend request listener
    if (friendRequestListenerRef.current) {
      friendRequestListenerRef.current();
      friendRequestListenerRef.current = null;
    }

    // Cleanup message listeners
    Object.values(messageListenersRef.current).forEach(listener => {
      if (listener.cleanup) {
        listener.cleanup();
      }
    });
    messageListenersRef.current = {};
  }, []);

  // ============================================
  // EFFECTS
  // ============================================

  // Setup listeners when logged in
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    // Kleine delay om te zorgen dat Gun auth compleet is
    const timer = setTimeout(() => {
      setupMessageListeners();
      setupFriendRequestListener();
    }, 500);

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [isLoggedIn, currentUser, setupMessageListeners, setupFriendRequestListener, cleanup]);

  // ============================================
  // RETURN
  // ============================================

  return {
    cleanup,
    setupMessageListeners,
    setupFriendRequestListener,
    messageListenersRef
  };
}

export default useMessageListeners;