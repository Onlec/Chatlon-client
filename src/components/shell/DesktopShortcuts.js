import React, { useMemo, useRef, useState } from 'react';

function DesktopShortcuts({
  shortcuts,
  onOpenShortcut,
  onShortcutContextMenu,
  onRenameShortcut,
  onMoveShortcut,
  gridConfig,
  layoutVariant = 'dx'
}) {
  const [renamingId, setRenamingId] = useState(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [dragState, setDragState] = useState(null);
  const suppressOpenUntilRef = useRef(0);
  const pointerOffsetRef = useRef({ x: 0, y: 0 });
  const dragPositionRef = useRef(null);
  const areaRef = useRef(null);

  const resolvedGrid = useMemo(() => ({
    marginLeft: gridConfig?.marginLeft ?? 20,
    marginTop: gridConfig?.marginTop ?? 20,
    itemWidth: gridConfig?.itemWidth ?? 80,
    itemHeight: gridConfig?.itemHeight ?? 72,
    bottomReserved: gridConfig?.bottomReserved ?? 30
  }), [gridConfig]);
  const isLigerLayout = layoutVariant === 'liger';

  const commitRename = (shortcutId) => {
    const nextLabel = draftLabel.trim();
    if (nextLabel && typeof onRenameShortcut === 'function') {
      onRenameShortcut(shortcutId, nextLabel);
    }
    setRenamingId(null);
    setDraftLabel('');
  };

  const getScreenRect = () => {
    const el = document.querySelector('.monitor-screen-content')
      || document.querySelector('.monitor-screen')
      || document.querySelector('.bezel-screen');
    return el ? el.getBoundingClientRect() : null;
  };

  const getWorkspaceMetrics = () => {
    const areaRect = areaRef.current?.getBoundingClientRect?.();
    if (areaRect && areaRect.width > 0 && areaRect.height > 0) {
      return {
        left: areaRect.left,
        top: areaRect.top,
        width: areaRect.width,
        height: areaRect.height,
      };
    }
    const sr = getScreenRect();
    if (sr) {
      return {
        left: sr.left,
        top: sr.top,
        width: sr.width,
        height: sr.height,
      };
    }
    return {
      left: 0,
      top: 0,
      width: areaRef.current?.clientWidth || window.innerWidth,
      height: areaRef.current?.clientHeight || window.innerHeight,
    };
  };

  const clampPosition = (x, y) => {
    const metrics = getWorkspaceMetrics();
    const minX = resolvedGrid.marginLeft;
    const minY = resolvedGrid.marginTop;
    const maxX = Math.max(minX, metrics.width - resolvedGrid.itemWidth);
    const maxY = Math.max(minY, metrics.height - resolvedGrid.bottomReserved - resolvedGrid.itemHeight);
    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y))
    };
  };

  const resolveRenderLeft = (position) =>
    isLigerLayout
      ? getWorkspaceMetrics().width - resolvedGrid.itemWidth - position.x
      : position.x;

  const startDrag = (event, shortcut) => {
    if (event.button !== 0) return;
    if (renamingId === shortcut.id) return;
    event.preventDefault();
    event.stopPropagation();
    const workspaceMetrics = getWorkspaceMetrics();
    const basePosition = clampPosition(
      shortcut.position?.x ?? resolvedGrid.marginLeft,
      shortcut.position?.y ?? resolvedGrid.marginTop
    );
    const baseLeft = resolveRenderLeft(basePosition);
    pointerOffsetRef.current = {
      x: event.clientX - (workspaceMetrics.left + baseLeft),
      y: event.clientY - (workspaceMetrics.top + basePosition.y)
    };
    const threshold = 4;
    let dragged = false;

    const onMouseMove = (moveEvent) => {
      const rawLeft = moveEvent.clientX - workspaceMetrics.left - pointerOffsetRef.current.x;
      const rawY = moveEvent.clientY - workspaceMetrics.top - pointerOffsetRef.current.y;
      const rawX = isLigerLayout
        ? workspaceMetrics.width - resolvedGrid.itemWidth - rawLeft
        : rawLeft;
      const clamped = clampPosition(rawX, rawY);
      const delta = Math.abs(moveEvent.clientX - event.clientX) + Math.abs(moveEvent.clientY - event.clientY);
      if (!dragged && delta >= threshold) {
        dragged = true;
      }
      if (dragged) {
        dragPositionRef.current = clamped;
        setDragState({
          id: shortcut.id,
          x: clamped.x,
          y: clamped.y
        });
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      if (!dragged) {
        dragPositionRef.current = null;
        setDragState(null);
        return;
      }
      if (typeof onMoveShortcut === 'function') {
        const finalPosition = dragPositionRef.current || basePosition;
        onMoveShortcut(shortcut.id, {
          x: finalPosition.x,
          y: finalPosition.y
        });
      }
      suppressOpenUntilRef.current = Date.now() + 250;
      dragPositionRef.current = null;
      setDragState(null);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div ref={areaRef} className={`shortcuts-area shortcuts-area--${layoutVariant}`} data-layout={layoutVariant}>
      {shortcuts.map((shortcut) => {
        const isDragging = dragState?.id === shortcut.id;
        const basePosition = isDragging
          ? { x: dragState.x, y: dragState.y }
          : (shortcut.position || { x: resolvedGrid.marginLeft, y: resolvedGrid.marginTop });
        const position = clampPosition(basePosition.x, basePosition.y);
        const positionStyle = isLigerLayout
          ? { right: position.x, top: position.y }
          : { left: position.x, top: position.y };
        return (
          <div
            key={shortcut.id}
            className={`shortcut shortcut--${layoutVariant} ${isDragging ? 'shortcut--dragging' : ''}`}
            style={positionStyle}
            onMouseDown={(event) => startDrag(event, shortcut)}
            onDoubleClick={() => {
              if (Date.now() < suppressOpenUntilRef.current) return;
              onOpenShortcut(shortcut.id);
            }}
            onContextMenu={(event) => {
              if (typeof onShortcutContextMenu !== 'function') return;
              event.preventDefault();
              event.stopPropagation();
              onShortcutContextMenu(event, shortcut.id, () => {
                setRenamingId(shortcut.id);
                setDraftLabel(shortcut.label || '');
              });
            }}
          >
            {shortcut.icon.endsWith('.ico') || shortcut.icon.endsWith('.png') ? (
              <img src={shortcut.icon} alt={shortcut.label} className="shortcut-icon" />
            ) : (
              <span className="shortcut-icon shortcut-icon-emoji">{shortcut.icon}</span>
            )}
            {renamingId === shortcut.id ? (
              <input
                className="shortcut-label-input"
                value={draftLabel}
                onChange={(event) => setDraftLabel(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                onDoubleClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    commitRename(shortcut.id);
                  } else if (event.key === 'Escape') {
                    setRenamingId(null);
                    setDraftLabel('');
                  }
                }}
                onBlur={() => commitRename(shortcut.id)}
                autoFocus
              />
            ) : (
              <span className="shortcut-label">{shortcut.label}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default DesktopShortcuts;
