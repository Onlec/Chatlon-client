import React, { useState, useRef, useEffect } from 'react';
import { paneConfig } from './paneConfig';

function Pane({ title, children, isMaximized, onMaximize, onClose, onMinimize, onFocus, zIndex, type, savedSize, onSizeChange, initialPosition, onPositionChange }) {
  const paneRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const hasInitialized = useRef(false);
  
  // Get config for this pane type
  const config = paneConfig[type] || {};
  const defaultSize = config.defaultSize || (type === 'conversation' ? { width: 450, height: 400 } : { width: 450, height: 500 });
  const minSize = config.minSize || (type === 'conversation' ? { width: 450, height: 350 } : { width: 250, height: 200 });
  
  // Gebruik savedSize als die er is, anders defaultSize
  const [size, setSize] = useState(savedSize || defaultSize);
  
  // Gebruik initialPosition voor positie - ALLEEN bij mount
  const [position, setPosition] = useState(initialPosition || { left: 100, top: 50 });

  // Update size als savedSize verandert (bij heropenen)
  useEffect(() => {
    if (savedSize) {
      setSize(savedSize);
    }
  }, [savedSize]);

  // Update position ALLEEN als de pane nog niet geïnitialiseerd is
  useEffect(() => {
    if (!hasInitialized.current && initialPosition) {
      setPosition(initialPosition);
      hasInitialized.current = true;
    }
  }, [initialPosition]);

  const handleMouseDown = (e) => {
    // Focus pane wanneer erop geklikt wordt
    if (onFocus) onFocus();
    
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
      
      const newPosition = { left: newX, top: newY };
      setPosition(newPosition);
      
      pane.style.left = `${newX}px`;
      pane.style.top = `${newY}px`;
      pane.style.transform = 'none';
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Sla positie op bij einde van drag
      if (onPositionChange) {
        const rect = pane.getBoundingClientRect();
        onPositionChange({ left: rect.left, top: rect.top });
      }
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
      if (direction.includes('e')) newWidth = Math.max(minSize.width, startWidth + (mouseMoveEvent.pageX - startX));
      if (direction.includes('s')) newHeight = Math.max(minSize.height, startHeight + (mouseMoveEvent.pageY - startY));
      const newSize = { width: newWidth, height: newHeight };
      setSize(newSize);
      if (onSizeChange) onSizeChange(newSize);
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
        left: isMaximized ? 0 : position.left,
        top: isMaximized ? 0 : position.top,
        width: isMaximized ? '100vw' : size.width,
        height: isMaximized ? 'calc(100vh - 30px)' : size.height,
        zIndex: zIndex || (isDragging ? 1000 : 100),
        position: isMaximized ? 'fixed' : 'absolute',
        transform: 'none'
      }}
      onMouseDown={() => onFocus && onFocus()}
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