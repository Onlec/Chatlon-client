// src/components/mail/MailMessageList.js

import React, { useState } from 'react';

function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function MailMessageList({ messages, selectedId, onSelect, folder }) {
  const [sort, setSort] = useState({ field: 'timestamp', dir: 'desc' });

  const toggleSort = (field) => {
    setSort(prev => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  const sortIcon = (field) => {
    if (sort.field !== field) return '';
    return sort.dir === 'asc' ? ' ▲' : ' ▼';
  };

  const showTo = folder === 'sent' || folder === 'drafts';

  const sorted = [...messages].sort((a, b) => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    if (sort.field === 'timestamp') {
      return ((a.timestamp || 0) - (b.timestamp || 0)) * dir;
    }
    if (sort.field === 'from') {
      const af = (showTo ? a.to : a.from) || '';
      const bf = (showTo ? b.to : b.from) || '';
      return af.localeCompare(bf) * dir;
    }
    const af = (a[sort.field] || '');
    const bf = (b[sort.field] || '');
    return String(af).localeCompare(String(bf)) * dir;
  });

  if (sorted.length === 0) {
    return (
      <div className="mail-message-list mail-message-list--empty">
        <span>Geen berichten</span>
      </div>
    );
  }

  return (
    <div className="mail-message-list">
      <div className="mail-list-header">
        <span
          className="mail-list-header__col mail-list-header__col--from"
          onClick={() => toggleSort('from')}
        >
          {showTo ? 'Aan' : 'Van'}{sortIcon('from')}
        </span>
        <span
          className="mail-list-header__col mail-list-header__col--subject"
          onClick={() => toggleSort('subject')}
        >
          Onderwerp{sortIcon('subject')}
        </span>
        <span
          className="mail-list-header__col mail-list-header__col--date"
          onClick={() => toggleSort('timestamp')}
        >
          Datum{sortIcon('timestamp')}
        </span>
      </div>
      {sorted.map(mail => (
        <div
          key={mail.id}
          className={[
            'mail-message-item',
            selectedId === mail.id ? 'mail-message-item--selected' : '',
            !mail.read && folder === 'inbox' ? 'mail-message-item--unread' : '',
          ].filter(Boolean).join(' ')}
          onClick={() => onSelect(mail)}
        >
          <div className="mail-message-item__from">
            {showTo ? mail.to : mail.from}
          </div>
          <div className="mail-message-item__subject">
            {mail.subject || '(geen onderwerp)'}
            {mail.attachments && (
              <span className="mail-message-item__clip" title="Bijlage"> 📎</span>
            )}
          </div>
          <div className="mail-message-item__date">{formatDate(mail.timestamp)}</div>
        </div>
      ))}
    </div>
  );
}

export default MailMessageList;
