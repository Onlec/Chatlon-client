import React, { useEffect, useRef, useState } from 'react';
import { paneConfig } from '../paneConfig';

function getWorkspaceRect() {
  if (typeof document === 'undefined') return null;
  const workspace = document.querySelector('.pane-layer')
    || document.querySelector('.monitor-screen-content')
    || document.querySelector('.monitor-screen')
    || document.querySelector('.bezel-screen');
  return workspace ? workspace.getBoundingClientRect() : null;
}

function getRelativeWorkspaceRect(containerRect) {
  const workspaceRect = getWorkspaceRect();
  if (!workspaceRect) return null;
  return {
    left: workspaceRect.left - containerRect.left,
    top: workspaceRect.top - containerRect.top,
    right: workspaceRect.right - containerRect.left,
    bottom: workspaceRect.bottom - containerRect.top,
    width: workspaceRect.width,
    height: workspaceRect.height,
  };
}

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
        const pane = paneRef.current;
        const containerRect = pane?.offsetParent
          ? pane.offsetParent.getBoundingClientRect()
          : { left: 0, top: 0 };
        const workspaceRect = getRelativeWorkspaceRect(containerRect);
        const minLeft = workspaceRect ? workspaceRect.left : 0;
        const minTop = workspaceRect ? workspaceRect.top : 0;
        const maxLeft = workspaceRect ? Math.max(minLeft, workspaceRect.right - 100) : Math.max(0, window.innerWidth - 100);
        const maxTop = workspaceRect ? Math.max(minTop, workspaceRect.bottom - 100) : Math.max(0, window.innerHeight - 100);
        const nextLeft = Math.max(minLeft, Math.min(current.left, maxLeft));
        const nextTop = Math.max(minTop, Math.min(current.top, maxTop));

        if (nextLeft !== current.left || nextTop !== current.top) {
          const clamped = { left: nextLeft, top: nextTop };
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
    const containerRect = pane.offsetParent
      ? pane.offsetParent.getBoundingClientRect()
      : { left: 0, top: 0 };
    const workspaceRect = getRelativeWorkspaceRect(containerRect);
    const clampMinX = workspaceRect ? workspaceRect.left - (pane.offsetWidth - 100) : -(pane.offsetWidth - 100);
    const clampMaxX = workspaceRect ? workspaceRect.right - 100 : (window.innerWidth - 100);
    const clampMinY = workspaceRect ? workspaceRect.top : 0;
    const clampMaxY = workspaceRect ? workspaceRect.bottom - 30 : (window.innerHeight - 30);

    const handleMouseMove = (moveEvent) => {
      setIsDragging(true);
      let nextX = moveEvent.clientX - offsetX - containerRect.left;
      let nextY = moveEvent.clientY - offsetY - containerRect.top;
      nextX = Math.max(clampMinX, Math.min(nextX, clampMaxX));
      nextY = Math.max(clampMinY, Math.min(nextY, clampMaxY));

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
        const endContainerRect = pane.offsetParent
          ? pane.offsetParent.getBoundingClientRect()
          : { left: 0, top: 0 };
        onPositionChange({
          left: nextRect.left - endContainerRect.left,
          top: nextRect.top - endContainerRect.top,
        });
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

  const renderLigerButtonSymbol = (kind) => {
    const centerX = 4;
    const centerY = 4;
    const diagonalHalfSpan = 2.4;
    const straightHalfSpan = 2.5;
    const barThickness = 1;

    const symbolMap = {
      close: [
        {
          type: 'line',
          key: 'primary',
          x1: centerX - diagonalHalfSpan,
          y1: centerY - diagonalHalfSpan,
          x2: centerX + diagonalHalfSpan,
          y2: centerY + diagonalHalfSpan,
        },
        {
          type: 'line',
          key: 'secondary',
          x1: centerX + diagonalHalfSpan,
          y1: centerY - diagonalHalfSpan,
          x2: centerX - diagonalHalfSpan,
          y2: centerY + diagonalHalfSpan,
        },
      ],
      minimize: [
        {
          type: 'rect',
          key: 'primary',
          x: centerX - straightHalfSpan,
          y: centerY - (barThickness / 2),
          width: straightHalfSpan * 2,
          height: barThickness,
          rx: barThickness / 2,
        },
      ],
      maximize: [
        {
          type: 'rect',
          key: 'primary',
          x: centerX - straightHalfSpan,
          y: centerY - (barThickness / 2),
          width: straightHalfSpan * 2,
          height: barThickness,
          rx: barThickness / 2,
        },
        {
          type: 'rect',
          key: 'secondary',
          x: centerX - (barThickness / 2),
          y: centerY - straightHalfSpan,
          width: barThickness,
          height: straightHalfSpan * 2,
          rx: barThickness / 2,
        },
      ],
    };

    return (
      <svg
        className={`liger-stoplight-symbol liger-stoplight-symbol--${kind}`}
        viewBox="0 0 8 8"
        aria-hidden="true"
        focusable="false"
      >
        {symbolMap[kind].map(({ key, type, ...shapeProps }) => (
          type === 'line' ? (
            <line key={key} className="liger-stoplight-symbol__mark liger-stoplight-symbol__line" {...shapeProps} />
          ) : (
            <rect key={key} className="liger-stoplight-symbol__mark liger-stoplight-symbol__bar" {...shapeProps} />
          )
        ))}
      </svg>
    );
  };

  return (
    <div
      ref={paneRef}
      className={`pane-frame type-${type} ${isMaximized ? 'pane-frame--maximized' : ''} ${isDragging ? 'pane-frame--dragging' : ''} ${isLigerChrome ? 'pane-frame--liger' : ''} ${ligerStateClass}`}
      style={(() => {
        if (!isMaximized) {
          return { left: position.left, top: position.top, width: size.width, height: size.height, zIndex, position: 'absolute', transform: 'none' };
        }
        const rect = getWorkspaceRect();
        return {
          left: rect ? rect.left : 0,
          top: rect ? rect.top : 0,
          width: rect ? rect.width : '100vw',
          height: rect ? rect.height : '100vh',
          zIndex,
          position: 'fixed',
          transform: 'none'
        };
      })()}
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
                <button type="button" className="pane-btn pane-btn--liger pane-btn--close" onClick={onClose} aria-label="Sluiten">
                  {renderLigerButtonSymbol('close')}
                </button>
                <button type="button" className="pane-btn pane-btn--liger pane-btn--minimize" onClick={onMinimize} aria-label="Minimaliseren">
                  {renderLigerButtonSymbol('minimize')}
                </button>
                <button
                  type="button"
                  className={`pane-btn pane-btn--liger ${isMaximized ? 'pane-btn--maximized' : 'pane-btn--maximize'}`}
                  onClick={onMaximize}
                  aria-label={isMaximized ? 'Herstellen' : 'Maximaliseren'}
                >
                  {renderLigerButtonSymbol('maximize')}
                </button>
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
