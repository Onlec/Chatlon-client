// src/components/panes/MailPane.js

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import './MailPane.css';
import MailFolderList from '../mail/MailFolderList';
import MailMessageList from '../mail/MailMessageList';
import MailMessageView from '../mail/MailMessageView';
import MailCompose from '../mail/MailCompose';
import { useMailInbox } from '../mail/useMailInbox';
import { useMailDrafts } from '../mail/useMailDrafts';
import { deserializeRich, richToPlainText, serializeRich } from '../../utils/richText';
import { user } from '../../gun';

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

function MailPane({ currentUser, chromeVariant = 'dx', contacts = [] }) {
  const [activeFolder, setActiveFolder] = useState('inbox');
  const [selectedMail, setSelectedMail]   = useState(null);
  const [composeMode, setComposeMode]     = useState(null);
  const [composeInitial, setComposeInitial] = useState({});
  const [searchQuery, setSearchQuery]     = useState('');

  // Handtekening
  const [signature, setSignature]         = useState('');
  const [showSigEditor, setShowSigEditor] = useState(false);
  const [sigEditorValue, setSigEditorValue] = useState('');

  const {
    inbox, sent, trash, unreadCount,
    markAllSeen, markRead,
    markDeleted, permanentDelete, restoreFromTrash,
  } = useMailInbox(currentUser);

  const { drafts, saveDraft, deleteDraft } = useMailDrafts();

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

  const handleSaveSig = useCallback(() => {
    if (!user.is) return;
    user.get('mailSignature').put(sigEditorValue);
    setSignature(sigEditorValue);
    setShowSigEditor(false);
  }, [sigEditorValue]);

  const handleSelectFolder = useCallback((folderId) => {
    setActiveFolder(folderId);
    setSelectedMail(null);
    setSearchQuery('');
    if (folderId === 'inbox') markAllSeen();
  }, [markAllSeen]);

  const handleSelectMail = useCallback((mail) => {
    // Concept in lijst openen → open compose
    if (activeFolder === 'drafts') {
      setComposeInitial({
        initialTo: mail.to || '',
        initialCc: mail.cc || '',
        initialBcc: mail.bcc || '',
        initialSubject: mail.subject || '',
        initialBody: mail.body || serializeRich([{ text: '' }]),
        draftId: mail.id,
      });
      setComposeMode('draft');
      return;
    }
    setSelectedMail(mail);
    if (activeFolder === 'inbox' && !mail.read) {
      markRead(mail.id);
    }
  }, [activeFolder, markRead]);

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
    markDeleted(mail.id);
    setSelectedMail(null);
  }, [markDeleted]);

  const handlePermanentDelete = useCallback((mail) => {
    permanentDelete(mail.id);
    setSelectedMail(null);
  }, [permanentDelete]);

  const handleRestore = useCallback((mail) => {
    restoreFromTrash(mail.id);
    setSelectedMail(null);
  }, [restoreFromTrash]);

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

  const isLiger  = chromeVariant === 'liger';
  const appName  = isLiger ? 'iMail' : 'ColdMail';

  return (
    <div className={`mail-pane mail-pane--${isLiger ? 'liger' : 'dx'}`}>
      {/* Toolbar */}
      <div className="mail-toolbar">
        <button
          type="button"
          className="mail-toolbar__btn"
          onClick={() => openCompose('new')}
          title="Nieuw bericht"
        >✉️ Nieuw bericht</button>

        <input
          type="search"
          className="mail-toolbar__search"
          placeholder="Zoeken..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />

        <button
          type="button"
          className="mail-toolbar__btn"
          onClick={() => {
            if (!showSigEditor) setSigEditorValue(signature);
            setShowSigEditor(v => !v);
          }}
          title="Handtekening instellen"
        >✍️ Handtekening</button>
      </div>

      {/* Handtekening editor (floating panel) */}
      {showSigEditor && (
        <div className="mail-sig-editor">
          <div className="mail-sig-editor__titlebar">
            <span>Handtekening instellen</span>
            <button
              type="button"
              className="mail-sig-editor__close"
              onClick={() => setShowSigEditor(false)}
            >✕</button>
          </div>
          <div className="mail-sig-editor__body">
            <textarea
              className="mail-sig-editor__input"
              value={sigEditorValue}
              onChange={e => setSigEditorValue(e.target.value)}
              placeholder="Uw handtekening (plain text)..."
              rows={3}
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
                onClick={() => setShowSigEditor(false)}
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
        />
        <MailMessageList
          messages={filteredMessages}
          selectedId={selectedMail?.id}
          onSelect={handleSelectMail}
          folder={activeFolder}
        />
        <MailMessageView
          mail={selectedMail}
          activeFolder={activeFolder}
          onReply={handleReply}
          onReplyAll={handleReplyAll}
          onForward={handleForward}
          onDelete={handleDelete}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
        />
      </div>

      {/* Compose venster (zweeft intern) */}
      {composeMode && (
        <div className="mail-compose-window">
          <div className="mail-compose-titlebar">
            <span>{resolveComposeTitle(composeMode, appName)}</span>
            <button
              type="button"
              className="mail-compose-titlebar__close"
              onClick={closeCompose}
            >✕</button>
          </div>
          <MailCompose
            currentUser={currentUser}
            onSend={closeCompose}
            onClose={closeCompose}
            initialTo={composeInitial.initialTo}
            initialCc={composeInitial.initialCc}
            initialBcc={composeInitial.initialBcc}
            initialSubject={composeInitial.initialSubject}
            initialBody={composeInitial.initialBody}
            draftId={composeInitial.draftId}
            contacts={contacts}
            onSaveDraft={saveDraft}
            onDeleteDraft={deleteDraft}
          />
        </div>
      )}
    </div>
  );
}

export default MailPane;
