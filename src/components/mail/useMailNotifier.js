// src/components/mail/useMailNotifier.js

import { useEffect, useRef } from 'react';
import { deserializeRich, richToPlainText } from '../../utils/richText';

/**
 * Hook die toast notificaties toont voor nieuwe mail.
 *
 * @param {Object} options
 * @param {Array}    options.newMailSinceLastSeen - Nieuwe ongelezen mails
 * @param {Function} options.showToast            - Toast tonen
 * @param {Function} options.getAvatar            - Avatar ophalen op basis van email
 * @param {Function} options.onOpenMail           - Callback om mail pane te openen
 */
export function useMailNotifier({ newMailSinceLastSeen, showToast, getAvatar, onOpenMail }) {
  const shownRef = useRef(new Set());

  useEffect(() => {
    if (!newMailSinceLastSeen || !showToast) return;

    newMailSinceLastSeen.forEach(mail => {
      if (shownRef.current.has(mail.id)) return;
      shownRef.current.add(mail.id);

      const preview = richToPlainText(deserializeRich(mail.body)).slice(0, 60) || mail.subject || '';

      showToast({
        type: 'mail',
        from: mail.from,
        message: preview,
        avatar: getAvatar ? getAvatar(mail.from) : '',
        mailId: mail.id,
        onClick: onOpenMail
      });
    });
  }, [newMailSinceLastSeen, showToast, getAvatar, onOpenMail]);
}
