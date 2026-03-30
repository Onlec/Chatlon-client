// src/components/mail/useMailDrafts.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { user } from '../../gun';

/**
 * Hook voor mail-concepten (privé per gebruiker via Gun user-node).
 *
 * @returns {{ drafts, saveDraft, deleteDraft }}
 */
export function useMailDrafts() {
  const [drafts, setDrafts] = useState([]);
  const nodeRef = useRef(null);

  useEffect(() => {
    if (!user.is) return;

    const draftNode = user.get('mailDrafts').map();
    nodeRef.current = draftNode;

    draftNode.on((data, draftId) => {
      if (!data) {
        // Gun stuurt null wanneer een item definitief verwijderd is
        setDrafts(prev => prev.filter(d => d.id !== draftId));
        return;
      }
      if (!data.timestamp) return;
      setDrafts(prev => {
        const exists = prev.find(d => d.id === draftId);
        if (exists) {
          return prev.map(d => d.id === draftId ? { ...data, id: draftId } : d);
        }
        return [...prev, { ...data, id: draftId }];
      });
    });

    return () => {
      if (nodeRef.current) {
        nodeRef.current.off();
        nodeRef.current = null;
      }
      setDrafts([]);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Sla concept op of update bestaand concept.
   * @returns {string} draftId
   */
  const saveDraft = useCallback(({ draftId, to, cc, bcc, subject, body, attachments }) => {
    if (!user.is) return null;
    const id = draftId || `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    user.get('mailDrafts').get(id).put({
      id,
      to: to || '',
      cc: cc || '',
      bcc: bcc || '',
      subject: subject || '',
      body: body || '',
      attachments: attachments?.length ? JSON.stringify(attachments) : null,
      timestamp: Date.now(),
    });
    return id;
  }, []);

  /**
   * Verwijder concept definitief.
   */
  const deleteDraft = useCallback((draftId) => {
    if (!user.is || !draftId) return;
    user.get('mailDrafts').get(draftId).put(null);
    setDrafts(prev => prev.filter(d => d.id !== draftId));
  }, []);

  return { drafts, saveDraft, deleteDraft };
}
