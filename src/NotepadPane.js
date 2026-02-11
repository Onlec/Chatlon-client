import React, { useState, useEffect } from 'react';
import { gun, user } from './gun';
import { log } from './utils/debug';

function NotepadPane() {
  const [text, setText] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (user.is) {
      // Load saved notepad content
      user.get('notepad').on((data) => {
        if (data && !isLoaded) {
          setText(data.content || '');
          setIsLoaded(true);
        }
      });
    }
  }, [isLoaded]);

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    
    // Auto-save to Gun
    if (user.is) {
      user.get('notepad').put({ content: newText });
    }
  };

  const isUserLoggedIn = user.is;

  return (
    <div className="notepad-container">
      <div className="notepad-menubar">
        <span className="notepad-menu-item">Bestand</span>
        <span className="notepad-menu-item">Bewerken</span>
        <span className="notepad-menu-item">Opmaak</span>
        <span className="notepad-menu-item">Beeld</span>
        <span className="notepad-menu-item">Help</span>
      </div>
      <textarea 
        className="notepad-textarea"
        value={text}
        onChange={handleTextChange}
        placeholder={isUserLoggedIn ? "" : "Log in om je notities op te slaan..."}
        disabled={!isUserLoggedIn}
      />
    </div>
  );
}

export default NotepadPane;