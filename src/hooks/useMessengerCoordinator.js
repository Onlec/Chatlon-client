import { useCallback, useRef } from 'react';

export function useMessengerCoordinator({
  currentUser,
  messengerSignedInRef,
  settings,
  activePaneRef,
  conversationsRef,
  setUnreadChats,
  showToast,
  getAvatar,
  getDisplayNameRef,
  playSound,
  openPane,
  onTaskbarClick
}) {
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const getAvatarRef = useRef(getAvatar);
  getAvatarRef.current = getAvatar;

  const getDisplayNameRefRef = useRef(getDisplayNameRef);
  getDisplayNameRefRef.current = getDisplayNameRef;

  const playSoundRef = useRef(playSound);
  playSoundRef.current = playSound;

  const openPaneRef = useRef(openPane);
  openPaneRef.current = openPane;

  const onTaskbarClickRef = useRef(onTaskbarClick);
  onTaskbarClickRef.current = onTaskbarClick;

  const isConversationVisible = useCallback((contactUsername) => {
    const chatPaneId = `conv_${contactUsername}`;
    const isFocused = activePaneRef.current === chatPaneId;
    const conv = conversationsRef.current[chatPaneId];
    const isOpen = conv && conv.isOpen && !conv.isMinimized;
    return { chatPaneId, isFocused, isOpen };
  }, [activePaneRef, conversationsRef]);

  const dismissUnreadForPane = useCallback((paneId) => {
    setUnreadChats((prev) => {
      const next = new Set(prev);
      next.delete(paneId);
      return next;
    });
  }, [setUnreadChats]);

  const handleNudge = useCallback((contactUsername) => {
    if (!messengerSignedInRef.current) return;
    const { isFocused } = isConversationVisible(contactUsername);
    if (!isFocused && settingsRef.current.toastNotifications) {
      showToastRef.current({
        type: 'nudge',
        contactName: contactUsername,
        from: getDisplayNameRefRef.current.current(contactUsername),
        message: 'heeft je een nudge gestuurd!',
        avatar: getAvatarRef.current(contactUsername)
      });
    }
  }, [isConversationVisible, messengerSignedInRef]);

  const handleIncomingMessage = useCallback((msg, senderName, msgId, sessionId) => {
    const isSelf = msg.sender === currentUserRef.current;
    if (isSelf) return;

    const { chatPaneId, isFocused, isOpen } = isConversationVisible(senderName);

    if (messengerSignedInRef.current && (!isFocused || !isOpen)) {
      setUnreadChats((prev) => new Set(prev).add(chatPaneId));
    }

    // Toast dedupe remains in useToasts/useMessageListeners; coordinator only decides routing.
    if ((!isFocused || !isOpen) && messengerSignedInRef.current) {
      const isNudge = msg.type === 'nudge';
      if (!isNudge) playSoundRef.current('message');
      if (!isNudge && settingsRef.current.toastNotifications) {
        showToastRef.current({
          type: 'message',
          contactName: senderName,
          from: getDisplayNameRefRef.current.current(senderName),
          message: msg.content,
          avatar: getAvatarRef.current(senderName),
          messageId: msgId,
          sessionId
        });
      }
      if (isNudge) handleNudge(senderName);
    }
  }, [
    handleNudge,
    isConversationVisible,
    messengerSignedInRef,
    setUnreadChats
  ]);

  const handleContactOnline = useCallback((contactUsername) => {
    if (!messengerSignedInRef.current) return;
    if (!settingsRef.current.toastNotifications) return;
    showToastRef.current({
      type: 'presence',
      contactName: contactUsername,
      from: getDisplayNameRefRef.current.current(contactUsername),
      message: 'is nu online',
      avatar: getAvatarRef.current(contactUsername)
    });
  }, [messengerSignedInRef]);

  const handleToastClick = useCallback((toast) => {
    if (toast.type === 'message' || toast.type === 'presence' || toast.type === 'nudge') {
      const paneId = `conv_${toast.contactName}`;
      onTaskbarClickRef.current(paneId);
      return;
    }
    if (toast.type === 'friendRequest') {
      openPaneRef.current('contacts');
    }
  }, []);

  return {
    handleIncomingMessage,
    handleNudge,
    handleContactOnline,
    handleToastClick,
    dismissUnreadForPane
  };
}

export default useMessengerCoordinator;
