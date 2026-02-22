// Window.js
import React from 'react';
import Draggable from 'react-draggable';

const Window = ({ id, title, children, onClose, onMinimize, active, onFocus }) => {
  return (
    <Draggable handle=".window-header" onStart={onFocus}>
      <div 
        className="window" 
        style={{ width: 300, height: 400, zIndex: active ? 100 : 10 }}
      >
        <div className="window-header" onMouseDown={onFocus}>
          <span className="window-title">{title}</span>
          <div className="window-controls">
            <button onClick={() => onMinimize(id)}>_</button>
            <button className="close" onClick={() => onClose(id)}>X</button>
          </div>
        </div>
        <div className="window-content">
          {children}
        </div>
      </div>
    </Draggable>
  );
};

export default Window;