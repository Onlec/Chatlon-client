import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import MailPane from './MailPane';
import ContextMenuHost from '../shell/ContextMenuHost';
import { useContextMenuManager } from '../../hooks/useContextMenuManager';
import { useDialog } from '../../contexts/DialogContext';
import { useMailInbox } from '../mail/useMailInbox';
import { useMailDrafts } from '../mail/useMailDrafts';
import { useMailContacts } from '../mail/useMailContacts';
import { user } from '../../gun';

const mockRunBodyCommand = jest.fn();

jest.mock('../mail/useMailInbox', () => ({
  useMailInbox: jest.fn(),
}));

jest.mock('../mail/useMailDrafts', () => ({
  useMailDrafts: jest.fn(),
}));

jest.mock('../mail/useMailContacts', () => ({
  useMailContacts: jest.fn(),
}));

jest.mock('../../contexts/DialogContext', () => ({
  useDialog: jest.fn(),
}));

jest.mock('../../gun', () => ({
  user: {
    is: { alias: 'alice@example.com' },
    get: jest.fn(() => ({
      once: jest.fn((callback) => callback('')),
      put: jest.fn()
    }))
  }
}));

jest.mock('../shared/RichTextEditor', () => {
  const React = require('react');

  return React.forwardRef(function MockRichTextEditor(props, ref) {
    React.useImperativeHandle(ref, () => ({
      runCommand: mockRunBodyCommand,
      focus: jest.fn(),
    }), []);

    return (
      <textarea
        aria-label="Rich text editor"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        disabled={props.disabled}
      />
    );
  });
});

jest.mock('../shared/RichTextRenderer', () => function MockRichTextRenderer(props) {
  return <div>{props.value}</div>;
});

function createFakeContextMenu() {
  return {
    enabled: true,
    openMenu: jest.fn(),
    closeMenu: jest.fn(),
  };
}

function getLatestMenu(openMenu) {
  expect(openMenu).toHaveBeenCalled();
  return openMenu.mock.calls[openMenu.mock.calls.length - 1][0];
}

function getMenuLabels(openMenu) {
  return getLatestMenu(openMenu)
    .actions
    .filter((action) => action?.type !== 'separator')
    .map((action) => action.label);
}

async function invokeMenuAction(openMenu, label) {
  const menu = getLatestMenu(openMenu);
  const action = menu.actions.find((item) => item?.label === label);
  expect(action).toBeDefined();
  expect(action.disabled).not.toBe(true);
  await act(async () => {
    await action.onClick();
  });
}

function MailPaneHarness() {
  const contextMenu = useContextMenuManager({ enabled: true });

  return (
    <div>
      <MailPane currentUser="alice@example.com" contextMenu={contextMenu} />
      <ContextMenuHost
        enabled={contextMenu.enabled}
        menuState={contextMenu.menuState}
        onClose={contextMenu.closeMenu}
        hostRef={contextMenu.hostRef}
      />
      <div data-testid="outside">outside</div>
    </div>
  );
}

describe('MailPane', () => {
  const markAllSeen = jest.fn();
  const markRead = jest.fn();
  const markUnread = jest.fn();
  const markAllRead = jest.fn();
  const markAllUnread = jest.fn();
  const markDeleted = jest.fn();
  const permanentDelete = jest.fn();
  const restoreFromTrash = jest.fn();
  const saveDraft = jest.fn();
  const deleteDraft = jest.fn();
  const choices = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRunBodyCommand.mockReset();
    choices.mockResolvedValue('discard');

    user.get.mockImplementation(() => ({
      once: jest.fn((callback) => callback('')),
      put: jest.fn()
    }));

    useDialog.mockReturnValue({ choices });
    useMailContacts.mockReturnValue(['accepted@example.com']);
    useMailInbox.mockReturnValue({
      inbox: [],
      sent: [],
      trash: [],
      unreadCount: 0,
      newMailSinceLastSeen: [],
      markAllSeen,
      markRead,
      markUnread,
      markAllRead,
      markAllUnread,
      markDeleted,
      permanentDelete,
      restoreFromTrash,
    });
    useMailDrafts.mockReturnValue({
      drafts: [],
      saveDraft,
      deleteDraft,
    });
  });

  test('reopens draft attachments inside compose', async () => {
    useMailDrafts.mockReturnValue({
      drafts: [{
        id: 'draft-1',
        to: 'accepted@example.com',
        subject: 'Draft subject',
        body: 'Draft body',
        attachments: JSON.stringify([
          { name: 'photo.png', size: 12, mimeType: 'image/png', dataUrl: 'data:image/png;base64,abc' }
        ]),
        timestamp: 100
      }],
      saveDraft,
      deleteDraft,
    });

    render(<MailPane currentUser="alice@example.com" />);

    fireEvent.click(screen.getByText('Concepten'));
    fireEvent.click(screen.getByText('Draft subject'));

    expect(await screen.findByText('photo.png')).toBeInTheDocument();
  });

  test('does not ask to save again right after an explicit draft save', async () => {
    saveDraft.mockReturnValue('draft-1');
    useMailDrafts.mockReturnValue({
      drafts: [{
        id: 'draft-1',
        to: 'accepted@example.com',
        subject: 'Draft subject',
        body: 'Draft body',
        timestamp: 100
      }],
      saveDraft,
      deleteDraft,
    });

    render(<MailPane currentUser="alice@example.com" />);

    fireEvent.click(screen.getByText('Concepten'));
    fireEvent.click(screen.getByText('Draft subject'));
    fireEvent.change(screen.getByLabelText('Rich text editor'), {
      target: { value: 'Updated draft body' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Concept/i }));
    fireEvent.click(screen.getByText('Postvak IN'));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Concept/i })).not.toBeInTheDocument();
    });

    expect(saveDraft).toHaveBeenCalled();
    expect(choices).not.toHaveBeenCalled();
  });

  test('open draft can be deleted from compose and its context menu', async () => {
    const contextMenu = createFakeContextMenu();

    useMailDrafts.mockReturnValue({
      drafts: [{
        id: 'draft-1',
        to: 'accepted@example.com',
        subject: 'Draft subject',
        body: 'Draft body',
        timestamp: 100
      }],
      saveDraft,
      deleteDraft,
    });

    render(<MailPane currentUser="alice@example.com" contextMenu={contextMenu} />);

    fireEvent.click(screen.getByText('Concepten'));
    fireEvent.click(screen.getByText('Draft subject'));

    expect(screen.getByRole('button', { name: /^Verwijderen$/i })).toBeInTheDocument();

    await act(async () => {
      fireEvent.contextMenu(screen.getByLabelText('Rich text editor'));
    });

    expect(getMenuLabels(contextMenu.openMenu)).toContain('Concept verwijderen');

    await invokeMenuAction(contextMenu.openMenu, 'Concept verwijderen');

    expect(deleteDraft).toHaveBeenCalledWith('draft-1');
    await waitFor(() => {
      expect(screen.queryByLabelText('Rich text editor')).toBeNull();
    });
  });

  test('renders the DX menubar, moves search above the list, and opens signature editor from Extra', async () => {
    render(<MailPane currentUser="alice@example.com" />);

    expect(document.querySelector('[data-functional-menubar="true"]')).not.toBeNull();
    expect(screen.getByPlaceholderText('Zoeken in huidige map...')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Extra'));
    fireEvent.click(screen.getByText('Handtekening...'));

    expect(await screen.findByLabelText('Handtekening')).toBeInTheDocument();
  });

  test('publishes live ColdMail menus for the Liger app menubar', async () => {
    const onLigerMenuChange = jest.fn();

    render(<MailPane currentUser="alice@example.com" onLigerMenuChange={onLigerMenuChange} />);

    await waitFor(() => {
      expect(onLigerMenuChange).toHaveBeenCalled();
    });

    const latestMenus = onLigerMenuChange.mock.calls[onLigerMenuChange.mock.calls.length - 1][0];
    expect(latestMenus.map((menu) => menu.label)).toEqual([
      'Bestand',
      'Bewerken',
      'Beeld',
      'Map',
      'Bericht',
      'Extra',
      'Help',
    ]);
  });

  test('shows only forward and delete actions for sent mail', async () => {
    useMailInbox.mockReturnValue({
      inbox: [],
      sent: [{
        id: 'sent-1',
        mailbox: 'sent',
        from: 'alice@example.com',
        to: 'bob@example.com',
        subject: 'Sent subject',
        body: 'Sent body',
        timestamp: 100
      }],
      trash: [],
      unreadCount: 0,
      newMailSinceLastSeen: [],
      markAllSeen,
      markRead,
      markUnread,
      markAllRead,
      markAllUnread,
      markDeleted,
      permanentDelete,
      restoreFromTrash,
    });

    render(<MailPane currentUser="alice@example.com" />);

    fireEvent.click(screen.getByText('Verzonden items'));
    fireEvent.click(screen.getByText('Sent subject'));

    expect(screen.queryByRole('button', { name: /Beantwoorden/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Allen beantwoorden/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Doorsturen/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Verwijderen$/i })).toBeInTheDocument();
  });

  test('DX menubar actions can toggle selected and folder read state in inbox', async () => {
    useMailInbox.mockReturnValue({
      inbox: [
        {
          id: 'mail-1',
          mailbox: 'inbox',
          from: 'bob@example.com',
          to: 'alice@example.com',
          subject: 'Unread mail',
          body: 'Body',
          timestamp: 100,
          read: false
        },
        {
          id: 'mail-2',
          mailbox: 'inbox',
          from: 'carol@example.com',
          to: 'alice@example.com',
          subject: 'Read mail',
          body: 'Body',
          timestamp: 101,
          read: true
        }
      ],
      sent: [],
      trash: [],
      unreadCount: 1,
      newMailSinceLastSeen: [],
      markAllSeen,
      markRead,
      markUnread,
      markAllRead,
      markAllUnread,
      markDeleted,
      permanentDelete,
      restoreFromTrash,
    });

    render(<MailPane currentUser="alice@example.com" />);

    fireEvent.click(screen.getByText('Read mail'));

    fireEvent.click(screen.getByText('Bericht'));
    fireEvent.click(screen.getByText('Markeer als ongelezen'));
    expect(markUnread).toHaveBeenCalledWith(expect.objectContaining({ id: 'mail-2' }));

    fireEvent.click(screen.getByText('Map'));
    fireEvent.click(screen.getByText('Alles als gelezen markeren'));
    expect(markAllRead).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Map'));
    fireEvent.click(screen.getByText('Alles als ongelezen markeren'));
    expect(markAllUnread).toHaveBeenCalledTimes(1);
  });

  test('right click selects a sent row and opens only sent actions', async () => {
    const contextMenu = createFakeContextMenu();

    useMailInbox.mockReturnValue({
      inbox: [],
      sent: [{
        id: 'sent-1',
        mailbox: 'sent',
        from: 'alice@example.com',
        to: 'bob@example.com',
        subject: 'Sent subject',
        body: 'Sent body',
        timestamp: 100
      }],
      trash: [],
      unreadCount: 0,
      newMailSinceLastSeen: [],
      markAllSeen,
      markRead,
      markUnread,
      markAllRead,
      markAllUnread,
      markDeleted,
      permanentDelete,
      restoreFromTrash,
    });

    render(<MailPane currentUser="alice@example.com" contextMenu={contextMenu} />);

    fireEvent.click(screen.getByText('Verzonden items'));

    const row = screen.getByText('Sent subject').closest('.mail-message-item');
    await act(async () => {
      fireEvent.contextMenu(row);
    });

    await waitFor(() => {
      expect(row.className).toContain('mail-message-item--selected');
    });
    expect(getMenuLabels(contextMenu.openMenu)).toEqual(['Openen', 'Doorsturen', 'Verwijderen']);
  });

  test('dirty compose blocks external context menus when close is cancelled', async () => {
    const contextMenu = createFakeContextMenu();
    choices.mockResolvedValue('cancel');

    render(<MailPane currentUser="alice@example.com" contextMenu={contextMenu} />);

    fireEvent.click(screen.getByRole('button', { name: /Nieuw bericht/i }));
    fireEvent.change(screen.getByLabelText('Rich text editor'), {
      target: { value: 'Unsaved draft body' }
    });

    const folder = screen.getByText('Verzonden items').closest('.mail-folder-item');
    await act(async () => {
      fireEvent.contextMenu(folder);
    });

    await waitFor(() => {
      expect(choices).toHaveBeenCalled();
    });

    expect(contextMenu.openMenu).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Verzenden/i })).toBeInTheDocument();
  });

  test('subject field context menu can select all text and includes compose actions', async () => {
    const contextMenu = createFakeContextMenu();

    render(<MailPane currentUser="alice@example.com" contextMenu={contextMenu} />);

    fireEvent.click(screen.getByRole('button', { name: /Nieuw bericht/i }));

    const subjectInput = screen.getByLabelText('Onderwerp');
    fireEvent.change(subjectInput, { target: { value: 'Hello ColdMail' } });
    await act(async () => {
      fireEvent.contextMenu(subjectInput);
    });

    expect(getMenuLabels(contextMenu.openMenu)).toEqual([
      'Ongedaan maken',
      'Opnieuw',
      'Knippen',
      'Kopieren',
      'Plakken',
      'Alles selecteren',
      'Verzenden',
      'Opslaan als concept',
      'Bijlage toevoegen',
      'Sluiten',
    ]);

    await invokeMenuAction(contextMenu.openMenu, 'Alles selecteren');

    expect(subjectInput.selectionStart).toBe(0);
    expect(subjectInput.selectionEnd).toBe('Hello ColdMail'.length);
  });

  test('body context menu forwards formatting commands to the editor ref', async () => {
    const contextMenu = createFakeContextMenu();

    render(<MailPane currentUser="alice@example.com" contextMenu={contextMenu} />);

    fireEvent.click(screen.getByRole('button', { name: /Nieuw bericht/i }));
    await act(async () => {
      fireEvent.contextMenu(screen.getByLabelText('Rich text editor'));
    });

    await invokeMenuAction(contextMenu.openMenu, 'Vet');

    expect(mockRunBodyCommand).toHaveBeenCalledWith('bold');
  });

  test('attachment context menu removes only the targeted draft attachment', async () => {
    const contextMenu = createFakeContextMenu();

    useMailDrafts.mockReturnValue({
      drafts: [{
        id: 'draft-1',
        to: 'accepted@example.com',
        subject: 'Draft subject',
        body: 'Draft body',
        attachments: JSON.stringify([
          { name: 'first.txt', size: 12, mimeType: 'text/plain', dataUrl: 'data:text/plain;base64,Zmlyc3Q=' },
          { name: 'second.txt', size: 13, mimeType: 'text/plain', dataUrl: 'data:text/plain;base64,c2Vjb25k' }
        ]),
        timestamp: 100
      }],
      saveDraft,
      deleteDraft,
    });

    render(<MailPane currentUser="alice@example.com" contextMenu={contextMenu} />);

    fireEvent.click(screen.getByText('Concepten'));
    fireEvent.click(screen.getByText('Draft subject'));

    expect(screen.getByText('first.txt')).toBeInTheDocument();
    expect(screen.getByText('second.txt')).toBeInTheDocument();

    const attachment = screen.getByText('second.txt').closest('.mail-attachment');
    await act(async () => {
      fireEvent.contextMenu(attachment);
    });
    await invokeMenuAction(contextMenu.openMenu, 'Verwijderen');

    await waitFor(() => {
      expect(screen.queryByText('second.txt')).toBeNull();
    });

    expect(screen.getByText('first.txt')).toBeInTheDocument();
  });

  test('keeps the native browser context menu on download links in message view', async () => {
    const contextMenu = createFakeContextMenu();

    useMailInbox.mockReturnValue({
      inbox: [{
        id: 'mail-1',
        mailbox: 'inbox',
        from: 'bob@example.com',
        to: 'alice@example.com',
        subject: 'Attachment mail',
        body: 'Body',
        attachments: JSON.stringify([
          { name: 'photo.png', size: 12, mimeType: 'image/png', dataUrl: 'data:image/png;base64,abc' }
        ]),
        timestamp: 100,
        read: true
      }],
      sent: [],
      trash: [],
      unreadCount: 0,
      newMailSinceLastSeen: [],
      markAllSeen,
      markRead,
      markUnread,
      markAllRead,
      markAllUnread,
      markDeleted,
      permanentDelete,
      restoreFromTrash,
    });

    render(<MailPane currentUser="alice@example.com" contextMenu={contextMenu} />);

    fireEvent.click(screen.getByText('Attachment mail'));
    await act(async () => {
      fireEvent.contextMenu(screen.getByText('Downloaden'));
    });

    expect(contextMenu.openMenu).not.toHaveBeenCalled();
  });

  test('context menu host closes on escape and outside click', async () => {
    render(<MailPaneHarness />);

    const list = screen.getByTestId('mail-message-list');

    await act(async () => {
      fireEvent.contextMenu(list);
    });
    await waitFor(() => {
      expect(document.querySelector('.ctx-menu')).not.toBeNull();
    });

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(document.querySelector('.ctx-menu')).toBeNull();
    });

    await act(async () => {
      fireEvent.contextMenu(list);
    });
    await waitFor(() => {
      expect(document.querySelector('.ctx-menu')).not.toBeNull();
    });

    fireEvent.mouseDown(screen.getByTestId('outside'));
    await waitFor(() => {
      expect(document.querySelector('.ctx-menu')).toBeNull();
    });
  });
});
