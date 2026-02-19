import React, { useState } from 'react';
import { useAvatar } from '../../contexts/AvatarContext';

function FriendRequestDialog({ request, onAccept, onDecline, onDismiss }) {
  const { getAvatar } = useAvatar();
  const [allowContact, setAllowContact] = useState(true);
  const [blockContact, setBlockContact] = useState(false);
  const [addToList, setAddToList] = useState(true);

  const handleAllow = (checked) => {
    setAllowContact(checked);
    if (checked) setBlockContact(false);
  };

  const handleBlock = (checked) => {
    setBlockContact(checked);
    if (checked) {
      setAllowContact(false);
      setAddToList(false);
    }
  };

  const handleOK = () => {
    if (blockContact) {
      onDecline(request);
    } else if (allowContact) {
      onAccept(request);
    }
  };

  return (
    <div className="friend-request-dialog">
      <div className="friend-request-header">
        <img
          src={getAvatar(request.from)}
          alt={request.from}
          className="friend-request-avatar"
        />
        <div className="friend-request-info">
          <strong>{request.from}</strong> wil u toevoegen als contact.
        </div>
      </div>

      <div className="friend-request-options">
        <label className="friend-request-checkbox">
          <input
            type="checkbox"
            checked={allowContact}
            onChange={(e) => handleAllow(e.target.checked)}
          />
          <span>Deze persoon mag zien wanneer ik online ben en mij berichten sturen</span>
        </label>
        <label className="friend-request-checkbox">
          <input
            type="checkbox"
            checked={blockContact}
            onChange={(e) => handleBlock(e.target.checked)}
          />
          <span>Deze persoon blokkeren</span>
        </label>
        <label className="friend-request-checkbox">
          <input
            type="checkbox"
            checked={addToList}
            onChange={(e) => setAddToList(e.target.checked)}
            disabled={blockContact}
          />
          <span>Deze persoon toevoegen aan mijn contactenlijst</span>
        </label>
      </div>

      <div className="friend-request-actions">
        <button className="dx-button primary" onClick={handleOK}>OK</button>
        <button className="dx-button" onClick={() => onDismiss(request)}>Annuleren</button>
      </div>
    </div>
  );
}

export default FriendRequestDialog;
