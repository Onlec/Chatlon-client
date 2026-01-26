import ChatPane from './ChatPane';
import NotepadPane from './NotepadPane';
import CalculatorPane from './CalculatorPane';
import ContactsPane from './ContactsPane';

const paneConfig = {
  contacts: {
    title: 'Chatlon Messenger',
    icon: '👥',
    component: ContactsPane,
    label: 'Contacten',
    defaultSize: { width: 240, height: 500 },
    minSize: { width: 200, height: 400 },
    desktopIcon: 'favicon.ico',
    desktopLabel: 'Chatlon Messenger'
  },
  chat: {
    title: 'Chatlon Messenger',
    icon: '💬',
    component: ChatPane,
    label: 'Chatlon',
    defaultSize: { width: 450, height: 500 },
    minSize: { width: 600, height: 450 },
    desktopIcon: 'favicon.ico',
    desktopLabel: 'Gesprek'
  },
  notepad: {
    title: 'Naamloos - Kladblok',
    icon: '📝',
    component: NotepadPane,
    label: 'Kladblok',
    defaultSize: { width: 500, height: 400 },
    minSize: { width: 300, height: 250 },
    desktopIcon: '📝', // emoji
    desktopLabel: 'Kladblok'
  },
  calculator: {
    title: 'Rekenmachine',
    icon: '🔢',
    component: CalculatorPane,
    label: 'Rekenmachine',
    defaultSize: { width: 280, height: 320 },
    minSize: { width: 280, height: 320 },
    desktopIcon: '🔢', // emoji
    desktopLabel: 'Rekenmachine'
  }
};

// Helper om initial pane state te genereren
const getInitialPaneState = () => {
  const state = {};
  Object.keys(paneConfig).forEach(key => {
    state[key] = { isOpen: false, isMinimized: false, isMaximized: false };
  });
  return state;
};

export { paneConfig, getInitialPaneState };
export default paneConfig;