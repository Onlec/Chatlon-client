import React, { useState, useRef } from 'react';
import Draggable from 'react-draggable';

const Window = ({ title, children, onClose, onMinimize, onMaximize, isMaximized }) => {
  const nodeRef = useRef(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [size, setSize] = useState({ width: 450, height: 500 });

  const handleDrag = (e, data) => {
    setPos({ x: data.x, y: data.y });
  };

  const startResizing = (direction) => (mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    mouseDownEvent.stopPropagation();

    const startWidth = size.width;
    const startHeight = size.height;
    const startX = mouseDownEvent.pageX;
    const startY = mouseDownEvent.pageY;

    const onMouseMove = (mouseMoveEvent) => {
      let newWidth = startWidth;
      let newHeight = startHeight;

      if (direction.includes('e')) {
        newWidth = Math.max(300, startWidth + (mouseMoveEvent.pageX - startX));
      }
      if (direction.includes('s')) {
        newHeight = Math.max(300, startHeight + (mouseMoveEvent.pageY - startY));
      }

      setSize({ width: newWidth, height: newHeight });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
  <Draggable 
    nodeRef={nodeRef} 
    handle=".window-header" 
    bounds="parent"
    disabled={isMaximized}
    position={isMaximized ? { x: 0, y: 0 } : pos}
    onStop={handleDrag}
  >
    <div 
      className={`window-frame ${isMaximized ? 'maximized' : ''}`} 
      ref={nodeRef}
      style={{
        width: isMaximized ? '100vw' : size.width,
        height: isMaximized ? 'calc(100vh - 30px)' : size.height,
        position: isMaximized ? 'fixed' : 'absolute',
        transform: isMaximized ? 'none' : `translate(${pos.x}px, ${pos.y}px)`,
        zIndex: isMaximized ? 9999 : 10,
        boxSizing: 'border-box'
      }}
    >
      {/* DE INHOUD */}
      <div className="window-inner-container" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="window-header">
          <div className="window-title-section">
            <span className="window-icon">👤</span>
            <span className="window-title">{title}</span>
          </div>
          <div className="window-controls">
            <button className="win-btn minimize" onClick={onMinimize}>_</button>
            <button className="win-btn maximize" onClick={onMaximize}>{isMaximized ? '❐' : '□'}</button>
            <button className="win-btn close" onClick={onClose}>X</button>
          </div>
        </div>
        <div className="window-content" style={{ flexGrow: 1, overflow: 'auto' }}>
          {children}
        </div>
      </div>

      {/* DE RESIZERS (Buiten de inner container voor betere bereikbaarheid) */}
      {!isMaximized && (
        <>
          <div className="resizer-e" onMouseDown={startResizing('e')} />
          <div className="resizer-s" onMouseDown={startResizing('s')} />
          <div className="resizer-se" onMouseDown={startResizing('se')} />
        </>
      )}
    </div>
  </Draggable>
  );
};

export default Window;