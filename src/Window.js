import React, { useRef } from 'react';
import Draggable from 'react-draggable';

const Window = ({ title, children, onClose, onMinimize, onMaximize, isMaximized }) => {
  const nodeRef = useRef(null);

  // Deze stijl overrulet alles wanneer maximized op true staat
  const maxStyle = isMaximized ? {
    width: '100vw',
    height: 'calc(100vh - 30px)',
    transform: 'translate(0, 0)',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 9999,
    borderRadius: 0,
    border: 'none'
  } : {};

  return (
    <Draggable 
      nodeRef={nodeRef} 
      handle=".window-header" 
      bounds="parent"
      disabled={isMaximized}
      /* We resetten de positie van draggable als we maximaliseren */
      position={isMaximized ? {x: 0, y: 0} : null}
    >
      <div 
        className={`window-frame ${isMaximized ? 'maximized' : ''}`} 
        ref={nodeRef}
        style={maxStyle} // Hier forceren we de stijl
      >
        <div className="window-header">
          <div className="window-title-section">
            <span className="window-icon">👤</span>
            <span className="window-title">{title}</span>
          </div>
          
          <div className="window-controls">
            <button className="win-btn minimize" onClick={onMinimize}>_</button>
            <button className="win-btn maximize" onClick={onMaximize}>
              {isMaximized ? '❐' : '□'} 
            </button>
            <button className="win-btn close" onClick={onClose}>X</button>
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