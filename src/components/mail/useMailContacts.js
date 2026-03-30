import { useEffect, useMemo, useRef, useState } from 'react';
import { user } from '../../gun';
import { normalizeContactRecord, resolveContactUsername } from '../../utils/contactModel';

/**
 * Levert accepted contacten voor de mail-adrespicker, onafhankelijk van presence.
 *
 * @param {string} currentUser
 * @returns {string[]}
 */
export function useMailContacts(currentUser) {
  const [contactMap, setContactMap] = useState({});
  const nodeRef = useRef(null);

  useEffect(() => {
    if (!currentUser || !user.is) {
      setContactMap({});
      return;
    }

    const contactsNode = user.get('contacts').map();
    nodeRef.current = contactsNode;

    contactsNode.on((contactData, contactId) => {
      const username = resolveContactUsername(contactData, contactId);
      if (!username) return;

      setContactMap((prev) => {
        const next = { ...prev };

        if (!contactData) {
          delete next[username];
          return next;
        }

        const normalized = normalizeContactRecord({ ...contactData, username });
        if (normalized.contactStatus === 'accepted' && !normalized.blocked) {
          next[username] = username;
          return next;
        }

        delete next[username];
        return next;
      });
    });

    return () => {
      if (nodeRef.current) {
        nodeRef.current.off();
        nodeRef.current = null;
      }
      setContactMap({});
    };
  }, [currentUser]);

  return useMemo(
    () => Object.keys(contactMap).sort((a, b) => a.localeCompare(b)),
    [contactMap]
  );
}

export default useMailContacts;
