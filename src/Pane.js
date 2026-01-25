import React, { useState, useRef } from 'react';

function Pane({ title, children, isMaximized, onMaximize, onClose, onMinimize, type }) {
  const paneRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [size, setSize] = useState({ width: 450, height: 500 });

  const handleMouseDown = (e) => {
    if (e.target.closest('.pane-controls')) return;
    
    // Check voor dubbelklik
    if (e.detail === 2) {
      onMaximize();
      return;
    }
    
    // Voorkom dragging als maximized
    if (isMaximized) return;
    
    const pane = paneRef.current;
    const rect = pane.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const handleMouseMove = (moveEvent) => {
      setIsDragging(true);
      let newX = moveEvent.clientX - offsetX;
      let newY = moveEvent.clientY - offsetY;
      if (newY < 0) newY = 0;
      pane.style.left = `${newX}px`;
      pane.style.top = `${newY}px`;
      pane.style.transform = 'none';
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
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
      if (direction.includes('e')) newWidth = Math.max(300, startWidth + (mouseMoveEvent.pageX - startX));
      if (direction.includes('s')) newHeight = Math.max(300, startHeight + (mouseMoveEvent.pageY - startY));
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
    <div 
      ref={paneRef}
      className={`pane-frame type-${type} ${isMaximized ? 'maximized' : ''}`}
      style={{ 
        left: '100px', top: '50px',
        width: isMaximized ? '100vw' : size.width,
        height: isMaximized ? 'calc(100vh - 30px)' : size.height,
        zIndex: isDragging ? 1000 : 100,
        position: isMaximized ? 'fixed' : 'absolute'
      }}
    >
      <div className="pane-inner-container">
        <div className="pane-header" onMouseDown={handleMouseDown}>
          <div className="pane-title-section">
            <span className="pane-icon">💤</span>
            <span className="pane-title">{title}</span>
          </div>
          <div className="pane-controls">
            <button className="win-btn minimize" onClick={onMinimize}>_</button>
            <button className="win-btn maximize" onClick={onMaximize}>{isMaximized ? '❐' : '▢'}</button>
            <button className="win-btn close" onClick={onClose}>X</button>
          </div>
        </div>
        <div className="pane-content">
          {children}
        </div>
      </div>
      {!isMaximized && type !== 'login' && (
        <>
          <div className="resizer-e" onMouseDown={startResizing('e')} />
          <div className="resizer-s" onMouseDown={startResizing('s')} />
          <div className="resizer-se" onMouseDown={startResizing('se')} />
        </>
      )}
    </div>
  );
}

export default Pane;