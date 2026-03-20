import ChatPane from './components/panes/ChatPane';
import NotepadPane from './components/panes/NotepadPane';
import CalculatorPane from './components/panes/CalculatorPane';
import ContactsPane from './components/panes/ContactsPane';
import PaintPane from './components/panes/PaintPane';
import BrowserPane from './components/panes/BrowserPane';
import MediaPane from './components/panes/MediaPane';
import TeamTalkPane from './components/panes/TeamTalkPane';
import ControlPane from './components/ControlPane';

const paneConfig = {
  contacts: {
    title: 'Chatlon Messenger',
    icon: '\u{1F465}',
    component: ContactsPane,
    label: 'Contacten',
    defaultSize: { width: 280, height: 520 },
    minSize: { width: 280, height: 400 },
    desktopIcon: 'favicon.ico',
    desktopLabel: 'Chatlon Messenger',
    startMenu: { section: 'pinned', order: 30 },
    ligerMenu: [
      {
        label: 'Archief',
        items: [
          { label: 'Status wijzigen', disabled: true },
          { type: 'separator' },
          { label: 'Venster sluiten', shortcut: 'Cmd+W', action: 'closeActive' },
          { type: 'separator' },
          { label: 'Afmelden bij Chatlon', action: 'logoff' }
        ]
      },
      {
        label: 'Contacten',
        items: [
          { label: 'Contact toevoegen...', disabled: true },
          { label: 'Contact verwijderen', disabled: true }
        ]
      },
      {
        label: 'Help',
        items: [
          { label: 'Chatlon Help', disabled: true }
        ]
      }
    ]
  },
  chat: {
    title: 'Chatlon Messenger',
    icon: '\u{1F4AC}',
    component: ChatPane,
    label: 'Chatlon',
    defaultSize: { width: 450, height: 500 },
    minSize: { width: 600, height: 450 },
    desktopIcon: 'favicon.ico',
    desktopLabel: 'Gesprek',
    ligerMenu: [
      {
        label: 'Archief',
        items: [
          { label: 'Nieuw gesprek', disabled: true },
          { type: 'separator' },
          { label: 'Sluiten', shortcut: 'Cmd+W', action: 'closeActive' }
        ]
      },
      {
        label: 'Acties',
        items: [
          { label: 'Bestand sturen', disabled: true },
          { label: 'Nudge sturen', disabled: true }
        ]
      },
      {
        label: 'Help',
        items: [
          { label: 'Chatlon Help', disabled: true }
        ]
      }
    ]
  },
  notepad: {
    title: 'Naamloos - Kladblok',
    ligerTitle: 'Teksteditor',
    icon: '\u{1F4DD}',
    component: NotepadPane,
    label: 'Kladblok',
    defaultSize: { width: 500, height: 400 },
    minSize: { width: 300, height: 250 },
    desktopIcon: '\u{1F4DD}',
    desktopLabel: 'Kladblok',
    startMenu: { section: 'programs', order: 10 },
    ligerMenu: [
      {
        label: 'Archief',
        items: [
          { label: 'Nieuw', shortcut: 'Cmd+N', disabled: true },
          { label: 'Bewaar', shortcut: 'Cmd+S', disabled: true },
          { type: 'separator' },
          { label: 'Sluiten', shortcut: 'Cmd+W', action: 'closeActive' }
        ]
      },
      {
        label: 'Wijzig',
        items: [
          { label: 'Ongedaan maken', shortcut: 'Cmd+Z', disabled: true },
          { type: 'separator' },
          { label: 'Alles selecteren', shortcut: 'Cmd+A', disabled: true }
        ]
      },
      {
        label: 'Help',
        items: [
          { label: 'Teksteditor Help', disabled: true }
        ]
      }
    ]
  },
  calculator: {
    title: 'Rekenmachine',
    icon: '\u{1F522}',
    component: CalculatorPane,
    label: 'Rekenmachine',
    defaultSize: { width: 280, height: 320 },
    minSize: { width: 280, height: 320 },
    desktopIcon: '\u{1F522}',
    desktopLabel: 'Rekenmachine',
    startMenu: { section: 'programs', order: 20 },
    ligerMenu: [
      {
        label: 'Archief',
        items: [
          { label: 'Sluiten', shortcut: 'Cmd+W', action: 'closeActive' }
        ]
      },
      {
        label: 'Weergave',
        items: [
          { label: 'Standaard', disabled: true },
          { label: 'Wetenschappelijk', disabled: true }
        ]
      },
      {
        label: 'Help',
        items: [
          { label: 'Rekenmachine Help', disabled: true }
        ]
      }
    ]
  },
  paint: {
    title: 'Naamloos - Macrohard PaneT',
    ligerTitle: 'PaneT',
    icon: '\u{1F3A8}',
    component: PaintPane,
    label: 'PaneT',
    defaultSize: { width: 700, height: 550 },
    minSize: { width: 500, height: 400 },
    desktopIcon: '\u{1F3A8}',
    desktopLabel: 'Macrohard PaneT',
    startMenu: { section: 'programs', order: 30 },
    ligerMenu: [
      {
        label: 'Archief',
        items: [
          { label: 'Nieuw', shortcut: 'Cmd+N', disabled: true },
          { label: 'Exporteer...', shortcut: 'Cmd+S', disabled: true },
          { type: 'separator' },
          { label: 'Sluiten', shortcut: 'Cmd+W', action: 'closeActive' }
        ]
      },
      {
        label: 'Wijzig',
        items: [
          { label: 'Ongedaan maken', shortcut: 'Cmd+Z', disabled: true },
          { label: 'Alles selecteren', shortcut: 'Cmd+A', disabled: true }
        ]
      },
      {
        label: 'Afbeelding',
        items: [
          { label: 'Formaat wijzigen', disabled: true },
          { label: 'Roteren', disabled: true }
        ]
      },
      {
        label: 'Help',
        items: [
          { label: 'PaneT Help', disabled: true }
        ]
      }
    ]
  },
  browser: {
    title: 'Internet Adventurer',
    ligerTitle: 'Safari Avonturier',
    icon: '\u{1F310}',
    component: BrowserPane,
    label: 'Internet Adventurer',
    defaultSize: { width: 800, height: 600 },
    minSize: { width: 600, height: 450 },
    desktopIcon: '\u{1F310}',
    desktopLabel: 'Internet Adventurer',
    startMenu: { section: 'pinned', order: 10 },
    ligerMenu: [
      {
        label: 'Archief',
        items: [
          { label: 'Nieuw venster', shortcut: 'Cmd+N', disabled: true },
          { label: 'Nieuw tabblad', shortcut: 'Cmd+T', disabled: true },
          { type: 'separator' },
          { label: 'Sluiten', shortcut: 'Cmd+W', action: 'closeActive' }
        ]
      },
      {
        label: 'Weergave',
        items: [
          { label: 'Opnieuw laden', shortcut: 'Cmd+R', disabled: true },
          { label: 'Vergroot', shortcut: 'Cmd++', disabled: true },
          { label: 'Verklein', shortcut: 'Cmd+-', disabled: true }
        ]
      },
      {
        label: 'Geschiedenis',
        items: [
          { label: 'Geschiedenis wissen', disabled: true }
        ]
      },
      {
        label: 'Help',
        items: [
          { label: 'Safari Help', disabled: true }
        ]
      }
    ]
  },
  media: {
    title: 'Panes Media Player',
    icon: '\u{1F3B5}',
    component: MediaPane,
    label: 'Media Player',
    defaultSize: { width: 850, height: 600 },
    minSize: { width: 600, height: 500 },
    desktopIcon: '\u{1F3B5}',
    desktopLabel: 'Panes Media Player',
    startMenu: { section: 'pinned', order: 20 },
    ligerMenu: [
      {
        label: 'Archief',
        items: [
          { label: 'Open bestand...', shortcut: 'Cmd+O', disabled: true },
          { type: 'separator' },
          { label: 'Sluiten', shortcut: 'Cmd+W', action: 'closeActive' }
        ]
      },
      {
        label: 'Afspelen',
        items: [
          { label: 'Afspelen/Pauzeren', shortcut: 'Cmd+P', disabled: true },
          { label: 'Stoppen', disabled: true },
          { label: 'Volgende', disabled: true }
        ]
      },
      {
        label: 'Help',
        items: [
          { label: 'Media Player Help', disabled: true }
        ]
      }
    ]
  },
  teamtalk: {
    title: 'TeamTalk',
    component: TeamTalkPane,
    icon: '\u{1F3A7}',
    desktopIcon: '\u{1F3A7}',
    desktopLabel: 'TeamTalk',
    label: 'TeamTalk',
    startMenu: { section: 'programs', order: 40 },
    ligerMenu: [
      {
        label: 'Archief',
        items: [
          { label: 'Verbinden...', disabled: true },
          { label: 'Verbreken', disabled: true },
          { type: 'separator' },
          { label: 'Sluiten', shortcut: 'Cmd+W', action: 'closeActive' }
        ]
      },
      {
        label: 'Server',
        items: [
          { label: 'Server aanmaken', disabled: true },
          { label: 'Microfoon dempen', disabled: true }
        ]
      },
      {
        label: 'Help',
        items: [
          { label: 'TeamTalk Help', disabled: true }
        ]
      }
    ]
  },
  control: {
    title: 'Configuratiescherm',
    ligerTitle: 'Systeemvoorkeuren',
    label: 'Configuratiescherm',
    desktopLabel: 'Configuratiescherm',
    desktopIcon: '\u2699\uFE0F',
    icon: '\u2699\uFE0F',
    component: ControlPane,
    defaultSize: { width: 600, height: 500 },
    minSize: { width: 500, height: 400 },
    startMenu: { section: 'programs', order: 50 },
    ligerMenu: [
      {
        label: 'Archief',
        items: [
          { label: 'Sluiten', shortcut: 'Cmd+W', action: 'closeActive' }
        ]
      },
      {
        label: 'Weergave',
        items: [
          { label: 'Toon alles', disabled: true }
        ]
      },
      {
        label: 'Help',
        items: [
          { label: 'Systeemvoorkeuren Help', disabled: true }
        ]
      }
    ]
  }
};

const getInitialPaneState = () => {
  const state = {};
  Object.keys(paneConfig).forEach((key) => {
    state[key] = { isOpen: false, isMinimized: false, isMaximized: false };
  });
  return state;
};

export { paneConfig, getInitialPaneState };
export default paneConfig;
