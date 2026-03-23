import React, { useContext, useState, useRef, useCallback } from 'react';
import SettingsContext from '../../contexts/SettingsContext';
import { useSounds } from '../../hooks/useSounds';

/**
 * ModalPane
 *
 * - Titelbalk gebruikt thema CSS variabelen
 * - Klikken buiten het venster: flikkert titelbalk + speelt error.mp3
 * - Sluiten alleen via de knop
 * - Draggable via de titelbalk
 */
function ModalPane({ title, onClose, children, icon = '🖥️', width, appearanceVariant: appearanceVariantProp }) {
  const { playSound } = useSounds();
  const [isFlashing, setIsFlashing] = useState(false);
  const [position, setPosition] = useState(null);
  const windowRef = useRef(null);
  const dragRef = useRef(null);
  const settingsContext = useContext(SettingsContext);
  const appearanceVariant = appearanceVariantProp || settingsContext?.appearanceVariant || 'dx';
  const isLigerAppearance = appearanceVariant === 'liger';

  const handleTitlebarMouseDown = useCallback((event) => {
    if (event.target.closest('.modal-pane-close')) return;
    event.preventDefault();

    const rect = windowRef.current.getBoundingClientRect();
    dragRef.current = {
      startX: event.clientX - rect.left,
      startY: event.clientY - rect.top,
    };

    const handleMouseMove = (moveEvent) => {
      if (!dragRef.current) return;
      setPosition({
        left: moveEvent.clientX - dragRef.current.startX,
        top: moveEvent.clientY - dragRef.current.startY,
      });
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleOverlayClick = useCallback(() => {
    if (isFlashing) return;
    playSound('error');
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 500);
  }, [isFlashing, playSound]);

  const windowStyle = {
    ...(width ? { width } : {}),
    ...(position
      ? { position: 'fixed', left: position.left, top: position.top, transform: 'none' }
      : {}),
  };

  return (
    <div
      className={`modal-pane-overlay${isLigerAppearance ? ' modal-pane-overlay--liger' : ''}`}
      data-appearance-variant={appearanceVariant}
      onMouseDown={handleOverlayClick}
    >
      <div
        ref={windowRef}
        className={`modal-pane-window${isLigerAppearance ? ' modal-pane-window--liger' : ''}`}
        style={windowStyle}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          className={`modal-pane-titlebar${isFlashing ? ' modal-pane-titlebar--flashing' : ''}${isLigerAppearance ? ' modal-pane-titlebar--liger' : ''}`}
          onMouseDown={handleTitlebarMouseDown}
        >
          <div className={`modal-pane-title-section${isLigerAppearance ? ' modal-pane-title-section--liger' : ''}`}>
            <span className="modal-pane-icon">{icon}</span>
            <span className="modal-pane-title">{title}</span>
          </div>
          <button
            type="button"
            className={`modal-pane-close${isLigerAppearance ? ' modal-pane-close--liger' : ''}`}
            onClick={onClose}
            title="Sluiten"
            aria-label="Sluiten"
          >
            {isLigerAppearance ? (
              <svg
                className="liger-stoplight-symbol liger-stoplight-symbol--close"
                viewBox="0 0 8 8"
                aria-hidden="true"
                focusable="false"
              >
                <line className="liger-stoplight-symbol__mark liger-stoplight-symbol__line" x1="1.6" y1="1.6" x2="6.4" y2="6.4" />
                <line className="liger-stoplight-symbol__mark liger-stoplight-symbol__line" x1="6.4" y1="1.6" x2="1.6" y2="6.4" />
              </svg>
            ) : (
              <>&times;</>
            )}
          </button>
        </div>

        <div className={`modal-pane-body${isLigerAppearance ? ' modal-pane-body--liger' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default ModalPane;
