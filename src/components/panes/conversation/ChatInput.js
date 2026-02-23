import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { getEmoticonCategories } from '../../../utils/emoticons';

function ChatInput({ value, onChange, onSend, onNudge, canNudge, showPicker, setShowPicker, pickerRef, insertEmoticon, isSessionReady }) {
  const emojiBtn = useRef(null);
  const [pickerPos, setPickerPos] = useState({ bottom: 0, left: 0 });

  const handleTogglePicker = () => {
    if (!showPicker && emojiBtn.current) {
      const rect = emojiBtn.current.getBoundingClientRect();
      setPickerPos({ bottom: window.innerHeight - rect.top + 4, left: rect.left });
    }
    setShowPicker(!showPicker);
  };

  return (
    <div className="chat-input-container">
      <div className="chat-input-toolbar">
        <button ref={emojiBtn} className="chat-input-tool" onClick={handleTogglePicker}>{'\u{1F60A}'}</button>
        {showPicker && ReactDOM.createPortal(
          <div
            className="emoticon-picker"
            ref={pickerRef}
            style={{ position: 'fixed', bottom: pickerPos.bottom, left: pickerPos.left }}
          >
            {Object.entries(getEmoticonCategories()).map(([cat, emos]) => (
              <div key={cat} className="emoticon-category">
                <div className="emoticon-grid">
                  {emos.map((e) => <button key={e.text} onClick={() => { insertEmoticon(e.text); setShowPicker(false); }}>{e.emoji}</button>)}
                </div>
              </div>
            ))}
          </div>,
          document.body
        )}
        <button className="chat-input-tool" onClick={onNudge} disabled={!canNudge}>{'\u26A1'}</button>
      </div>
      <div className="chat-input-body">
        <textarea
          className="chat-input-text"
          value={value}
          disabled={!isSessionReady}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        />
        <button className="chat-send-btn" onClick={onSend} disabled={!isSessionReady}>Verzenden</button>
      </div>
    </div>
  );
}

export default ChatInput;
