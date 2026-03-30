// src/components/mail/useMailCompose.js

import { useState, useCallback } from 'react';
import { gun, user } from '../../gun';
import { MAX_ATTACHMENT_SIZE, parseMailAttachments, serializeMailAttachments } from './mailAttachments';

/**
 * Valideer of een ontvanger bestaat in Chatlon via Gun.
 * @param {string} email
 * @returns {Promise<boolean>}
 */
function validateRecipient(email) {
  return new Promise((resolve) => {
    gun.get('~@' + email).once((data) => {
      resolve(data != null && Object.keys(data || {}).some(k => k.startsWith('~')));
    });
  });
}

/**
 * Splits en normaliseert een kommagescheiden adressenlijst.
 * @param {string} value
 * @returns {string[]}
 */
function parseAddresses(value) {
  if (!value || !value.trim()) return [];
  return value.split(',').map(a => a.trim()).filter(Boolean);
}

/**
 * Hook voor het opstellen en verzenden van mail.
 *
 * @param {string} currentUser - Email/alias van de verzender
 * @returns {{ sendMail, isSending, error, clearError }}
 */
export function useMailCompose(currentUser) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Verstuur een mail.
   * @param {{ to, cc, bcc, subject, body, attachments }} mailData
   * @returns {Promise<boolean>} true bij succes
   */
  const sendMail = useCallback(async ({ to, cc = '', bcc = '', subject, body, attachments = [] }) => {
    if (!currentUser || !user.is) {
      setError('Je bent niet ingelogd.');
      return false;
    }

    const toAddresses = parseAddresses(to);
    if (toAddresses.length === 0) {
      setError('Vul een ontvanger in.');
      return false;
    }

    const ccAddresses = parseAddresses(cc);
    const bccAddresses = parseAddresses(bcc);
    const normalizedAttachments = parseMailAttachments(attachments);

    // Bijlage grootte check
    for (const att of normalizedAttachments) {
      if (att.size > MAX_ATTACHMENT_SIZE) {
        setError(`Bijlage "${att.name}" is te groot (max 500 KB).`);
        return false;
      }
    }

    setIsSending(true);
    setError(null);

    // Valideer alle zichtbare ontvangers (to + cc); bcc hoeft niet gevalideerd via Gun-user check
    const allVisible = [...toAddresses, ...ccAddresses];
    for (const addr of allVisible) {
      const exists = await validateRecipient(addr);
      if (!exists) {
        setError(`Adres "${addr}" bestaat niet in Chatlon.`);
        setIsSending(false);
        return false;
      }
    }
    for (const addr of bccAddresses) {
      const exists = await validateRecipient(addr);
      if (!exists) {
        setError(`BCC-adres "${addr}" bestaat niet in Chatlon.`);
        setIsSending(false);
        return false;
      }
    }

    const mailId = `mail_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const timestamp = Date.now();
    const attachmentsJson = serializeMailAttachments(normalizedAttachments);

    const baseData = {
      from: currentUser,
      to: toAddresses.join(', '),
      ...(ccAddresses.length > 0 ? { cc: ccAddresses.join(', ') } : {}),
      subject: subject || '(geen onderwerp)',
      body: body || '',
      timestamp,
      read: false,
      ...(attachmentsJson ? { attachments: attachmentsJson } : {})
    };

    // Stuur naar primaire ontvangers (to)
    for (const addr of toAddresses) {
      gun.get('MAIL_INBOX').get(addr).get(mailId).put(baseData);
    }

    // Stuur kopie naar CC
    for (const addr of ccAddresses) {
      gun.get('MAIL_INBOX').get(addr).get(mailId).put(baseData);
    }

    // Stuur blinde kopie naar BCC (zonder cc/bcc veld zichtbaar voor ontvanger)
    for (const addr of bccAddresses) {
      const bccData = { ...baseData };
      delete bccData.cc;
      gun.get('MAIL_INBOX').get(addr).get(mailId).put(bccData);
    }

    // Sla op in sent (inclusief bcc voor verzender)
    const sentData = {
      ...baseData,
      ...(bccAddresses.length > 0 ? { bcc: bccAddresses.join(', ') } : {})
    };
    user.get('mailSent').get(mailId).put(sentData);

    setIsSending(false);
    return true;
  }, [currentUser]);

  return { sendMail, isSending, error, clearError };
}
