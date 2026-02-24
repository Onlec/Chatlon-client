import React from 'react';

function ContextMenuHost({ enabled, menuState, onClose }) {
  if (!enabled || !menuState) return null;

  const style = {
    position: 'fixed',
    left: menuState.x,
    top: menuState.y,
    zIndex: 5000
  };

  return (
    <div className="context-menu-host" style={style} onClick={onClose}>
      <div className="context-menu-surface">
        {Array.isArray(menuState.actions) && menuState.actions.length > 0 ? (
          menuState.actions.map((action) => (
            <button
              key={action.id}
              className="context-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof action.onClick === 'function') {
                  action.onClick();
                }
                onClose();
              }}
            >
              {action.label}
            </button>
          ))
        ) : null}
      </div>
    </div>
  );
}

export default ContextMenuHost;
