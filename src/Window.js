import React, { useState, useRef } from 'react';

function Window({ title, children, isMaximized, onMaximize, onClose, onMinimize }) {
  const windowRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  // We houden de grootte bij in een state
  const [size, setSize] = useState({ width: 450, height: 500 });

  // --- SLEEP LOGICA ---
  const handleMouseDown = (e) => {
    if (e.target.closest('.window-controls') || isMaximized) return;

    const win = windowRef.current;
    const rect = win.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const handleMouseMove = (moveEvent) => {
      setIsDragging(true);
      let newX = moveEvent.clientX - offsetX;
      let newY = moveEvent.clientY - offsetY;
      if (newY < 0) newY = 0;

      win.style.left = `${newX}px`;
      win.style.top = `${newY}px`;
      win.style.transform = 'none';
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // --- RESIZE LOGICA ---
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
    <div 
      ref={windowRef}
      className={`window-frame ${isMaximized ? 'maximized' : ''}`}
      style={{ 
        left: '100px',
        top: '50px',
        width: isMaximized ? '100vw' : size.width,
        height: isMaximized ? 'calc(100vh - 30px)' : size.height,
        zIndex: isDragging ? 1000 : 100,
        position: isMaximized ? 'fixed' : 'absolute'
      }}
    >
      <div className="window-inner-container" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="window-header" onMouseDown={handleMouseDown} style={{ userSelect: 'none' }}>
          <div className="window-title-section">
            <span className="window-icon" style={{marginRight: '5px'}}>👤</span>
            <span className="window-title">{title}</span>
          </div>
          <div className="window-controls">
            <button className="win-btn minimize" onClick={onMinimize}>_</button>
            <button className="win-btn maximize" onClick={onMaximize}>{isMaximized ? '❐' : '□'}</button>
            <button className="win-btn close" onClick={onClose}>X</button>
          </div>
        </div>
        <div className="window-content" style={{ flexGrow: 1, overflow: 'hidden' }}>
          {children}
        </div>
      </div>

      {/* De onzichtbare klikzones voor het resizen (Sectie 4 uit je CSS) */}
      {!isMaximized && (
        <>
          <div className="resizer-e" onMouseDown={startResizing('e')} />
          <div className="resizer-s" onMouseDown={startResizing('s')} />
          <div className="resizer-se" onMouseDown={startResizing('se')} />
        </>
      )}
    </div>
  );
}

export default Window;