// src/hooks/useMessageListeners.js
/**
 * Message listeners hook.
 *
 * Keeps Gun listener lifecycle explicit:
 * - one contacts map listener
 * - one friend request listener
 * - per-contact ACTIVE_SESSIONS pointer listener
 * - per-contact active chat node listener
 */

import { useEffect, useRef, useCallback } from 'react';
import { gun, user } from '../gun';
import { getContactPairId } from '../utils/chatUtils';
import { log } from '../utils/debug';
import { createListenerManager } from '../utils/gunListenerManager';
import { decryptMessage } from '../utils/encryption';
import { canAttachContactListeners } from '../utils/contactModel';

const CONTACTS_LISTENER_KEY = 'contactsMap';
const FRIEND_REQUESTS_LISTENER_KEY = 'friendRequests';
const pairActiveSessionKey = (pairId) => `pair:${pairId}:activeSession`;
const pairChatKey = (pairId) => `pair:${pairId}:chat`;

/**
 * Hook for message and friend request listeners.
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
  const listenersRef = useRef(createListenerManager());
  const activeSessionsRef = useRef({});

  /**
   * Check if a conversation is open and currently active.
   */
  const isConversationActive = useCallback((contactName) => {
    const convId = `conv_${contactName}`;
    const conv = conversationsRef.current[convId];

    const isConvOpen = conv && conv.isOpen && !conv.isMinimized;
    const isConvActive = activePaneRef.current === convId;

    return isConvOpen && isConvActive;
  }, [conversationsRef, activePaneRef]);

  /**
   * Remove all listeners for a single contact pair.
   */
  const detachContactListener = useCallback((pairId) => {
    listenersRef.current.remove(pairChatKey(pairId));
    listenersRef.current.remove(pairActiveSessionKey(pairId));
    delete activeSessionsRef.current[pairId];
  }, []);

  /**
   * Setup listener for friend requests.
   */
  const setupFriendRequestListener = useCallback(() => {
    if (!user.is || !currentUser) return;
    if (listenersRef.current.has(FRIEND_REQUESTS_LISTENER_KEY)) return;

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
      showToast({
        from: requestData.from,
        message: 'wil je toevoegen als contact',
        avatar: getAvatar(requestData.from),
        type: 'friendRequest',
        requestId
      });
    });

    listenersRef.current.add(FRIEND_REQUESTS_LISTENER_KEY, friendRequestsNode);
  }, [currentUser, getAvatar, showToast, shownToastsRef]);

  /**
   * Setup listener for messages from a specific contact.
   * Follows ACTIVE_SESSIONS and safely swaps chat listeners on session changes.
   */
  const setupContactMessageListener = useCallback((contactName, pairId) => {
    const activeKey = pairActiveSessionKey(pairId);
    const chatKey = pairChatKey(pairId);

    if (listenersRef.current.has(activeKey)) {
      return;
    }

    log('[useMessageListeners] Start persistent listener for contact:', contactName);

    const activeSessionNode = gun.get('ACTIVE_SESSIONS').get(pairId);
    activeSessionNode.get('sessionId').on((activeSessionId) => {
      const previousSessionId = activeSessionsRef.current[pairId];

      if (!activeSessionId) {
        if (previousSessionId) {
          listenersRef.current.remove(chatKey);
          delete activeSessionsRef.current[pairId];
        }
        return;
      }

      if (activeSessionId === previousSessionId) {
        return;
      }

      activeSessionsRef.current[pairId] = activeSessionId;
      listenersRef.current.remove(chatKey);

      log('[useMessageListeners] Following active session for contact:', {
        contactName,
        pairId,
        activeSessionId
      });

      const chatNode = gun.get(activeSessionId);
      chatNode.map().on(async (data, id) => {
        if (!data || !data.content || !data.sender) return;
        if (data.sender === (user.is && user.is.alias)) return;

        const msgKey = `processed_${activeSessionId}_${id}`;
        if (shownToastsRef.current.has(msgKey)) return;
        shownToastsRef.current.add(msgKey);

        const now = Date.now();
        const isRecent = data.timeRef > (now - 15000);
        if (!isRecent) return;

        const decryptedContent = await decryptMessage(data.content, contactName);

        if (onMessage) {
          onMessage({ ...data, content: decryptedContent }, contactName, id, activeSessionId);
        }

        if (!isConversationActive(contactName) && onNotification) {
          onNotification(contactName, data.timeRef);
        }
      });

      listenersRef.current.add(chatKey, chatNode);
    });

    listenersRef.current.add(activeKey, activeSessionNode);
  }, [isConversationActive, onMessage, onNotification, shownToastsRef]);

  /**
   * Setup listeners for all contacts.
   */
  const setupMessageListeners = useCallback(() => {
    if (!user.is || !currentUser) return;
    if (listenersRef.current.has(CONTACTS_LISTENER_KEY)) return;

    log('[useMessageListeners] Setting up message listeners for:', currentUser);

    const contactsNode = user.get('contacts');
    contactsNode.map().on((contactData, contactKey) => {
      const contactName = (contactData && contactData.username) || contactKey;
      if (!contactName || typeof contactName !== 'string' || contactName === '_' || contactName === currentUser) {
        return;
      }

      const pairId = getContactPairId(currentUser, contactName);
      if (contactData && canAttachContactListeners(contactData)) {
        setupContactMessageListener(contactName, pairId);
      } else {
        detachContactListener(pairId);
      }
    });

    listenersRef.current.add(CONTACTS_LISTENER_KEY, contactsNode);
  }, [currentUser, detachContactListener, setupContactMessageListener]);

  /**
   * Cleanup all listeners.
   */
  const cleanup = useCallback(() => {
    log('[useMessageListeners] Cleaning up all listeners');
    listenersRef.current.cleanup();
    activeSessionsRef.current = {};
  }, []);

  // Setup listeners when logged in.
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    setupMessageListeners();
    setupFriendRequestListener();
  }, [isLoggedIn, currentUser, setupMessageListeners, setupFriendRequestListener]);

  return {
    cleanup,
    setupMessageListeners,
    setupFriendRequestListener,
    listenersRef,
    activeSessionsRef
  };
}

export default useMessageListeners;
