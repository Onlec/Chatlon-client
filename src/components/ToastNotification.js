import React, { useEffect, useState } from 'react';
import { log } from '../utils/debug';

function ToastNotification({ toast, onClose, onClick }) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Auto dismiss na 5 seconden
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300);
  };

  const handleClick = () => {
    if (onClick) {
      onClick(toast);
    }
    handleClose();
  };

  return (
    <div 
      className={`toast-notification ${isClosing ? 'toast-closing' : ''}`}
      onClick={handleClick}
    >
      <button 
        className="toast-close" 
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
      >
        ×
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