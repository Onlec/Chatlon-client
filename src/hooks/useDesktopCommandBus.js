import { useCallback } from 'react';
import { DESKTOP_COMMANDS } from '../types/desktopCommands';

export function useDesktopCommandBus({
  openPane,
  openConversation,
  focusPane,
  minimizePane,
  closePane,
  toggleStartMenu
}) {
  const dispatch = useCallback((command, payload = {}) => {
    switch (command) {
      case DESKTOP_COMMANDS.OPEN_PANE:
        if (payload.paneName) openPane(payload.paneName);
        break;
      case DESKTOP_COMMANDS.OPEN_CONVERSATION:
        if (payload.contactName) openConversation(payload.contactName);
        break;
      case DESKTOP_COMMANDS.FOCUS_PANE:
        if (payload.paneName) focusPane(payload.paneName);
        break;
      case DESKTOP_COMMANDS.MINIMIZE_PANE:
        if (payload.paneName) minimizePane(payload.paneName);
        break;
      case DESKTOP_COMMANDS.CLOSE_PANE:
        if (payload.paneName) closePane(payload.paneName);
        break;
      case DESKTOP_COMMANDS.TOGGLE_START:
        toggleStartMenu();
        break;
      case DESKTOP_COMMANDS.OPEN_CONTACTS:
        openPane('contacts');
        break;
      default:
        break;
    }
  }, [openPane, openConversation, focusPane, minimizePane, closePane, toggleStartMenu]);

  const openPaneCommand = useCallback((paneName) => {
    dispatch(DESKTOP_COMMANDS.OPEN_PANE, { paneName });
  }, [dispatch]);

  const openConversationCommand = useCallback((contactName) => {
    dispatch(DESKTOP_COMMANDS.OPEN_CONVERSATION, { contactName });
  }, [dispatch]);

  const focusPaneCommand = useCallback((paneName) => {
    dispatch(DESKTOP_COMMANDS.FOCUS_PANE, { paneName });
  }, [dispatch]);

  const minimizePaneCommand = useCallback((paneName) => {
    dispatch(DESKTOP_COMMANDS.MINIMIZE_PANE, { paneName });
  }, [dispatch]);

  const closePaneCommand = useCallback((paneName) => {
    dispatch(DESKTOP_COMMANDS.CLOSE_PANE, { paneName });
  }, [dispatch]);

  const toggleStartCommand = useCallback(() => {
    dispatch(DESKTOP_COMMANDS.TOGGLE_START);
  }, [dispatch]);

  const openContactsCommand = useCallback(() => {
    dispatch(DESKTOP_COMMANDS.OPEN_CONTACTS);
  }, [dispatch]);

  return {
    dispatch,
    openPane: openPaneCommand,
    openConversation: openConversationCommand,
    focusPane: focusPaneCommand,
    minimizePane: minimizePaneCommand,
    closePane: closePaneCommand,
    toggleStart: toggleStartCommand,
    openContacts: openContactsCommand
  };
}

export default useDesktopCommandBus;
