// src/hooks/useMessageListeners.js
/**
 * Message Listeners Hook
 * 
 * Beheert alle Gun.js listeners voor berichten en friend requests.
 * Dit is de meest complexe hook - behandelt real-time message notifications.
 * 
 * FIX v3: Verbeterde toast notifications met minder strikte filtering
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
   * @param {string} contactName - Contact naam
   * @returns {boolean}
   */
  const isConversationActive = useCallback((contactName) => {
    const convId = `conv_${contactName}`;
    const conv = conversationsRef.current[convId];
    
    const isConvOpen = conv && conv.isOpen && !conv.isMinimized;
    const isConvActive = activePaneRef.current === convId;
    
    // FIX BUG 3: Extra logging voor debugging
    console.log('[useMessageListeners] isConversationActive check:', {
      contactName,
      convId,
      hasConv: !!conv,
      isOpen: conv?.isOpen,
      isMinimized: conv?.isMinimized,
      isConvOpen,
      activePane: activePaneRef.current,
      isConvActive,
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

      // Check of verzoek VOOR listener start was (oude verzoeken)
      if (requestTimestamp < listenerStartTime) {
        return;
      }

      // Duplicate check
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
   * FIX BUG 3: Versoepelde timestamp filtering en betere logging
   */
  const setupContactMessageListener = useCallback((contactName, pairId) => {
    // Als we AL een listener hebben voor dit contact pair, SKIP!
    if (messageListenersRef.current[pairId]) {
      console.log('[useMessageListeners] Listener already exists for:', pairId);
      return;
    }

    console.log('[useMessageListeners] ✅ Setting up session listener for:', pairId);

    let currentSessionListener = null;
    let currentListeningSessionId = null;

    // Luister naar de ACTIVE_SESSIONS node voor dit contact pair
    const activeSessionNode = gun.get('ACTIVE_SESSIONS').get(pairId);

    activeSessionNode.on((sessionData) => {
      // Check of sessie echt actief is
      if (!sessionData || !sessionData.sessionId) {
        console.log('[useMessageListeners] No active session for:', pairId);
        
        // Cleanup oude listener
        if (currentSessionListener) {
          currentSessionListener();
          currentSessionListener = null;
          currentListeningSessionId = null;
        }
        
        delete activeSessionsRef.current[pairId];
        return;
      }

      const activeSessionId = sessionData.sessionId;
      
      // Skip als we al naar deze sessie luisteren
      if (currentListeningSessionId === activeSessionId) {
        return;
      }

      // Parse session timestamp
      const sessionTimestamp = parseInt(activeSessionId.split('_').pop()) || Date.now();

      console.log('[useMessageListeners] 🔄 New session detected for', pairId, ':', activeSessionId);
      console.log('[useMessageListeners] Session timestamp:', sessionTimestamp);

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

      // Track processed messages per session
      const processedMessages = new Set();

      // Setup nieuwe listener voor deze actieve sessie
      const chatNode = gun.get(activeSessionId);

      chatNode.map().on((data, id) => {
        // Validatie checks
        if (!data || !data.content || !data.sender || !data.timeRef) {
          return;
        }
        
        if (!user.is) {
          console.log('[useMessageListeners] ⚠️ No user.is');
          return;
        }
        
        if (data.sender === user.is.alias) {
          // Self-messaging - skip silently
          return;
        }
        
        if (data.sender !== contactName) {
          console.log('[useMessageListeners] ⚠️ Wrong sender:', data.sender, 'expected:', contactName);
          return;
        }

        // Skip al verwerkte berichten
        if (processedMessages.has(id)) {
          console.log('[useMessageListeners] Already processed:', id);
          return;
        }
        processedMessages.add(id);

        const messageTimestamp = data.timeRef;

        // FIX BUG 3: VERSOEPELDE filtering - alleen skip berichten van VER voor sessie start
        // Gebruik 10 seconden marge in plaats van 1 seconde
        if (messageTimestamp < sessionTimestamp - 10000) {
          console.log('[useMessageListeners] ⏭️ Skipping old message (>10s before session):', messageTimestamp, '<', sessionTimestamp - 10000);
          return;
        }

        // FIX BUG 3: VERWIJDERD - De "before listener start" check
        // Deze was te strikt en blokkeerde legitieme berichten
        // Vooral problematisch bij auto-login waar listeners pas later opstarten
        
        console.log('[useMessageListeners] 📨 NEW message from:', contactName, 'at', messageTimestamp);
        console.log('[useMessageListeners] Message content preview:', data.content.substring(0, 30));

        // Check of conversation open en actief is
        const shouldShowToast = !isConversationActive(contactName);

        console.log('[useMessageListeners] 🔔 Should show toast:', shouldShowToast);

        if (shouldShowToast) {
          // Meer unieke toast key
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

    // Luister naar contactenlijst
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
    activeSessionsRef.current = {};
  }, []);

  // ============================================
  // EFFECTS
  // ============================================

  // Setup listeners when logged in
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    console.log('[useMessageListeners] 🎬 Initializing listeners...');

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
    messageListenersRef,
    activeSessionsRef
  };
}

export default useMessageListeners;