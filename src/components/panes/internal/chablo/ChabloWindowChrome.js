import React, { useEffect, useRef } from 'react';

const CHABLO_WINDOW_PADDING = 12;

function clampWindowPosition(position, size, bounds) {
  if (!bounds) {
    return position;
  }

  return {
    left: Math.max(
      CHABLO_WINDOW_PADDING,
      Math.min(position.left, Math.max(CHABLO_WINDOW_PADDING, bounds.width - size.width - CHABLO_WINDOW_PADDING))
    ),
    top: Math.max(
      CHABLO_WINDOW_PADDING,
      Math.min(position.top, Math.max(CHABLO_WINDOW_PADDING, bounds.height - size.height - CHABLO_WINDOW_PADDING))
    )
  };
}

function getViewportBounds(viewportRef) {
  const rect = viewportRef?.current?.getBoundingClientRect?.();
  if (!rect) {
    return null;
  }

  return {
    width: rect.width,
    height: rect.height
  };
}

export function ChabloWindowTabs({ items, activeId, onChange }) {
  return (
    <div className="chablo-window-tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={activeId === item.id}
          className={`chablo-window-tab ${activeId === item.id ? 'chablo-window-tab--active' : ''}`}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          {item.badge ? <span className="chablo-count-badge chablo-count-badge--tab">{item.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function ChabloWindow({
  windowId,
  title,
  state,
  viewportRef,
  onFocus,
  onClose,
  onMove,
  children
}) {
  const windowRef = useRef(null);
  const dragStateRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!dragStateRef.current) {
        return;
      }

      const nextPosition = {
        left: dragStateRef.current.origin.left + (event.clientX - dragStateRef.current.startX),
        top: dragStateRef.current.origin.top + (event.clientY - dragStateRef.current.startY)
      };
      onMove(windowId, clampWindowPosition(nextPosition, state.size, getViewportBounds(viewportRef)));
    };

    const handleMouseUp = () => {
      dragStateRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    if (dragStateRef.current) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onMove, state.size, viewportRef, windowId]);

  return (
    <section
      ref={windowRef}
      className="chablo-window"
      style={{
        width: state.size.width,
        height: state.size.height,
        left: state.position.left,
        top: state.position.top,
        zIndex: state.zIndex
      }}
      onMouseDown={() => onFocus(windowId)}
    >
      <div
        className="chablo-window__titlebar"
        onMouseDown={(event) => {
          if (event.target.closest('.chablo-window__close')) {
            return;
          }
          event.preventDefault();
          onFocus(windowId);
          dragStateRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            origin: { ...state.position }
          };
        }}
      >
        <strong>{title}</strong>
        <button
          type="button"
          className="chablo-window__close"
          aria-label={`${title} sluiten`}
          onClick={() => onClose(windowId)}
        >
          x
        </button>
      </div>
      <div className="chablo-window__body">{children}</div>
    </section>
  );
}
