// src/components/mail/MailMessageView.js

import React from 'react';
import RichTextRenderer from '../shared/RichTextRenderer';
import { mimeIcon, formatFileSize } from './mailAttachments';

function parseAttachments(attachmentsJson) {
  if (!attachmentsJson) return [];
  try {
    return JSON.parse(attachmentsJson);
  } catch {
    return [];
  }
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('nl-NL', {
    weekday: 'short', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function MailMessageView({
  mail,
  onReply,
  onForward,
  onReplyAll,
  onDelete,
  onRestore,
  onPermanentDelete,
  activeFolder,
}) {
  if (!mail) {
    return (
      <div className="mail-message-view mail-message-view--empty">
        <span>Selecteer een bericht</span>
      </div>
    );
  }

  const attachments = parseAttachments(mail.attachments);
  const isTrash = activeFolder === 'trash';

  return (
    <div className="mail-message-view">
      <div className="mail-message-view__header">
        <div className="mail-message-view__subject">{mail.subject || '(geen onderwerp)'}</div>
        <div className="mail-message-view__meta">
          <span><strong>Van:</strong> {mail.from}</span>
          <span><strong>Aan:</strong> {mail.to}</span>
          {mail.cc && <span><strong>CC:</strong> {mail.cc}</span>}
          <span><strong>Datum:</strong> {formatDate(mail.timestamp)}</span>
        </div>
        <div className="mail-message-view__actions">
          {!isTrash && (
            <>
              <button
                type="button"
                className="mail-toolbar__btn"
                onClick={() => onReply && onReply(mail)}
                title="Beantwoorden"
              >↩ Beantwoorden</button>
              <button
                type="button"
                className="mail-toolbar__btn"
                onClick={() => onReplyAll && onReplyAll(mail)}
                title="Allen beantwoorden"
              >↩↩ Allen</button>
              <button
                type="button"
                className="mail-toolbar__btn"
                onClick={() => onForward && onForward(mail)}
                title="Doorsturen"
              >↪ Doorsturen</button>
              <button
                type="button"
                className="mail-toolbar__btn mail-toolbar__btn--delete"
                onClick={() => onDelete && onDelete(mail)}
                title="Verwijderen"
              >🗑️ Verwijderen</button>
            </>
          )}
          {isTrash && (
            <>
              <button
                type="button"
                className="mail-toolbar__btn"
                onClick={() => onRestore && onRestore(mail)}
                title="Herstellen"
              >↩ Herstellen</button>
              <button
                type="button"
                className="mail-toolbar__btn mail-toolbar__btn--delete"
                onClick={() => onPermanentDelete && onPermanentDelete(mail)}
                title="Definitief verwijderen"
              >🗑️ Definitief verwijderen</button>
            </>
          )}
        </div>
      </div>
      <div className="mail-message-view__body">
        <RichTextRenderer value={mail.body} />
      </div>
      {attachments.length > 0 && (
        <div className="mail-message-view__attachments">
          <div className="mail-attachment-label">Bijlages ({attachments.length})</div>
          {attachments.map((att, i) => (
            <div key={i} className="mail-attachment">
              <span className="mail-attachment__icon">{mimeIcon(att.mimeType)}</span>
              <span className="mail-attachment__name">{att.name}</span>
              <span className="mail-attachment__size">{formatFileSize(att.size)}</span>
              {att.mimeType && att.mimeType.startsWith('image/') && (
                <img
                  src={att.dataUrl}
                  alt={att.name}
                  className="mail-attachment__preview"
                />
              )}
              <a
                href={att.dataUrl}
                download={att.name}
                className="mail-attachment__download"
              >Downloaden</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MailMessageView;
