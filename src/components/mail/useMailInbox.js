// src/components/mail/useMailInbox.js

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { gun, user } from '../../gun';

const LAST_SEEN_KEY = (u) => `chatlon_mail_last_seen_${u}`;

/**
 * Hook voor mail inbox + sent + trash folders.
 * Luistert real-time via Gun.js.
 *
 * @param {string} currentUser - Email/alias van ingelogde gebruiker
 * @returns {{ inbox, sent, trash, unreadCount, newMailSinceLastSeen, markAllSeen, markRead, markDeleted, permanentDelete, restoreFromTrash }}
 */
export function useMailInbox(currentUser) {
  const [inboxRaw, setInboxRaw] = useState([]);
  const [sent, setSent] = useState([]);
  const nodeRef = useRef(null);
  const sentNodeRef = useRef(null);

  const lastSeen = useMemo(
    () => parseInt(localStorage.getItem(LAST_SEEN_KEY(currentUser)) || '0', 10),
    [currentUser]
  );

  const markAllSeen = useCallback(() => {
    localStorage.setItem(LAST_SEEN_KEY(currentUser), Date.now().toString());
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setInboxRaw([]);
      setSent([]);
      return;
    }

    // Inbox listener
    const inboxNode = gun.get('MAIL_INBOX').get(currentUser).map();
    nodeRef.current = inboxNode;
    inboxNode.on((data, mailId) => {
      if (!data || !data.from || !data.timestamp) return;
      setInboxRaw(prev => {
        const exists = prev.find(m => m.id === mailId);
        if (exists) {
          return prev.map(m => m.id === mailId ? { ...data, id: mailId } : m);
        }
        return [...prev, { ...data, id: mailId }];
      });
    });

    // Sent listener (privé per gebruiker)
    if (user.is) {
      const sentNode = user.get('mailSent').map();
      sentNodeRef.current = sentNode;
      sentNode.on((data, mailId) => {
        if (!data || !data.to || !data.timestamp) return;
        setSent(prev => {
          const exists = prev.find(m => m.id === mailId);
          if (exists) {
            return prev.map(m => m.id === mailId ? { ...data, id: mailId } : m);
          }
          return [...prev, { ...data, id: mailId }];
        });
      });
    }

    return () => {
      if (nodeRef.current) {
        nodeRef.current.off();
        nodeRef.current = null;
      }
      if (sentNodeRef.current) {
        sentNodeRef.current.off();
        sentNodeRef.current = null;
      }
      setInboxRaw([]);
      setSent([]);
    };
  }, [currentUser]);

  // Inbox = niet-verwijderde berichten
  const inbox = useMemo(
    () => inboxRaw.filter(m => m.deleted !== true),
    [inboxRaw]
  );

  // Prullenbak = verwijderde berichten
  const trash = useMemo(
    () => inboxRaw.filter(m => m.deleted === true),
    [inboxRaw]
  );

  const unreadCount = useMemo(
    () => inbox.filter(m => !m.read).length,
    [inbox]
  );

  const newMailSinceLastSeen = useMemo(
    () => inbox.filter(m => m.timestamp > lastSeen && !m.read),
    [inbox, lastSeen]
  );

  const markRead = useCallback((mailId) => {
    if (!currentUser) return;
    gun.get('MAIL_INBOX').get(currentUser).get(mailId).get('read').put(true);
    setInboxRaw(prev => prev.map(m => m.id === mailId ? { ...m, read: true } : m));
  }, [currentUser]);

  // Soft delete: verplaats naar prullenbak
  const markDeleted = useCallback((mailId) => {
    if (!currentUser) return;
    gun.get('MAIL_INBOX').get(currentUser).get(mailId).get('deleted').put(true);
    setInboxRaw(prev => prev.map(m => m.id === mailId ? { ...m, deleted: true } : m));
  }, [currentUser]);

  // Definitief verwijderen
  const permanentDelete = useCallback((mailId) => {
    if (!currentUser) return;
    gun.get('MAIL_INBOX').get(currentUser).get(mailId).put(null);
    setInboxRaw(prev => prev.filter(m => m.id !== mailId));
  }, [currentUser]);

  // Herstel uit prullenbak
  const restoreFromTrash = useCallback((mailId) => {
    if (!currentUser) return;
    gun.get('MAIL_INBOX').get(currentUser).get(mailId).get('deleted').put(false);
    setInboxRaw(prev => prev.map(m => m.id === mailId ? { ...m, deleted: false } : m));
  }, [currentUser]);

  return {
    inbox,
    sent,
    trash,
    unreadCount,
    newMailSinceLastSeen,
    markAllSeen,
    markRead,
    markDeleted,
    permanentDelete,
    restoreFromTrash,
  };
}
