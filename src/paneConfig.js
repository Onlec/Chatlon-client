import ChatPane from './components/panes/ChatPane';
import NotepadPane from './components/panes/NotepadPane';
import CalculatorPane from './components/panes/CalculatorPane';
import ContactsPane from './components/panes/ContactsPane';
import PaintPane from './components/panes/PaintPane';
import BrowserPane from './components/panes/BrowserPane';
import MediaPane from './components/panes/MediaPane';
import TeamTalkPane from './components/panes/TeamTalkPane';
import ControlPane from './components/ControlPane';
import PinballPane from './components/panes/PinballPane';
import { log } from './utils/debug';

const paneConfig = {
  contacts: {
    title: 'Chatlon Messenger',
    icon: '👥',
    component: ContactsPane,
    label: 'Contacten',
    defaultSize: { width: 280, height: 520 },
    minSize: { width: 280, height: 400 },
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
    desktopIcon: '📝',
    desktopLabel: 'Kladblok'
  },
  calculator: {
    title: 'Rekenmachine',
    icon: '🔢',
    component: CalculatorPane,
    label: 'Rekenmachine',
    defaultSize: { width: 280, height: 320 },
    minSize: { width: 280, height: 320 },
    desktopIcon: '🔢',
    desktopLabel: 'Rekenmachine'
  },
  paint: {
    title: 'Naamloos - Macrohard PaneT',
    icon: '🎨',
    component: PaintPane,
    label: 'PaneT',
    defaultSize: { width: 700, height: 550 },
    minSize: { width: 500, height: 400 },
    desktopIcon: '🎨',
    desktopLabel: 'Macrohard PaneT'
  },
  browser: {
    title: 'Internet Adventurer',
    icon: '🌐',
    component: BrowserPane,
    label: 'Internet Adventurer',
    defaultSize: { width: 800, height: 600 },
    minSize: { width: 600, height: 450 },
    desktopIcon: '🌐',
    desktopLabel: 'Internet Adventurer'
  },
  media: {
    title: 'Panes Media Player',
    icon: '🎵',
    component: MediaPane,
    label: 'Media Player',
    defaultSize: { width: 850, height: 600 },
    minSize: { width: 600, height: 500 },
    desktopIcon: '🎵',
    desktopLabel: 'Panes Media Player'
  },
  teamtalk: {
    title: 'TeamTalk',
    component: TeamTalkPane,
    icon: '🎧',
    desktopIcon: '🎧',
    desktopLabel: 'TeamTalk',
    label: 'TeamTalk'
  },/*,
  pinball: {
    title: '3D Flipperkast',
    icon: '🏓',
    component: PinballPane,
    label: 'Flipperkast',
    defaultSize: { width: 640, height: 480 },
    minSize: { width: 500, height: 400 },
    desktopIcon: '🏓',
    desktopLabel: '3D Flipperkast'
  }*/
 control: {
    title: 'Configuratiescherm',
    label: 'Configuratiescherm',
    desktopLabel: 'Configuratiescherm',
    desktopIcon: '⚙️',
    icon: '⚙️',
    component: ControlPane,
    defaultSize: { width: 600, height: 500 },
    minSize: { width: 500, height: 400 }
  },
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