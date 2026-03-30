// src/components/mail/MailCompose.js

import React, { useState, useRef } from 'react';
import RichTextEditor from '../shared/RichTextEditor';
import { useMailCompose } from './useMailCompose';
import { readFileAsBase64, formatFileSize, mimeIcon, MAX_ATTACHMENT_SIZE } from './mailAttachments';
import { serializeRich } from '../../utils/richText';

function MailCompose({
  currentUser,
  onSend,
  onClose,
  initialTo = '',
  initialSubject = '',
  initialBody = null,
  initialCc = '',
  initialBcc = '',
  contacts = [],
  draftId: initialDraftId = null,
  onSaveDraft,
  onDeleteDraft,
}) {
  const [to, setTo]         = useState(initialTo);
  const [cc, setCc]         = useState(initialCc);
  const [bcc, setBcc]       = useState(initialBcc);
  const [showCcBcc, setShowCcBcc] = useState(!!(initialCc || initialBcc));
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody]     = useState(initialBody ?? serializeRich([{ text: '' }]));
  const [attachments, setAttachments] = useState([]);
  const [attachError, setAttachError] = useState('');
  const [draftId, setDraftId] = useState(initialDraftId);
  const [showPicker, setShowPicker] = useState(null); // 'to' | 'cc' | 'bcc' | null
  const fileInputRef = useRef(null);

  const { sendMail, isSending, error, clearError } = useMailCompose(currentUser);

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
    e.target.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveDraft = () => {
    if (!onSaveDraft) return;
    const id = onSaveDraft({ draftId, to, cc, bcc, subject, body, attachments });
    if (id && id !== draftId) setDraftId(id);
  };

  const handleSend = async () => {
    clearError();
    const success = await sendMail({ to, cc, bcc, subject, body, attachments });
    if (success) {
      if (draftId && onDeleteDraft) onDeleteDraft(draftId);
      if (onSend) onSend();
    }
  };

  const addToField = (setter, value) => {
    setter(prev => prev ? `${prev}, ${value}` : value);
    setShowPicker(null);
  };

  return (
    <div className="mail-compose">
      <div className="mail-compose__fields">

        {/* Aan */}
        <div className="mail-compose__row" style={{ position: 'relative' }}>
          <label className="mail-compose__label">Aan:</label>
          <input
            type="text"
            className="mail-compose__input"
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="ontvanger@coldmail.com"
            disabled={isSending}
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
                onChange={e => setCc(e.target.value)}
                placeholder="cc@coldmail.com (kommagescheiden)"
                disabled={isSending}
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
                onChange={e => setBcc(e.target.value)}
                placeholder="bcc@coldmail.com (kommagescheiden)"
                disabled={isSending}
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
            onChange={e => setSubject(e.target.value)}
            placeholder="Onderwerp"
            disabled={isSending}
          />
        </div>
      </div>

      <RichTextEditor
        value={body}
        onChange={setBody}
        placeholder="Schrijf hier je bericht..."
        disabled={isSending}
      />

      <div className="mail-compose__attachments">
        {attachments.map((att, i) => (
          <div key={i} className="mail-attachment mail-attachment--compose">
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
}

export default MailCompose;
