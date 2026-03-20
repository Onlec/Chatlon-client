import React, { useCallback, useContext, useEffect, useState } from 'react';
import SettingsContext from '../contexts/SettingsContext';

function ToastNotification({ toast, onClose, onClick, appearanceVariant: appearanceVariantProp }) {
  const [isClosing, setIsClosing] = useState(false);
  const settingsContext = useContext(SettingsContext);
  const appearanceVariant = appearanceVariantProp || settingsContext?.appearanceVariant || 'dx';
  const isLigerAppearance = appearanceVariant === 'liger';

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300);
  }, [onClose, toast.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [handleClose]);

  const handleClick = () => {
    if (onClick) {
      onClick(toast);
    }
    handleClose();
  };

  return (
    <div
      className={`toast-notification ${isClosing ? 'toast-notification--closing' : ''} ${isLigerAppearance ? 'toast-notification--liger' : ''}`}
      data-appearance-variant={appearanceVariant}
      onClick={handleClick}
    >
      <button
        type="button"
        className={`toast-close ${isLigerAppearance ? 'toast-close--liger' : ''}`}
        aria-label="Sluiten"
        onClick={(event) => {
          event.stopPropagation();
          handleClose();
        }}
      >
        &times;
      </button>

      <div className="toast-content">
        <img
          src={toast.avatar}
          alt={toast.from}
          className="toast-avatar"
        />
        <div className="toast-text">
          <div className="toast-from">{toast.from}</div>
          <div className="toast-message">{toast.message}</div>
          <div className="toast-hint">
            {toast.type === 'presence'
              ? 'Klik om een bericht te sturen'
              : toast.type === 'nudge'
                ? 'Klik om te antwoorden'
                : 'Klik om te antwoorden'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ToastNotification;
