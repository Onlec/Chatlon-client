import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { gun, user } from '../../gun';

const LAST_SEEN_KEY = (currentUser) => `chatlon_mail_last_seen_${currentUser}`;
const LAST_SEEN_SYNC_EVENT = 'chatlon:mail-last-seen';

function readLastSeen(currentUser) {
  if (!currentUser) return 0;
  const value = parseInt(localStorage.getItem(LAST_SEEN_KEY(currentUser)) || '0', 10);
  return Number.isFinite(value) ? value : 0;
}

function isValidMailRecord(data) {
  return Boolean(data && data.timestamp && (data.from || data.to));
}

function buildMailRecord(data, mailId, mailbox) {
  return { ...data, id: mailId, mailbox };
}

function upsertMailRecord(prev, data, mailId, mailbox) {
  if (!data) {
    return prev.filter((mail) => mail.id !== mailId);
  }
  if (!isValidMailRecord(data)) return prev;

  const nextRecord = buildMailRecord(data, mailId, mailbox);
  const exists = prev.some((mail) => mail.id === mailId);
  if (!exists) return [...prev, nextRecord];
  return prev.map((mail) => (mail.id === mailId ? nextRecord : mail));
}

function updateMailProperty(prev, mailId, changes) {
  return prev.map((mail) => (mail.id === mailId ? { ...mail, ...changes } : mail));
}

function resolveMailTarget(target) {
  if (!target) return null;
  if (typeof target === 'string') {
    return { id: target, mailbox: 'inbox' };
  }
  if (!target.id) return null;

  return {
    id: target.id,
    mailbox: target.mailbox || 'inbox',
  };
}

/**
 * Hook voor mail inbox + sent + trash folders.
 * Luistert real-time via Gun.js.
 *
 * @param {string} currentUser - Email/alias van ingelogde gebruiker
 * @returns {{ inbox, sent, trash, unreadCount, newMailSinceLastSeen, markAllSeen, markRead, markDeleted, permanentDelete, restoreFromTrash }}
 */
export function useMailInbox(currentUser) {
  const [inboxRaw, setInboxRaw] = useState([]);
  const [sentRaw, setSentRaw] = useState([]);
  const [lastSeen, setLastSeen] = useState(() => readLastSeen(currentUser));
  const nodeRef = useRef(null);
  const sentNodeRef = useRef(null);

  const markAllSeen = useCallback((timestamp = Date.now()) => {
    if (!currentUser) return;
    localStorage.setItem(LAST_SEEN_KEY(currentUser), timestamp.toString());
    setLastSeen(timestamp);
    window.dispatchEvent(new CustomEvent(LAST_SEEN_SYNC_EVENT, {
      detail: { user: currentUser, timestamp }
    }));
  }, [currentUser]);

  useEffect(() => {
    setLastSeen(readLastSeen(currentUser));
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return undefined;

    const handleSeenSync = (event) => {
      if (event.detail?.user !== currentUser) return;
      setLastSeen(Number(event.detail?.timestamp) || 0);
    };

    const handleStorage = (event) => {
      if (event.key !== LAST_SEEN_KEY(currentUser)) return;
      setLastSeen(Number(event.newValue) || 0);
    };

    window.addEventListener(LAST_SEEN_SYNC_EVENT, handleSeenSync);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(LAST_SEEN_SYNC_EVENT, handleSeenSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setInboxRaw([]);
      setSentRaw([]);
      return;
    }

    const inboxNode = gun.get('MAIL_INBOX').get(currentUser).map();
    nodeRef.current = inboxNode;
    inboxNode.on((data, mailId) => {
      setInboxRaw((prev) => upsertMailRecord(prev, data, mailId, 'inbox'));
    });

    if (user.is) {
      const sentNode = user.get('mailSent').map();
      sentNodeRef.current = sentNode;
      sentNode.on((data, mailId) => {
        setSentRaw((prev) => upsertMailRecord(prev, data, mailId, 'sent'));
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
      setSentRaw([]);
    };
  }, [currentUser]);

  const inbox = useMemo(
    () => inboxRaw.filter((mail) => mail.deleted !== true),
    [inboxRaw]
  );

  const sent = useMemo(
    () => sentRaw.filter((mail) => mail.deleted !== true),
    [sentRaw]
  );

  const trash = useMemo(
    () => [...inboxRaw.filter((mail) => mail.deleted === true), ...sentRaw.filter((mail) => mail.deleted === true)],
    [inboxRaw, sentRaw]
  );

  const unreadCount = useMemo(
    () => inbox.filter((mail) => !mail.read).length,
    [inbox]
  );

  const newMailSinceLastSeen = useMemo(
    () => inbox.filter((mail) => mail.timestamp > lastSeen && !mail.read),
    [inbox, lastSeen]
  );

  const markRead = useCallback((target) => {
    if (!currentUser) return;
    const mail = resolveMailTarget(target);
    if (!mail || mail.mailbox !== 'inbox') return;

    gun.get('MAIL_INBOX').get(currentUser).get(mail.id).get('read').put(true);
    setInboxRaw((prev) => updateMailProperty(prev, mail.id, { read: true }));
  }, [currentUser]);

  const markDeleted = useCallback((target) => {
    const mail = resolveMailTarget(target);
    if (!mail) return;

    if (mail.mailbox === 'sent') {
      user.get('mailSent').get(mail.id).get('deleted').put(true);
      setSentRaw((prev) => updateMailProperty(prev, mail.id, { deleted: true }));
      return;
    }

    if (!currentUser) return;
    gun.get('MAIL_INBOX').get(currentUser).get(mail.id).get('deleted').put(true);
    setInboxRaw((prev) => updateMailProperty(prev, mail.id, { deleted: true }));
  }, [currentUser]);

  const permanentDelete = useCallback((target) => {
    const mail = resolveMailTarget(target);
    if (!mail) return;

    if (mail.mailbox === 'sent') {
      user.get('mailSent').get(mail.id).put(null);
      setSentRaw((prev) => prev.filter((entry) => entry.id !== mail.id));
      return;
    }

    if (!currentUser) return;
    gun.get('MAIL_INBOX').get(currentUser).get(mail.id).put(null);
    setInboxRaw((prev) => prev.filter((entry) => entry.id !== mail.id));
  }, [currentUser]);

  const restoreFromTrash = useCallback((target) => {
    const mail = resolveMailTarget(target);
    if (!mail) return;

    if (mail.mailbox === 'sent') {
      user.get('mailSent').get(mail.id).get('deleted').put(false);
      setSentRaw((prev) => updateMailProperty(prev, mail.id, { deleted: false }));
      return;
    }

    if (!currentUser) return;
    gun.get('MAIL_INBOX').get(currentUser).get(mail.id).get('deleted').put(false);
    setInboxRaw((prev) => updateMailProperty(prev, mail.id, { deleted: false }));
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

export default useMailInbox;
