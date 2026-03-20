import React, { useEffect, useRef, useState } from 'react';
import { paneConfig } from '../paneConfig';

function Pane({
  title,
  children,
  isMaximized,
  onMaximize,
  onClose,
  onMinimize,
  onFocus,
  zIndex,
  type,
  savedSize,
  onSizeChange,
  initialPosition,
  onPositionChange,
  isActive,
  chromeVariant = 'dx'
}) {
  const paneRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const hasInitialized = useRef(false);

  const config = paneConfig[type] || {};
  const defaultSize = config.defaultSize || (type === 'conversation'
    ? { width: 450, height: 400 }
    : { width: 450, height: 500 });
  const minSize = config.minSize || (type === 'conversation'
    ? { width: 450, height: 350 }
    : { width: 250, height: 200 });

  const [size, setSize] = useState(savedSize || defaultSize);
  const [position, setPosition] = useState(initialPosition || { left: 100, top: 50 });

  useEffect(() => {
    if (savedSize) {
      setSize(savedSize);
    }
  }, [savedSize]);

  useEffect(() => {
    if (!hasInitialized.current && initialPosition) {
      setPosition(initialPosition);
      hasInitialized.current = true;
    }
  }, [initialPosition]);

  useEffect(() => () => {
    hasInitialized.current = false;
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setPosition((current) => {
        const maxLeft = Math.max(0, window.innerWidth - 100);
        const maxTop = Math.max(0, window.innerHeight - 100);
        const nextLeft = Math.min(current.left, maxLeft);
        const nextTop = Math.min(current.top, maxTop);

        if (nextLeft !== current.left || nextTop !== current.top) {
          const clamped = { left: Math.max(0, nextLeft), top: Math.max(0, nextTop) };
          if (onPositionChange) onPositionChange(clamped);
          return clamped;
        }

        return current;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [onPositionChange]);

  const handleMouseDown = (event) => {
    if (onFocus) onFocus();
    if (event.target.closest('.pane-controls')) return;

    if (event.detail === 2) {
      onMaximize();
      return;
    }

    if (isMaximized) return;

    const pane = paneRef.current;
    const rect = pane.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    const handleMouseMove = (moveEvent) => {
      setIsDragging(true);
      let nextX = moveEvent.clientX - offsetX;
      let nextY = moveEvent.clientY - offsetY;
      if (nextY < 0) nextY = 0;

      const nextPosition = { left: nextX, top: nextY };
      setPosition(nextPosition);

      pane.style.left = `${nextX}px`;
      pane.style.top = `${nextY}px`;
      pane.style.transform = 'none';
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (onPositionChange) {
        const nextRect = pane.getBoundingClientRect();
        onPositionChange({ left: nextRect.left, top: nextRect.top });
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
      let nextWidth = startWidth;
      let nextHeight = startHeight;
      if (direction.includes('e')) nextWidth = Math.max(minSize.width, startWidth + (mouseMoveEvent.pageX - startX));
      if (direction.includes('s')) nextHeight = Math.max(minSize.height, startHeight + (mouseMoveEvent.pageY - startY));
      const nextSize = { width: nextWidth, height: nextHeight };
      setSize(nextSize);
      if (onSizeChange) onSizeChange(nextSize);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const isLigerChrome = chromeVariant === 'liger';
  const ligerStateClass = isLigerChrome
    ? (isActive === false ? 'pane-frame--liger-inactive' : 'pane-frame--liger-active')
    : '';
  const ligerHeaderStateClass = isLigerChrome
    ? (isActive === false ? 'pane-header--liger-inactive' : 'pane-header--liger-active')
    : '';

  return (
    <div
      ref={paneRef}
      className={`pane-frame type-${type} ${isMaximized ? 'pane-frame--maximized' : ''} ${isDragging ? 'pane-frame--dragging' : ''} ${isLigerChrome ? 'pane-frame--liger' : ''} ${ligerStateClass}`}
      style={{
        left: isMaximized ? 0 : position.left,
        top: isMaximized ? 0 : position.top,
        width: isMaximized ? '100vw' : size.width,
        height: isMaximized ? undefined : size.height,
        zIndex,
        position: isMaximized ? 'fixed' : 'absolute',
        transform: 'none'
      }}
      onMouseDown={() => onFocus && onFocus()}
    >
      <div className="pane-inner-container">
        <div
          className={`pane-header ${isActive === false ? 'pane-header--inactive' : ''} ${isLigerChrome ? 'pane-header--liger' : ''} ${ligerHeaderStateClass}`}
          onMouseDown={handleMouseDown}
        >
          {isLigerChrome ? (
            <>
              <div className="pane-controls pane-controls--liger">
                <button type="button" className="pane-btn pane-btn--liger pane-btn--close" onClick={onClose} aria-label="Sluiten" />
                <button type="button" className="pane-btn pane-btn--liger pane-btn--minimize" onClick={onMinimize} aria-label="Minimaliseren" />
                <button
                  type="button"
                  className={`pane-btn pane-btn--liger ${isMaximized ? 'pane-btn--maximized' : 'pane-btn--maximize'}`}
                  onClick={onMaximize}
                  aria-label={isMaximized ? 'Herstellen' : 'Maximaliseren'}
                />
              </div>
              <div className="pane-title-section pane-title-section--liger">
                <span className="pane-title">{title}</span>
              </div>
            </>
          ) : (
            <>
              <div className="pane-title-section">
                <span className="pane-icon">💤</span>
                <span className="pane-title">{title}</span>
              </div>
              <div className="pane-controls">
                <button type="button" className="pane-btn pane-btn--minimize" onClick={onMinimize}>_</button>
                <button
                  type="button"
                  className={`pane-btn ${isMaximized ? 'pane-btn--maximized' : 'pane-btn--maximize'}`}
                  onClick={onMaximize}
                >
                  {isMaximized ? '❐' : '▢'}
                </button>
                <button type="button" className="pane-btn pane-btn--close" onClick={onClose}>X</button>
              </div>
            </>
          )}
        </div>
        <div className={`pane-body ${isLigerChrome ? 'pane-body--liger' : ''}`}>
          <div className="pane-content">
            {children}
          </div>
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
