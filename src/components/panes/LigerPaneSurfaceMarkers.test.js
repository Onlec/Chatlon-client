import React from 'react';
import fs from 'fs';
import { act, render, within } from '@testing-library/react';
import BrowserPane from './BrowserPane';
import CalculatorPane from './CalculatorPane';
import ContactsPane from './ContactsPane';
import MediaPane from './MediaPane';
import NotepadPane from './NotepadPane';

jest.mock('../../contexts/AvatarContext', () => ({
  useAvatar: () => ({
    getAvatar: () => '/avatar.png',
    getDisplayName: (username) => username,
    setMyDisplayName: jest.fn()
  })
}));

jest.mock('../DropdownMenu', () => ({ label }) => <span>{label}</span>);
jest.mock('../modals/OptionsDialog', () => () => null);
jest.mock('../modals/AddContactWizard', () => () => null);
jest.mock('../modals/FriendRequestDialog', () => () => null);
jest.mock('../modals/AvatarPickerModal', () => () => null);
jest.mock('../modals/ModalPane', () => ({ children }) => <div>{children}</div>);

jest.mock('../../gun', () => ({
  gun: {
    get: jest.fn(),
  },
  user: {
    is: { alias: 'alice@example.com' },
    get: jest.fn(),
  },
}));

jest.mock('../../utils/debug', () => ({
  log: jest.fn(),
}));

jest.mock('../../utils/userPrefsGun', () => ({
  PREF_KEYS: {
    AUTO_SIGNIN: 'auto_signin',
  },
  readUserPrefOnce: jest.fn(async () => false),
  writeUserPref: jest.fn(async () => undefined),
}));

const { gun, user } = require('../../gun');

function createNode() {
  const node = {};
  node.get = jest.fn(() => node);
  node.map = jest.fn(() => ({ on: jest.fn() }));
  node.on = jest.fn();
  node.off = jest.fn();
  node.put = jest.fn();
  return node;
}

describe('Liger pane surface markers', () => {
  let getContextSpy;
  let toDataURLSpy;

  beforeEach(() => {
    const node = createNode();
    gun.get.mockImplementation(() => node);
    user.get.mockImplementation(() => node);
  });

  beforeAll(() => {
    getContextSpy = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
      fillStyle: '#ffffff',
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      drawImage: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      strokeRect: jest.fn(),
      arc: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: jest.fn(),
    }));
    toDataURLSpy = jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => 'data:image/png;base64,');
  });

  afterAll(() => {
    getContextSpy.mockRestore();
    toDataURLSpy.mockRestore();
  });

  test('marks decorative app menubars for liger-only hiding', () => {
    const { container: notepadContainer } = render(<NotepadPane />);
    expect(notepadContainer.querySelector('.notepad-menubar')).toHaveAttribute('data-decorative-menubar', 'true');

    const { container: calculatorContainer } = render(<CalculatorPane />);
    expect(calculatorContainer.querySelector('.calculator-menubar')).toHaveAttribute('data-decorative-menubar', 'true');

    const { container: browserContainer } = render(<BrowserPane />);
    expect(browserContainer.querySelector('.browser-menubar')).toHaveAttribute('data-decorative-menubar', 'true');

    const { container: mediaContainer } = render(<MediaPane />);
    expect(mediaContainer.querySelector('.media-menubar')).toHaveAttribute('data-decorative-menubar', 'true');

    const paintSource = fs.readFileSync(require.resolve('./PaintPane'), 'utf8');
    expect(paintSource).toContain('data-decorative-menubar="true"');
  });

  test('keeps the contacts action menubar functional', async () => {
    let container;
    await act(async () => {
      ({ container } = render(
        <ContactsPane
          onOpenConversation={jest.fn()}
          userStatus="online"
          onStatusChange={jest.fn()}
          onLogoff={jest.fn()}
          onSignOut={jest.fn()}
          onClosePane={jest.fn()}
          nowPlaying={null}
          currentUserEmail="alice@example.com"
          messengerSignedIn
          setMessengerSignedIn={jest.fn()}
          contactPresenceMap={{}}
        />
      ));
    });

    const contactsMenubar = container.querySelector('.contacts-menubar');
    const scoped = within(contactsMenubar);

    expect(contactsMenubar).toHaveAttribute('data-functional-menubar', 'true');
    expect(scoped.getByText('Bestand')).toBeInTheDocument();
    expect(scoped.getByText('Contacten')).toBeInTheDocument();
    expect(contactsMenubar).not.toHaveAttribute('data-decorative-menubar');
  });
});
