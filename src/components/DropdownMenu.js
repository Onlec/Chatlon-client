import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';

function DropdownMenu({ label, items, isOpen, onToggle, onClose, onHover }) {
  const labelRef = useRef(null);
  const panelRef = useRef(null);
  const [hoveredSubmenu, setHoveredSubmenu] = useState(null);
  const [panelPos, setPanelPos] = useState(null);
  const closeTimerRef = useRef(null);

  // Bereken positie VOOR paint via useLayoutEffect — geen flicker
  useLayoutEffect(() => {
    if (isOpen && labelRef.current) {
      const rect = labelRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom, left: rect.left });
    } else if (!isOpen) {
      setPanelPos(null);
    }
  }, [isOpen]);

  // Click-outside sluit menu
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (labelRef.current && labelRef.current.contains(e.target)) return;
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose, cancelClose]);

  // Cleanup timer
  useEffect(() => {
    return () => cancelClose();
  }, [cancelClose]);

  const handleLabelEnter = () => {
    cancelClose();
    if (onHover) {
      onHover();
    } else if (!isOpen) {
      onToggle();
    }
  };

  const handleLabelLeave = () => {
    if (isOpen) {
      scheduleClose();
    }
  };

  const handlePanelEnter = () => {
    cancelClose();
  };

  const handlePanelLeave = () => {
    scheduleClose();
  };

  const renderPanel = () => {
    if (!isOpen || !panelPos) return null;

    const panel = (
      <div
        ref={panelRef}
        className="dropdown-panel dropdown-panel-portal"
        style={{
          position: 'fixed',
          top: panelPos.top,
          left: panelPos.left,
        }}
        onMouseEnter={handlePanelEnter}
        onMouseLeave={handlePanelLeave}
      >
        {items.map((item, idx) => {
          if (item.separator) {
            return <div key={idx} className="dropdown-separator" />;
          }

          const hasSubmenu = item.submenu && item.submenu.length > 0;

          return (
            <div
              key={idx}
              className={`dropdown-item ${item.disabled ? 'dropdown-item--disabled' : ''} ${item.checked ? 'dropdown-item--checked' : ''}`}
              onClick={() => {
                if (item.disabled) return;
                if (hasSubmenu) return;
                if (item.onClick) item.onClick();
                onClose();
              }}
              onMouseEnter={() => hasSubmenu && setHoveredSubmenu(idx)}
              onMouseLeave={() => hasSubmenu && setHoveredSubmenu(null)}
            >
              {item.checked !== undefined && (
                <span className="dropdown-check">{item.checked ? '\u2713' : ''}</span>
              )}
              <span className="dropdown-item-label">{item.label}</span>
              {hasSubmenu && <span className="dropdown-arrow">{'\u25B6'}</span>}

              {hasSubmenu && hoveredSubmenu === idx && (
                <div className="dropdown-panel dropdown-submenu">
                  {item.submenu.map((sub, subIdx) => (
                    <div
                      key={subIdx}
                      className={`dropdown-item ${sub.disabled ? 'dropdown-item--disabled' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (sub.disabled) return;
                        if (sub.onClick) sub.onClick();
                        onClose();
                      }}
                    >
                      <span className="dropdown-item-label">{sub.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );

    const portalRoot = document.getElementById('portal-root') || document.body;
    return ReactDOM.createPortal(panel, portalRoot);
  };

  return (
    <div className="dropdown-menu-wrapper">
      <span
        ref={labelRef}
        className={`contacts-menu-item ${isOpen ? 'contacts-menu-item--active' : ''}`}
        onMouseEnter={handleLabelEnter}
        onMouseLeave={handleLabelLeave}
        onClick={onToggle}
      >
        {label}
      </span>
      {renderPanel()}
    </div>
  );
}

export default DropdownMenu;
