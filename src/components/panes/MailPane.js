// src/components/panes/MailPane.js

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import './MailPane.css';
import MailFolderList from '../mail/MailFolderList';
import MailMessageList from '../mail/MailMessageList';
import MailMessageView from '../mail/MailMessageView';
import MailCompose from '../mail/MailCompose';
import DropdownMenu from '../DropdownMenu';
import { useMailInbox } from '../mail/useMailInbox';
import { useMailContacts } from '../mail/useMailContacts';
import { useMailDrafts } from '../mail/useMailDrafts';
import { deserializeRich, richToPlainText, serializeRich } from '../../utils/richText';
import { user } from '../../gun';
import { useDialog } from '../../contexts/DialogContext';
import { parseMailAttachments } from '../mail/mailAttachments';

function formatQuoteDate(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('nl-NL', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function buildReplyBody(mail) {
  const plain = richToPlainText(deserializeRich(mail.body));
  const header = `\n\n---- Oorspronkelijk bericht ----\nVan: ${mail.from}\nDatum: ${formatQuoteDate(mail.timestamp)}\n\n`;
  const quoted = plain.split('\n').map(line => '> ' + line).join('\n');
  return serializeRich([{ text: header + quoted }]);
}

function buildForwardBody(mail) {
  const plain = richToPlainText(deserializeRich(mail.body));
  const header = `\n\n---- Doorgestuurd bericht ----\nVan: ${mail.from}\nAan: ${mail.to}\nDatum: ${formatQuoteDate(mail.timestamp)}\nOnderwerp: ${mail.subject || '(geen onderwerp)'}\n\n`;
  return serializeRich([{ text: header + plain }]);
}

// composeMode: null | 'new' | 'reply' | 'replyall' | 'forward' | 'draft'
function resolveComposeTitle(mode, appName) {
  if (mode === 'reply' || mode === 'replyall') return `Beantwoorden — ${appName}`;
  if (mode === 'forward') return `Doorsturen — ${appName}`;
  if (mode === 'draft') return `Concept bewerken — ${appName}`;
  return `Nieuw bericht — ${appName}`;
}

function buildMenuAction(id, label, onClick, options = {}) {
  return {
    id,
    label,
    onClick,
    onSelect: onClick,
    disabled: Boolean(options.disabled),
    bold: Boolean(options.bold),
    checked: Boolean(options.checked),
    shortcut: options.shortcut,
    meta: options.meta,
  };
}

function buildSeparator() {
  return { type: 'separator' };
}

function appendMenuActions(actions, extraActions) {
  if (!Array.isArray(extraActions) || extraActions.length === 0) return actions;
  return [...actions, buildSeparator(), ...extraActions];
}

function emitFieldEvent(target, type) {
  const event = new Event(type, { bubbles: true });
  target.dispatchEvent(event);
}

function hasFieldSelection(target) {
  return Boolean(
    target
    && typeof target.selectionStart === 'number'
    && typeof target.selectionEnd === 'number'
    && target.selectionStart !== target.selectionEnd
  );
}

function executeTextFieldCommand(target, command) {
  if (!target || target.disabled) return false;
  target.focus?.();

  const execCommand = (name) => {
    if (typeof document.execCommand !== 'function') return false;
    try {
      return document.execCommand(name, false, null);
    } catch {
      return false;
    }
  };

  switch (command) {
    case 'undo':
      return execCommand('undo');
    case 'redo':
      return execCommand('redo');
    case 'copy':
      return execCommand('copy');
    case 'paste':
      return execCommand('paste');
    case 'selectAll':
      if (typeof target.select === 'function') {
        target.select();
        return true;
      }
      return execCommand('selectAll');
    case 'cut': {
      if (execCommand('cut')) return true;
      if (!hasFieldSelection(target) || typeof target.value !== 'string') return false;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      target.setRangeText('', start, end, 'start');
      emitFieldEvent(target, 'input');
      emitFieldEvent(target, 'change');
      return true;
    }
    default:
      return false;
  }
}

function buildTextFieldActions({ target, prefix, extraActions = [] }) {
  const disabled = !target || Boolean(target?.disabled);
  const hasValue = Boolean(target?.value);
  const hasSelection = hasFieldSelection(target);

  const baseActions = [
    buildMenuAction(`${prefix}-undo`, 'Ongedaan maken', () => executeTextFieldCommand(target, 'undo'), { disabled }),
    buildMenuAction(`${prefix}-redo`, 'Opnieuw', () => executeTextFieldCommand(target, 'redo'), { disabled }),
    buildMenuAction(`${prefix}-cut`, 'Knippen', () => executeTextFieldCommand(target, 'cut'), {
      disabled: disabled || !hasSelection,
    }),
    buildMenuAction(`${prefix}-copy`, 'Kopieren', () => executeTextFieldCommand(target, 'copy'), {
      disabled: !hasSelection,
    }),
    buildMenuAction(`${prefix}-paste`, 'Plakken', () => executeTextFieldCommand(target, 'paste'), { disabled }),
    buildMenuAction(`${prefix}-select-all`, 'Alles selecteren', () => executeTextFieldCommand(target, 'selectAll'), {
      disabled: !hasValue,
    }),
  ];

  return appendMenuActions(baseActions, extraActions);
}

function hasSelectionInsideElement(element) {
  const selection = window.getSelection?.();
  return Boolean(
    element
    && selection
    && !selection.isCollapsed
    && element.contains(selection.anchorNode)
    && element.contains(selection.focusNode)
    && selection.toString().trim()
  );
}

function mapMenuItemsToDropdown(items = []) {
  return items.map((item) => {
    if (item?.type === 'separator') {
      return { separator: true };
    }

    return {
      label: item.label,
      onClick: item.onClick || item.onSelect,
      disabled: item.disabled,
      checked: item.checked,
    };
  });
}

function MailPane({
  currentUser,
  chromeVariant = 'dx',
  contextMenu = null,
  onClosePane,
  onLigerMenuChange,
}) {
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [selectedMail, setSelectedMail]   = useState(null);
  const [composeMode, setComposeMode]     = useState(null);
  const [composeInitial, setComposeInitial] = useState({});
  const composeRef = useRef(null);
  const searchInputRef = useRef(null);
  const onClosePaneRef = useRef(onClosePane);
  const onLigerMenuChangeRef = useRef(onLigerMenuChange);
  const lastEditTargetRef = useRef(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [editContextVersion, setEditContextVersion] = useState(0);
  const [searchQuery, setSearchQuery]     = useState('');

  // Handtekening
  const [signature, setSignature]         = useState('');
  const [showSigEditor, setShowSigEditor] = useState(false);
  const [sigEditorValue, setSigEditorValue] = useState('');

  const { choices } = useDialog();

  const {
    inbox, sent, trash, unreadCount,
    markAllSeen, markRead, markUnread, markAllRead, markAllUnread,
    markDeleted, permanentDelete, restoreFromTrash,
  } = useMailInbox(currentUser);

  const contacts = useMailContacts(currentUser);
  const { drafts, saveDraft, deleteDraft } = useMailDrafts();
  const canUseCustomContextMenu = Boolean(
    contextMenu?.enabled
    && typeof contextMenu?.openMenu === 'function'
  );

  const captureMenuRequest = useCallback((event) => {
    if (!canUseCustomContextMenu) return null;
    event.preventDefault();
    event.stopPropagation();
    return {
      x: event.clientX,
      y: event.clientY,
      target: event.target,
      currentTarget: event.currentTarget,
    };
  }, [canUseCustomContextMenu]);

  const openColdMailMenu = useCallback((request, surface, target, actions) => {
    if (!request || !Array.isArray(actions)) return;
    contextMenu.openMenu({
      x: request.x,
      y: request.y,
      type: 'mail',
      target: {
        surface,
        ...(target || {}),
      },
      actions,
    });
  }, [contextMenu]);

  useEffect(() => {
    if (activeFolder === 'inbox') {
      markAllSeen();
    }
  }, [activeFolder, markAllSeen]);

  useEffect(() => {
    onClosePaneRef.current = onClosePane;
  }, [onClosePane]);

  useEffect(() => {
    onLigerMenuChangeRef.current = onLigerMenuChange;
  }, [onLigerMenuChange]);

  // Laad handtekening uit Gun user-node
  useEffect(() => {
    if (!user.is) return;
    user.get('mailSignature').once(val => {
      if (val && typeof val === 'string') {
        setSignature(val);
        setSigEditorValue(val);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearEditTargetForScope = useCallback((scope) => {
    if (lastEditTargetRef.current?.scope !== scope) return;
    lastEditTargetRef.current = null;
    setEditContextVersion((value) => value + 1);
  }, []);

  const handleSaveSig = useCallback(() => {
    if (!user.is) return false;
    user.get('mailSignature').put(sigEditorValue);
    setSignature(sigEditorValue);
    setShowSigEditor(false);
    clearEditTargetForScope('signature');
    return true;
  }, [clearEditTargetForScope, sigEditorValue]);

  const openSignatureEditor = useCallback(() => {
    setSigEditorValue(signature);
    setShowSigEditor(true);
    return true;
  }, [signature]);

  const closeSignatureEditor = useCallback(() => {
    setShowSigEditor(false);
    clearEditTargetForScope('signature');
    return true;
  }, [clearEditTargetForScope]);

  const registerEditTarget = useCallback((nextTarget) => {
    lastEditTargetRef.current = nextTarget;
    setEditContextVersion((value) => value + 1);
  }, []);

  const openCompose = useCallback((mode, initial = {}) => {
    let finalInitial = { ...initial };
    // Voeg handtekening toe bij nieuw bericht
    if (mode === 'new' && signature) {
      finalInitial.initialBody = serializeRich([
        { text: '' },
        { text: '\n\n-- \n' + signature, color: '#888888' },
      ]);
    }
    setComposeInitial(finalInitial);
    setComposeMode(mode);
  }, [signature]);

  const closeCompose = useCallback(() => {
    setComposeMode(null);
    setComposeInitial({});
    clearEditTargetForScope('compose');
  }, [clearEditTargetForScope]);

  /**
   * Vraag of het bericht als concept opgeslagen moet worden voordat er
   * genavigeerd wordt. Sluit altijd de compose af.
   */
  // Sluit compose af; vraagt bij dirty state of het bericht opgeslagen moet worden.
  // Geeft true terug als compose gesloten is, false als de gebruiker annuleert.
  const leaveCompose = useCallback(async () => {
    const dirty = composeRef.current?.isDirty?.() ?? false;
    if (dirty) {
      const result = await choices(
        'Wil je dit bericht als concept opslaan?',
        'Bericht sluiten',
        [
          { label: 'Opslaan als concept', value: 'save',    primary: true },
          { label: 'Verwijderen',         value: 'discard' },
          { label: 'Annuleren',           value: 'cancel'  },
        ]
      );
      if (result === 'cancel') return false;
      if (result === 'save') {
        const values = composeRef.current?.getValues?.() || {};
        saveDraft(values);
      }
    }
    closeCompose();
    return true;
  }, [choices, saveDraft, closeCompose]);

  const prepareExternalContextMenuTarget = useCallback(async () => {
    if (!composeMode) return true;
    return leaveCompose();
  }, [composeMode, leaveCompose]);

  const applyFolderSelection = useCallback((folderId) => {
    setActiveFolder(folderId);
    setSelectedMail(null);
    setSearchQuery('');
    return true;
  }, []);

  const openDraftCompose = useCallback((mail) => {
    setComposeInitial({
      initialTo: mail.to || '',
      initialCc: mail.cc || '',
      initialBcc: mail.bcc || '',
      initialSubject: mail.subject || '',
      initialBody: mail.body || serializeRich([{ text: '' }]),
      initialAttachments: parseMailAttachments(mail.attachments),
      draftId: mail.id,
    });
    setComposeMode('draft');
  }, []);

  const applyMailSelection = useCallback((mail, options = {}) => {
    const { openDraft = true } = options;
    // Concept in lijst openen → open compose
    if (activeFolder === 'drafts' && openDraft) {
      openDraftCompose(mail);
      return true;
    }
    setSelectedMail(mail);
    if (activeFolder === 'inbox' && !mail.read) {
      markRead(mail);
    }
    return true;
  }, [activeFolder, markRead, openDraftCompose]);

  const handleSelectFolder = useCallback(async (folderId) => {
    if (composeMode) {
      const left = await leaveCompose();
      if (!left) return false;
    }
    return applyFolderSelection(folderId);
  }, [applyFolderSelection, composeMode, leaveCompose]);

  const handleSelectMail = useCallback(async (mail, options = {}) => {
    if (composeMode) {
      const left = await leaveCompose();
      if (!left) return false;
    }
    return applyMailSelection(mail, options);
  }, [applyMailSelection, composeMode, leaveCompose]);

  const handleNewMessage = useCallback(async () => {
    if (composeMode) {
      const left = await leaveCompose();
      if (!left) return false;
    }
    setSelectedMail(null);
    openCompose('new');
    return true;
  }, [composeMode, leaveCompose, openCompose]);

  const handleCloseMailPane = useCallback(async () => {
    if (composeMode) {
      const left = await leaveCompose();
      if (!left) return false;
    }
    onClosePaneRef.current?.();
    return true;
  }, [composeMode, leaveCompose]);

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
    return true;
  }, []);

  const handleReply = useCallback((mail) => {
    openCompose('reply', {
      initialTo: mail.from,
      initialSubject: mail.subject?.startsWith('Re:') ? mail.subject : `Re: ${mail.subject || ''}`,
      initialBody: buildReplyBody(mail),
    });
  }, [openCompose]);

  const handleReplyAll = useCallback((mail) => {
    const allRecipients = [mail.to, mail.cc]
      .filter(Boolean)
      .join(', ')
      .split(',')
      .map(a => a.trim())
      .filter(a => a && a !== currentUser);
    openCompose('replyall', {
      initialTo: mail.from,
      initialCc: allRecipients.join(', '),
      initialSubject: mail.subject?.startsWith('Re:') ? mail.subject : `Re: ${mail.subject || ''}`,
      initialBody: buildReplyBody(mail),
    });
  }, [currentUser, openCompose]);

  const handleForward = useCallback((mail) => {
    openCompose('forward', {
      initialTo: '',
      initialSubject: mail.subject?.startsWith('Fwd:') ? mail.subject : `Fwd: ${mail.subject || ''}`,
      initialBody: buildForwardBody(mail),
    });
  }, [openCompose]);

  const handleDelete = useCallback((mail) => {
    markDeleted(mail);
    setSelectedMail(null);
  }, [markDeleted]);

  const handlePermanentDelete = useCallback((mail) => {
    permanentDelete(mail);
    setSelectedMail(null);
  }, [permanentDelete]);

  const handleRestore = useCallback((mail) => {
    restoreFromTrash(mail);
    setSelectedMail(null);
  }, [restoreFromTrash]);

  const handleMarkSelectedRead = useCallback((mail) => {
    if (!mail || activeFolder !== 'inbox') return false;
    markRead(mail);
    setSelectedMail((current) => (current?.id === mail.id ? { ...current, read: true } : current));
    return true;
  }, [activeFolder, markRead]);

  const handleMarkSelectedUnread = useCallback((mail) => {
    if (!mail || activeFolder !== 'inbox') return false;
    markUnread(mail);
    setSelectedMail((current) => (current?.id === mail.id ? { ...current, read: false } : current));
    return true;
  }, [activeFolder, markUnread]);

  // Berichten voor actieve map
  const messages = useMemo(() => {
    if (activeFolder === 'inbox')  return inbox;
    if (activeFolder === 'sent')   return sent;
    if (activeFolder === 'drafts') return drafts;
    if (activeFolder === 'trash')  return trash;
    return [];
  }, [activeFolder, inbox, sent, drafts, trash]);

  // Zoekfilter
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(m =>
      (m.from    || '').toLowerCase().includes(q) ||
      (m.to      || '').toLowerCase().includes(q) ||
      (m.subject || '').toLowerCase().includes(q) ||
      richToPlainText(deserializeRich(m.body)).toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  const inboxHasUnread = useMemo(
    () => inbox.some((mail) => !mail.read),
    [inbox]
  );

  const inboxHasRead = useMemo(
    () => inbox.some((mail) => mail.read),
    [inbox]
  );

  const getComposeState = useCallback(() => ({
    values: composeRef.current?.getValues?.() || {},
    isSending: composeRef.current?.isSending?.() ?? false,
  }), []);

  const buildNewMessageAction = useCallback(() => (
    buildMenuAction('mail-new', 'Nieuw bericht', () => handleNewMessage(), { bold: true })
  ), [handleNewMessage]);

  const buildMarkAllSeenAction = useCallback(() => (
    buildMenuAction('mail-mark-seen', 'Alles als gezien markeren', () => markAllSeen())
  ), [markAllSeen]);

  const buildMarkAllReadAction = useCallback(() => (
    buildMenuAction('mail-mark-all-read', 'Alles als gelezen markeren', () => markAllRead(), {
      disabled: activeFolder !== 'inbox' || !inboxHasUnread,
    })
  ), [activeFolder, inboxHasUnread, markAllRead]);

  const buildMarkAllUnreadAction = useCallback(() => (
    buildMenuAction('mail-mark-all-unread', 'Alles als ongelezen markeren', () => markAllUnread(), {
      disabled: activeFolder !== 'inbox' || !inboxHasRead,
    })
  ), [activeFolder, inboxHasRead, markAllUnread]);

  const buildSelectedMarkReadAction = useCallback((mail) => (
    buildMenuAction(`mail-mark-read-${mail?.id || 'none'}`, 'Markeer als gelezen', () => handleMarkSelectedRead(mail), {
      disabled: !mail || activeFolder !== 'inbox' || mail.read,
    })
  ), [activeFolder, handleMarkSelectedRead]);

  const buildSelectedMarkUnreadAction = useCallback((mail) => (
    buildMenuAction(`mail-mark-unread-${mail?.id || 'none'}`, 'Markeer als ongelezen', () => handleMarkSelectedUnread(mail), {
      disabled: !mail || activeFolder !== 'inbox' || !mail.read,
    })
  ), [activeFolder, handleMarkSelectedUnread]);

  const buildPassiveMailActions = useCallback(() => {
    const actions = [buildNewMessageAction()];
    if (activeFolder === 'inbox') {
      actions.push(buildMarkAllSeenAction());
    }
    return actions;
  }, [activeFolder, buildMarkAllSeenAction, buildNewMessageAction]);

  const buildComposeActions = useCallback(() => {
    const { values, isSending } = getComposeState();
    const actions = [
      buildMenuAction('compose-send', 'Verzenden', () => composeRef.current?.send?.(), {
        disabled: isSending || !values.to?.trim(),
        bold: true,
      }),
      buildMenuAction('compose-save-draft', 'Opslaan als concept', () => composeRef.current?.saveDraft?.(), {
        disabled: isSending,
      }),
    ];

    if (values.draftId) {
      actions.push(
        buildMenuAction('compose-delete-draft', 'Concept verwijderen', () => composeRef.current?.deleteDraft?.(), {
          disabled: isSending,
        })
      );
    }

    actions.push(
      buildMenuAction('compose-attach', 'Bijlage toevoegen', () => composeRef.current?.openFilePicker?.(), {
        disabled: isSending,
      }),
      buildMenuAction('compose-close', 'Sluiten', () => leaveCompose(), {
        disabled: isSending,
      })
    );

    return actions;
  }, [getComposeState, leaveCompose]);

  const buildFolderMenuActions = useCallback((folderId, options = {}) => {
    const { wasActive = false } = options;
    const actions = [
      buildMenuAction(`folder-open-${folderId}`, 'Openen', () => applyFolderSelection(folderId), {
        disabled: wasActive,
        bold: true,
      }),
      buildNewMessageAction(),
    ];

    if (folderId === 'inbox') {
      actions.push(buildMarkAllSeenAction());
    }

    return actions;
  }, [applyFolderSelection, buildMarkAllSeenAction, buildNewMessageAction]);

  const handleDeleteDraftMail = useCallback((mail) => {
    deleteDraft(mail.id);
    setSelectedMail((current) => (current?.id === mail.id ? null : current));
  }, [deleteDraft]);

  const buildMailMenuActions = useCallback((mail, options = {}) => {
    const { includeReadState = false } = options;
    if (!mail) return [];

    if (activeFolder === 'drafts') {
      return [
        buildMenuAction(`draft-open-${mail.id}`, 'Concept openen', () => openDraftCompose(mail), {
          bold: true,
        }),
        buildMenuAction(`draft-delete-${mail.id}`, 'Concept verwijderen', () => handleDeleteDraftMail(mail)),
      ];
    }

    const openAction = buildMenuAction(`mail-open-${mail.id}`, 'Openen', () => (
      applyMailSelection(mail, { openDraft: false })
    ), { bold: true });

    if (activeFolder === 'inbox') {
      const actions = [
        openAction,
        buildMenuAction(`mail-reply-${mail.id}`, 'Beantwoorden', () => handleReply(mail)),
        buildMenuAction(`mail-reply-all-${mail.id}`, 'Allen beantwoorden', () => handleReplyAll(mail)),
        buildMenuAction(`mail-forward-${mail.id}`, 'Doorsturen', () => handleForward(mail)),
        buildMenuAction(`mail-delete-${mail.id}`, 'Verwijderen', () => handleDelete(mail)),
      ];

      if (includeReadState) {
        actions.push(
          buildSeparator(),
          buildSelectedMarkReadAction(mail),
          buildSelectedMarkUnreadAction(mail)
        );
      }

      return actions;
    }

    if (activeFolder === 'sent') {
      return [
        openAction,
        buildMenuAction(`mail-forward-${mail.id}`, 'Doorsturen', () => handleForward(mail)),
        buildMenuAction(`mail-delete-${mail.id}`, 'Verwijderen', () => handleDelete(mail)),
      ];
    }

    if (activeFolder === 'trash') {
      return [
        openAction,
        buildMenuAction(`mail-restore-${mail.id}`, 'Herstellen', () => handleRestore(mail)),
        buildMenuAction(`mail-delete-permanent-${mail.id}`, 'Definitief verwijderen', () => handlePermanentDelete(mail)),
      ];
    }

    return [openAction];
  }, [
    activeFolder,
    applyMailSelection,
    buildSelectedMarkReadAction,
    buildSelectedMarkUnreadAction,
    handleDelete,
    handleDeleteDraftMail,
    handleForward,
    handlePermanentDelete,
    handleReply,
    handleReplyAll,
    handleRestore,
    openDraftCompose,
  ]);

  const buildBodyEditActions = useCallback((options = {}) => {
    const { extraActions = [] } = options;
    const { isSending } = getComposeState();
    const disabled = !composeMode || isSending;
    const command = (name) => () => composeRef.current?.runBodyCommand?.(name);

    const bodyActions = [
      buildMenuAction('compose-body-undo', 'Ongedaan maken', command('undo'), { disabled }),
      buildMenuAction('compose-body-redo', 'Opnieuw', command('redo'), { disabled }),
      buildMenuAction('compose-body-cut', 'Knippen', command('cut'), { disabled }),
      buildMenuAction('compose-body-copy', 'Kopieren', command('copy'), { disabled }),
      buildMenuAction('compose-body-paste', 'Plakken', command('paste'), { disabled }),
      buildMenuAction('compose-body-select-all', 'Alles selecteren', command('selectAll'), { disabled }),
      buildSeparator(),
      buildMenuAction('compose-body-bold', 'Vet', command('bold'), { disabled }),
      buildMenuAction('compose-body-italic', 'Cursief', command('italic'), { disabled }),
      buildMenuAction('compose-body-underline', 'Onderstrepen', command('underline'), { disabled }),
    ];

    return appendMenuActions(bodyActions, extraActions);
  }, [composeMode, getComposeState]);

  const buildComposeFieldActions = useCallback((target, field) => (
    buildTextFieldActions({
      target,
      prefix: `compose-${field}`,
      extraActions: buildComposeActions(),
    })
  ), [buildComposeActions]);

  const buildComposeBodyActions = useCallback(() => (
    buildBodyEditActions({ extraActions: buildComposeActions() })
  ), [buildBodyEditActions, buildComposeActions]);

  const buildAttachmentsActions = useCallback(() => {
    const { isSending } = getComposeState();
    return [
      buildMenuAction('compose-attach-add', 'Bijlage toevoegen', () => composeRef.current?.openFilePicker?.(), {
        disabled: isSending,
      }),
    ];
  }, [getComposeState]);

  const buildAttachmentActions = useCallback((index) => {
    const { isSending } = getComposeState();
    return [
      buildMenuAction(`compose-attachment-remove-${index}`, 'Verwijderen', () => (
        composeRef.current?.removeAttachment?.(index)
      ), {
        disabled: isSending,
      }),
    ];
  }, [getComposeState]);

  const buildSignatureActions = useCallback(() => ([
    buildMenuAction('signature-save', 'Opslaan', handleSaveSig, { bold: true }),
    buildMenuAction('signature-cancel', 'Annuleren', closeSignatureEditor),
  ]), [closeSignatureEditor, handleSaveSig]);

  const buildEditMenuActions = useCallback((contextVersion = 0) => {
    void contextVersion;
    const lastTarget = lastEditTargetRef.current;

    if (lastTarget?.kind === 'compose-body') {
      return buildBodyEditActions();
    }

    if (lastTarget?.target) {
      return buildTextFieldActions({
        target: lastTarget.target,
        prefix: lastTarget.field ? `menu-${lastTarget.field}` : 'menu-field',
      });
    }

    return buildTextFieldActions({ target: null, prefix: 'menu-edit' });
  }, [buildBodyEditActions]);

  const buildFileMenuActions = useCallback(() => {
    const composeActions = composeMode ? buildComposeActions() : [];
    const sendAction = composeActions.find((item) => item.id === 'compose-send');
    const saveDraftAction = composeActions.find((item) => item.id === 'compose-save-draft');
    const deleteDraftAction = composeActions.find((item) => item.id === 'compose-delete-draft');
    const fileActions = [buildNewMessageAction()];

    if (saveDraftAction) fileActions.push(saveDraftAction);
    if (deleteDraftAction) fileActions.push(deleteDraftAction);
    if (sendAction) fileActions.push(sendAction);

    fileActions.push(buildSeparator());
    fileActions.push(buildMenuAction('mail-close-pane', 'Venster sluiten', () => handleCloseMailPane()));

    return fileActions;
  }, [buildComposeActions, buildNewMessageAction, composeMode, handleCloseMailPane]);

  const buildViewMenuActions = useCallback(() => ([
    buildMenuAction('view-inbox', 'Postvak IN', () => handleSelectFolder('inbox'), {
      disabled: activeFolder === 'inbox',
    }),
    buildMenuAction('view-sent', 'Verzonden items', () => handleSelectFolder('sent'), {
      disabled: activeFolder === 'sent',
    }),
    buildMenuAction('view-drafts', 'Concepten', () => handleSelectFolder('drafts'), {
      disabled: activeFolder === 'drafts',
    }),
    buildMenuAction('view-trash', 'Verwijderde items', () => handleSelectFolder('trash'), {
      disabled: activeFolder === 'trash',
    }),
    buildSeparator(),
    buildMenuAction('view-search', 'Zoeken in huidige map', focusSearch),
  ]), [activeFolder, focusSearch, handleSelectFolder]);

  const buildMessageMenuFallback = useCallback(() => {
    if (activeFolder === 'drafts') {
      return [
        buildMenuAction('message-open-draft-disabled', 'Concept openen', () => {}, { disabled: true }),
        buildMenuAction('message-delete-draft-disabled', 'Concept verwijderen', () => {}, { disabled: true }),
      ];
    }

    if (activeFolder === 'sent') {
      return [
        buildMenuAction('message-open-disabled', 'Openen', () => {}, { disabled: true }),
        buildMenuAction('message-forward-disabled', 'Doorsturen', () => {}, { disabled: true }),
        buildMenuAction('message-delete-disabled', 'Verwijderen', () => {}, { disabled: true }),
      ];
    }

    if (activeFolder === 'trash') {
      return [
        buildMenuAction('message-open-disabled', 'Openen', () => {}, { disabled: true }),
        buildMenuAction('message-restore-disabled', 'Herstellen', () => {}, { disabled: true }),
        buildMenuAction('message-delete-permanent-disabled', 'Definitief verwijderen', () => {}, { disabled: true }),
      ];
    }

    return [
      buildMenuAction('message-open-disabled', 'Openen', () => {}, { disabled: true }),
      buildMenuAction('message-reply-disabled', 'Beantwoorden', () => {}, { disabled: true }),
      buildMenuAction('message-reply-all-disabled', 'Allen beantwoorden', () => {}, { disabled: true }),
      buildMenuAction('message-forward-disabled', 'Doorsturen', () => {}, { disabled: true }),
      buildMenuAction('message-delete-disabled', 'Verwijderen', () => {}, { disabled: true }),
      buildSeparator(),
      buildMenuAction('message-mark-read-disabled', 'Markeer als gelezen', () => {}, { disabled: true }),
      buildMenuAction('message-mark-unread-disabled', 'Markeer als ongelezen', () => {}, { disabled: true }),
    ];
  }, [activeFolder]);

  const buildMessageMenuActions = useCallback(() => {
    if (composeMode) {
      const composeActions = buildComposeActions();
      return composeActions.filter((item) => item.id !== 'compose-attach' && item.id !== 'compose-close');
    }

    if (selectedMail) {
      return buildMailMenuActions(selectedMail, { includeReadState: true });
    }

    return buildMessageMenuFallback();
  }, [buildComposeActions, buildMailMenuActions, buildMessageMenuFallback, composeMode, selectedMail]);

  const editMenuItems = useMemo(
    () => buildEditMenuActions(editContextVersion),
    [buildEditMenuActions, editContextVersion]
  );

  const mailMenus = useMemo(() => ([
    { key: 'bestand', label: 'Bestand', items: buildFileMenuActions() },
    { key: 'bewerken', label: 'Bewerken', items: editMenuItems },
    { key: 'beeld', label: 'Beeld', items: buildViewMenuActions() },
    { key: 'map', label: 'Map', items: [buildMarkAllReadAction(), buildMarkAllUnreadAction()] },
    { key: 'bericht', label: 'Bericht', items: buildMessageMenuActions() },
    { key: 'extra', label: 'Extra', items: [buildMenuAction('mail-signature-open', 'Handtekening...', openSignatureEditor)] },
    {
      key: 'help',
      label: 'Help',
      items: [
        buildMenuAction('mail-help-topics', 'ColdMail Help', () => {}, { disabled: true }),
        buildMenuAction('mail-help-about', 'Over ColdMail...', () => {}, { disabled: true }),
      ],
    },
  ]), [
    editMenuItems,
    buildFileMenuActions,
    buildMarkAllReadAction,
    buildMarkAllUnreadAction,
    buildMessageMenuActions,
    buildViewMenuActions,
    openSignatureEditor,
  ]);

  useEffect(() => {
    if (!onLigerMenuChangeRef.current) return undefined;
    onLigerMenuChangeRef.current(mailMenus);
  }, [mailMenus]);

  useEffect(() => (
    () => onLigerMenuChangeRef.current?.(null)
  ), []);

  const handleFolderContextMenu = useCallback(async (event, folder) => {
    const request = captureMenuRequest(event);
    if (!request) return;

    const ready = await prepareExternalContextMenuTarget();
    if (!ready) return;

    const wasActive = activeFolder === folder.id;
    applyFolderSelection(folder.id);
    openColdMailMenu(request, 'mail-folder', { folderId: folder.id }, buildFolderMenuActions(folder.id, { wasActive }));
  }, [
    activeFolder,
    applyFolderSelection,
    buildFolderMenuActions,
    captureMenuRequest,
    openColdMailMenu,
    prepareExternalContextMenuTarget,
  ]);

  const handleFolderBackgroundContextMenu = useCallback(async (event) => {
    const request = captureMenuRequest(event);
    if (!request) return;

    const ready = await prepareExternalContextMenuTarget();
    if (!ready) return;

    openColdMailMenu(request, 'mail-folder-background', { folderId: activeFolder }, buildPassiveMailActions());
  }, [
    activeFolder,
    buildPassiveMailActions,
    captureMenuRequest,
    openColdMailMenu,
    prepareExternalContextMenuTarget,
  ]);

  const handleMessageContextMenu = useCallback(async (event, mail) => {
    const request = captureMenuRequest(event);
    if (!request) return;

    const ready = await prepareExternalContextMenuTarget();
    if (!ready) return;

    applyMailSelection(mail, { openDraft: false });
    openColdMailMenu(request, 'mail-message', { folderId: activeFolder, mailId: mail.id }, buildMailMenuActions(mail));
  }, [
    activeFolder,
    applyMailSelection,
    buildMailMenuActions,
    captureMenuRequest,
    openColdMailMenu,
    prepareExternalContextMenuTarget,
  ]);

  const handleMessageListBackgroundContextMenu = useCallback(async (event) => {
    const request = captureMenuRequest(event);
    if (!request) return;

    const ready = await prepareExternalContextMenuTarget();
    if (!ready) return;

    openColdMailMenu(request, 'mail-message-background', { folderId: activeFolder }, buildPassiveMailActions());
  }, [
    activeFolder,
    buildPassiveMailActions,
    captureMenuRequest,
    openColdMailMenu,
    prepareExternalContextMenuTarget,
  ]);

  const handleMessageViewContextMenu = useCallback((event, mail) => {
    if (!mail) return;
    if (event.target.closest('a, img')) return;
    if (hasSelectionInsideElement(event.currentTarget)) return;

    const request = captureMenuRequest(event);
    if (!request) return;

    openColdMailMenu(request, 'mail-message-view', { folderId: activeFolder, mailId: mail.id }, buildMailMenuActions(mail));
  }, [activeFolder, buildMailMenuActions, captureMenuRequest, openColdMailMenu]);

  const handleComposeContextMenu = useCallback((event) => {
    const request = captureMenuRequest(event);
    if (!request) return;

    openColdMailMenu(request, 'mail-compose', { mode: composeMode }, buildComposeActions());
  }, [buildComposeActions, captureMenuRequest, composeMode, openColdMailMenu]);

  const handleComposeFieldContextMenu = useCallback((event, context = {}) => {
    const request = captureMenuRequest(event);
    if (!request) return;

    const target = context.target || event.currentTarget;
    openColdMailMenu(
      request,
      'mail-compose-field',
      { field: context.field || null, mode: composeMode },
      buildComposeFieldActions(target, context.field || 'field')
    );
  }, [buildComposeFieldActions, captureMenuRequest, composeMode, openColdMailMenu]);

  const handleComposeBodyContextMenu = useCallback((event) => {
    const request = captureMenuRequest(event);
    if (!request) return;

    openColdMailMenu(request, 'mail-compose-body', { mode: composeMode }, buildComposeBodyActions());
  }, [buildComposeBodyActions, captureMenuRequest, composeMode, openColdMailMenu]);

  const handleComposeAttachmentsContextMenu = useCallback((event) => {
    const request = captureMenuRequest(event);
    if (!request) return;

    openColdMailMenu(request, 'mail-compose-attachments', { mode: composeMode }, buildAttachmentsActions());
  }, [buildAttachmentsActions, captureMenuRequest, composeMode, openColdMailMenu]);

  const handleComposeAttachmentContextMenu = useCallback((event, context = {}) => {
    const request = captureMenuRequest(event);
    if (!request) return;

    openColdMailMenu(
      request,
      'mail-compose-attachment',
      { index: context.index ?? null, mode: composeMode },
      buildAttachmentActions(context.index)
    );
  }, [buildAttachmentActions, captureMenuRequest, composeMode, openColdMailMenu]);

  const handleSignatureContextMenu = useCallback((event) => {
    const request = captureMenuRequest(event);
    if (!request) return;

    openColdMailMenu(request, 'mail-signature', null, buildSignatureActions());
  }, [buildSignatureActions, captureMenuRequest, openColdMailMenu]);

  const handleSignatureFieldContextMenu = useCallback((event) => {
    const request = captureMenuRequest(event);
    if (!request) return;

    openColdMailMenu(
      request,
      'mail-signature-field',
      null,
      buildTextFieldActions({
        target: event.currentTarget,
        prefix: 'signature-field',
        extraActions: buildSignatureActions(),
      })
    );
  }, [buildSignatureActions, captureMenuRequest, openColdMailMenu]);

  const handleComposeFieldFocus = useCallback((context = {}) => {
    registerEditTarget({
      kind: 'compose-field',
      scope: 'compose',
      field: context.field || null,
      target: context.target || null,
    });
  }, [registerEditTarget]);

  const handleComposeBodyFocus = useCallback(() => {
    registerEditTarget({
      kind: 'compose-body',
      scope: 'compose',
    });
  }, [registerEditTarget]);

  const handleSignatureFieldFocus = useCallback((event) => {
    registerEditTarget({
      kind: 'signature-field',
      scope: 'signature',
      field: 'signature',
      target: event.currentTarget,
    });
  }, [registerEditTarget]);

  const isLiger  = chromeVariant === 'liger';
  const appName  = isLiger ? 'iMail' : 'ColdMail';

  return (
    <div className={`mail-pane mail-pane--${isLiger ? 'liger' : 'dx'}`}>
      {!isLiger && (
        <div className="mail-menubar contacts-menubar" data-functional-menubar="true">
          {mailMenus.map((menu) => (
            <DropdownMenu
              key={menu.key}
              label={menu.label}
              items={mapMenuItemsToDropdown(menu.items)}
              isOpen={openMenu === menu.key}
              onToggle={() => setOpenMenu((current) => (current === menu.key ? null : menu.key))}
              onClose={() => setOpenMenu((current) => (current === menu.key ? null : current))}
              onHover={() => openMenu && setOpenMenu(menu.key)}
            />
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className={`mail-toolbar mail-command-strip${isLiger ? ' mail-command-strip--hidden' : ''}`}>
        <button
          type="button"
          className="mail-toolbar__btn"
          onClick={() => handleNewMessage()}
          title="Nieuw bericht"
        >✉️ Nieuw bericht</button>

        <button
          type="button"
          className="mail-toolbar__btn"
          onClick={() => {
            if (!showSigEditor) setSigEditorValue(signature);
            setShowSigEditor(v => !v);
          }}
          hidden
          title="Handtekening instellen"
        >✍️ Handtekening</button>
      </div>

      {/* Handtekening editor (floating panel) */}
      {showSigEditor && (
        <div
          className="mail-sig-editor"
          onContextMenu={handleSignatureContextMenu}
        >
          <div className="mail-sig-editor__titlebar">
            <span>Handtekening instellen</span>
            <button
              type="button"
              className="mail-sig-editor__close"
              onClick={closeSignatureEditor}
            >✕</button>
          </div>
          <div className="mail-sig-editor__body">
            <textarea
              className="mail-sig-editor__input"
              value={sigEditorValue}
              onChange={e => setSigEditorValue(e.target.value)}
              placeholder="Uw handtekening (plain text)..."
              rows={3}
              aria-label="Handtekening"
              onContextMenu={(event) => {
                event.stopPropagation();
                handleSignatureFieldContextMenu(event);
              }}
              onFocus={handleSignatureFieldFocus}
            />
            <div className="mail-sig-editor__actions">
              <button
                type="button"
                className="mail-compose__btn"
                onClick={handleSaveSig}
              >Opslaan</button>
              <button
                type="button"
                className="mail-compose__btn"
                onClick={closeSignatureEditor}
              >Annuleren</button>
            </div>
          </div>
        </div>
      )}

      {/* Driedelig layout */}
      <div className="mail-layout">
        <MailFolderList
          activeFolder={activeFolder}
          onSelectFolder={handleSelectFolder}
          unreadCount={unreadCount}
          draftsCount={drafts.length}
          onFolderContextMenu={handleFolderContextMenu}
          onBackgroundContextMenu={handleFolderBackgroundContextMenu}
        />
        <div className="mail-message-column">
          <div className="mail-message-search">
            <input
              ref={searchInputRef}
              type="search"
              className="mail-message-search__input"
              placeholder="Zoeken in huidige map..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <MailMessageList
            messages={filteredMessages}
            selectedId={selectedMail?.id}
            onSelect={handleSelectMail}
            folder={activeFolder}
            onMessageContextMenu={handleMessageContextMenu}
            onBackgroundContextMenu={handleMessageListBackgroundContextMenu}
          />
        </div>

        {composeMode ? (
          <div
            className="mail-compose-panel"
            onContextMenu={handleComposeContextMenu}
          >
            <div
              className="mail-compose-panel__header"
              onContextMenu={handleComposeContextMenu}
            >
              <span>{resolveComposeTitle(composeMode, appName)}</span>
              <button
                type="button"
                className="mail-compose-panel__close"
                onClick={leaveCompose}
                title="Sluiten"
              >✕</button>
            </div>
            <MailCompose
              ref={composeRef}
              currentUser={currentUser}
              onSend={closeCompose}
              onClose={leaveCompose}
              initialTo={composeInitial.initialTo}
              initialCc={composeInitial.initialCc}
              initialBcc={composeInitial.initialBcc}
              initialSubject={composeInitial.initialSubject}
              initialBody={composeInitial.initialBody}
              initialAttachments={composeInitial.initialAttachments}
              draftId={composeInitial.draftId}
              contacts={contacts}
              onSaveDraft={saveDraft}
              onDeleteDraft={deleteDraft}
              onComposeContextMenu={handleComposeContextMenu}
              onFieldContextMenu={handleComposeFieldContextMenu}
              onFieldFocus={handleComposeFieldFocus}
              onBodyContextMenu={handleComposeBodyContextMenu}
              onBodyFocus={handleComposeBodyFocus}
              onAttachmentsContextMenu={handleComposeAttachmentsContextMenu}
              onAttachmentContextMenu={handleComposeAttachmentContextMenu}
            />
          </div>
        ) : (
          <MailMessageView
            mail={selectedMail}
            activeFolder={activeFolder}
            onReply={handleReply}
            onReplyAll={handleReplyAll}
            onForward={handleForward}
            onDelete={handleDelete}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
            onMessageContextMenu={handleMessageViewContextMenu}
            onEmptyContextMenu={handleMessageListBackgroundContextMenu}
          />
        )}
      </div>
    </div>
  );
}

export default MailPane;
