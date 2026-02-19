import React, { createContext, useContext, useState, useCallback } from 'react';
import ModalPane from '../components/modals/ModalPane';

const DialogContext = createContext(null);

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
}

let dialogIdCounter = 0;

export function DialogProvider({ children }) {
  const [dialogs, setDialogs] = useState([]);

  const openDialog = useCallback((type, message, title) => {
    return new Promise((resolve) => {
      const id = ++dialogIdCounter;
      setDialogs(prev => [...prev, { id, type, message, title, resolve }]);
    });
  }, []);

  const closeDialog = useCallback((id, result) => {
    setDialogs(prev => {
      const dialog = prev.find(d => d.id === id);
      if (dialog) dialog.resolve(result);
      return prev.filter(d => d.id !== id);
    });
  }, []);

  const confirm = useCallback((message, title = 'Bevestiging') => {
    return openDialog('confirm', message, title);
  }, [openDialog]);

  const alert = useCallback((message, title = 'Chatlon') => {
    return openDialog('alert', message, title);
  }, [openDialog]);

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {dialogs.map(dialog => (
        <ModalPane
          key={dialog.id}
          title={dialog.title}
          icon={dialog.type === 'confirm' ? '❓' : 'ℹ️'}
          onClose={() => closeDialog(dialog.id, false)}
          width="380px"
        >
          <div className="xp-dialog-message">{dialog.message}</div>
          <div className="xp-dialog-actions">
            {dialog.type === 'confirm' && (
              <button className="dx-button primary" onClick={() => closeDialog(dialog.id, true)}>
                OK
              </button>
            )}
            <button
              className="dx-button"
              onClick={() => closeDialog(dialog.id, false)}
            >
              {dialog.type === 'confirm' ? 'Annuleren' : 'OK'}
            </button>
          </div>
        </ModalPane>
      ))}
    </DialogContext.Provider>
  );
}

export default DialogContext;
