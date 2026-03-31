// src/components/mail/MailCompose.js

import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from 'react';
import RichTextEditor from '../shared/RichTextEditor';
import { useMailCompose } from './useMailCompose';
import {
  readFileAsBase64,
  formatFileSize,
  mimeIcon,
  MAX_ATTACHMENT_SIZE,
  parseMailAttachments
} from './mailAttachments';
import { serializeRich } from '../../utils/richText';

const MailCompose = forwardRef(function MailCompose({
  currentUser,
  onSend,
  onClose,
  initialTo = '',
  initialSubject = '',
  initialBody = null,
  initialCc = '',
  initialBcc = '',
  initialAttachments = null,
  contacts = [],
  draftId: initialDraftId = null,
  onSaveDraft,
  onDeleteDraft,
  onComposeContextMenu,
  onFieldContextMenu,
  onFieldFocus,
  onBodyContextMenu,
  onBodyFocus,
  onAttachmentsContextMenu,
  onAttachmentContextMenu,
}, ref) {
  const [to, setTo]         = useState(initialTo);
  const [cc, setCc]         = useState(initialCc);
  const [bcc, setBcc]       = useState(initialBcc);
  const [showCcBcc, setShowCcBcc] = useState(!!(initialCc || initialBcc));
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody]     = useState(initialBody ?? serializeRich([{ text: '' }]));
  const [attachments, setAttachments] = useState(() => parseMailAttachments(initialAttachments));
  const [attachError, setAttachError] = useState('');
  const [draftId, setDraftId] = useState(initialDraftId);
  const [showPicker, setShowPicker] = useState(null); // 'to' | 'cc' | 'bcc' | null
  const [isDirty, setIsDirty] = useState(false);
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);

  const { sendMail, isSending, error, clearError } = useMailCompose(currentUser);

  useEffect(() => {
    setTo(initialTo);
    setCc(initialCc);
    setBcc(initialBcc);
    setShowCcBcc(Boolean(initialCc || initialBcc));
    setSubject(initialSubject);
    setBody(initialBody ?? serializeRich([{ text: '' }]));
    setAttachments(parseMailAttachments(initialAttachments));
    setAttachError('');
    setDraftId(initialDraftId);
    setShowPicker(null);
    setIsDirty(false);
  }, [
    initialTo,
    initialCc,
    initialBcc,
    initialSubject,
    initialBody,
    initialAttachments,
    initialDraftId,
  ]);

  const markDirty = () => setIsDirty(true);

  const handleAttachFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAttachError('');

    if (file.size > MAX_ATTACHMENT_SIZE) {
      setAttachError(`Bestand te groot (max 500 KB). Dit bestand is ${formatFileSize(file.size)}.`);
      e.target.value = '';
      return;
    }

    const dataUrl = await readFileAsBase64(file);
    setAttachments(prev => [...prev, {
      name: file.name,
      size: file.size,
      mimeType: file.type,
      dataUrl,
    }]);
    markDirty();
    e.target.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    markDirty();
  };

  const handleSaveDraft = () => {
    if (!onSaveDraft) return;
    const id = onSaveDraft({ draftId, to, cc, bcc, subject, body, attachments });
    if (id && id !== draftId) setDraftId(id);
    setIsDirty(false);
    return id;
  };

  const handleDeleteDraft = () => {
    if (!draftId || !onDeleteDraft) return false;
    onDeleteDraft(draftId);
    setDraftId(null);
    setIsDirty(false);
    if (onClose) {
      return onClose();
    }
    return true;
  };

  const handleSend = async () => {
    clearError();
    const success = await sendMail({ to, cc, bcc, subject, body, attachments });
    if (success) {
      if (draftId && onDeleteDraft) onDeleteDraft(draftId);
      if (onSend) onSend();
    }
    return success;
  };

  const addToField = (setter, value) => {
    setter(prev => prev ? `${prev}, ${value}` : value);
    setShowPicker(null);
    markDirty();
  };

  const handleComposeContextMenu = (event) => {
    event.stopPropagation();
    onComposeContextMenu?.(event);
  };

  const handleFieldContextMenu = (field) => (event) => {
    event.stopPropagation();
    onFieldContextMenu?.(event, { field, target: event.currentTarget });
  };

  const handleFieldFocus = (field) => (event) => {
    onFieldFocus?.({ field, target: event.currentTarget });
  };

  const handleBodyContextMenu = (event) => {
    event.stopPropagation();
    onBodyContextMenu?.(event, { target: event.target });
  };

  const handleAttachmentsContextMenu = (event) => {
    event.stopPropagation();
    onAttachmentsContextMenu?.(event);
  };

  const handleAttachmentContextMenu = (attachment, index) => (event) => {
    event.stopPropagation();
    onAttachmentContextMenu?.(event, { attachment, index });
  };

  // Stel huidige waarden + dirty-flag beschikbaar aan de ouder via ref
  useImperativeHandle(ref, () => ({
    getValues: () => ({ draftId, to, cc, bcc, subject, body, attachments }),
    isDirty: () => isDirty,
    isSending: () => isSending,
    send: handleSend,
    saveDraft: handleSaveDraft,
    deleteDraft: handleDeleteDraft,
    openFilePicker: () => fileInputRef.current?.click(),
    removeAttachment,
    runBodyCommand: (command) => editorRef.current?.runCommand?.(command),
  }), [
    attachments,
    bcc,
    body,
    cc,
    draftId,
    handleDeleteDraft,
    handleSend,
    handleSaveDraft,
    isDirty,
    isSending,
    removeAttachment,
    subject,
    to,
  ]);

  return (
    <div className="mail-compose" onContextMenu={handleComposeContextMenu}>
      <div className="mail-compose__fields">

        {/* Aan */}
        <div className="mail-compose__row" style={{ position: 'relative' }}>
          <label className="mail-compose__label">Aan:</label>
          <input
            type="text"
            className="mail-compose__input"
            value={to}
            onChange={e => { setTo(e.target.value); markDirty(); }}
            placeholder="ontvanger@coldmail.com"
            disabled={isSending}
            aria-label="Aan"
            onContextMenu={handleFieldContextMenu('to')}
            onFocus={handleFieldFocus('to')}
          />
          {contacts.length > 0 && (
            <button
              type="button"
              className="mail-compose__addr-btn"
              title="Contacten"
              onClick={() => setShowPicker(showPicker === 'to' ? null : 'to')}
            >📋</button>
          )}
          <button
            type="button"
            className="mail-compose__ccbcc-toggle"
            onClick={() => setShowCcBcc(v => !v)}
            title="CC en BCC tonen/verbergen"
          >{showCcBcc ? 'Verberg CC/BCC' : 'CC/BCC'}</button>
          {showPicker === 'to' && (
            <div className="mail-compose__addr-picker">
              {contacts.map(c => (
                <div
                  key={c}
                  className="mail-compose__addr-picker-item"
                  onClick={() => addToField(setTo, c)}
                >{c}</div>
              ))}
            </div>
          )}
        </div>

        {showCcBcc && (
          <>
            <div className="mail-compose__row" style={{ position: 'relative' }}>
              <label className="mail-compose__label">CC:</label>
              <input
                type="text"
                className="mail-compose__input"
                value={cc}
                onChange={e => { setCc(e.target.value); markDirty(); }}
                placeholder="cc@coldmail.com (kommagescheiden)"
                disabled={isSending}
                aria-label="CC"
                onContextMenu={handleFieldContextMenu('cc')}
                onFocus={handleFieldFocus('cc')}
              />
              {contacts.length > 0 && (
                <button
                  type="button"
                  className="mail-compose__addr-btn"
                  title="Contacten"
                  onClick={() => setShowPicker(showPicker === 'cc' ? null : 'cc')}
                >📋</button>
              )}
              {showPicker === 'cc' && (
                <div className="mail-compose__addr-picker">
                  {contacts.map(c => (
                    <div
                      key={c}
                      className="mail-compose__addr-picker-item"
                      onClick={() => addToField(setCc, c)}
                    >{c}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="mail-compose__row" style={{ position: 'relative' }}>
              <label className="mail-compose__label">BCC:</label>
              <input
                type="text"
                className="mail-compose__input"
                value={bcc}
                onChange={e => { setBcc(e.target.value); markDirty(); }}
                placeholder="bcc@coldmail.com (kommagescheiden)"
                disabled={isSending}
                aria-label="BCC"
                onContextMenu={handleFieldContextMenu('bcc')}
                onFocus={handleFieldFocus('bcc')}
              />
              {contacts.length > 0 && (
                <button
                  type="button"
                  className="mail-compose__addr-btn"
                  title="Contacten"
                  onClick={() => setShowPicker(showPicker === 'bcc' ? null : 'bcc')}
                >📋</button>
              )}
              {showPicker === 'bcc' && (
                <div className="mail-compose__addr-picker">
                  {contacts.map(c => (
                    <div
                      key={c}
                      className="mail-compose__addr-picker-item"
                      onClick={() => addToField(setBcc, c)}
                    >{c}</div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div className="mail-compose__row">
          <label className="mail-compose__label">Onderwerp:</label>
          <input
            type="text"
            className="mail-compose__input"
            value={subject}
            onChange={e => { setSubject(e.target.value); markDirty(); }}
            placeholder="Onderwerp"
            disabled={isSending}
            aria-label="Onderwerp"
            onContextMenu={handleFieldContextMenu('subject')}
            onFocus={handleFieldFocus('subject')}
          />
        </div>
      </div>

      <div className="mail-compose__body" onContextMenu={handleBodyContextMenu}>
        <RichTextEditor
          ref={editorRef}
          value={body}
          onChange={v => { setBody(v); markDirty(); }}
          placeholder="Schrijf hier je bericht..."
          disabled={isSending}
          onFocus={() => onBodyFocus?.({ target: editorRef.current?.getElement?.() || null })}
        />
      </div>

      <div
        className="mail-compose__attachments"
        onContextMenu={handleAttachmentsContextMenu}
      >
        {attachments.map((att, i) => (
          <div
            key={i}
            className="mail-attachment mail-attachment--compose"
            onContextMenu={handleAttachmentContextMenu(att, i)}
          >
            <span className="mail-attachment__icon">{mimeIcon(att.mimeType)}</span>
            <span className="mail-attachment__name">{att.name}</span>
            <span className="mail-attachment__size">{formatFileSize(att.size)}</span>
            <button
              type="button"
              className="mail-attachment__remove"
              onClick={() => removeAttachment(i)}
            >×</button>
          </div>
        ))}
        {attachError && <div className="mail-compose__error">{attachError}</div>}
      </div>

      {error && <div className="mail-compose__error">{error}</div>}

      <div className="mail-compose__actions">
        <button
          type="button"
          className="mail-compose__btn mail-compose__btn--attach"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
        >📎 Bijlage</button>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleAttachFile}
        />
        {onSaveDraft && (
          <button
            type="button"
            className="mail-compose__btn"
            onClick={handleSaveDraft}
            disabled={isSending}
            title={draftId ? 'Concept bijwerken' : 'Opslaan als concept'}
          >💾 Concept</button>
        )}
        {draftId && onDeleteDraft && (
          <button
            type="button"
            className="mail-compose__btn mail-compose__btn--delete"
            onClick={handleDeleteDraft}
            disabled={isSending}
            title="Concept verwijderen"
          >Verwijderen</button>
        )}
        <button
          type="button"
          className="mail-compose__btn mail-compose__btn--send"
          onClick={handleSend}
          disabled={isSending || !to.trim()}
        >{isSending ? 'Verzenden...' : 'Verzenden'}</button>
        <button
          type="button"
          className="mail-compose__btn mail-compose__btn--cancel"
          onClick={onClose}
          disabled={isSending}
        >Annuleren</button>
      </div>
    </div>
  );
});

export default MailCompose;
