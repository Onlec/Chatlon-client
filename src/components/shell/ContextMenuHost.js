import React from 'react';

function ContextMenuHost({ enabled, menuState, onClose, hostRef }) {
  if (!enabled || !menuState) return null;

  return (
    <div
      ref={hostRef}
      className="ctx-menu"
      style={{ left: menuState.x, top: menuState.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="ctx-menu-surface">
        {Array.isArray(menuState.actions) && menuState.actions.length > 0 ? (
          menuState.actions.map((action, index) => {
            if (action?.type === 'separator') {
              return <hr key={`separator-${index}`} className="ctx-menu-separator" />;
            }
            const disabled = Boolean(action?.disabled);
            return (
              <button
                key={action.id}
                className={`ctx-menu-item ${disabled ? 'ctx-menu-item--disabled' : ''} ${action?.bold ? 'ctx-menu-item--bold' : ''}`}
                onClick={() => {
                  if (disabled) return;
                  if (typeof action.onClick === 'function') {
                    action.onClick();
                  }
                  onClose?.();
                }}
              >
                {action.label}
              </button>
            );
          })
        ) : null}
      </div>
    </div>
  );
}

export default ContextMenuHost;
