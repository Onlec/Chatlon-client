import React, { useState, useRef, useCallback } from 'react';
import { useSounds } from '../hooks/useSounds';

/**
 * ModalPane — XP-authentieke modale dialoog
 *
 * - Titelbalk gebruikt thema CSS variabelen (--win-titlebar-a/b/c/d)
 * - Klikken buiten het venster: flikkert titelbalk + speelt error.mp3
 * - Sluiten alleen via de ✕ knop (XP gedrag)
 * - Draggable via de titelbalk
 */
function ModalPane({ title, onClose, children, icon = '🖥️', width }) {
  const { playSound } = useSounds();
  const [isFlashing, setIsFlashing] = useState(false);
  const [position, setPosition] = useState(null); // null = center via CSS
  const windowRef = useRef(null);
  const dragRef = useRef(null);

  // Dragging via titelbalk
  const handleTitlebarMouseDown = useCallback((e) => {
    if (e.target.closest('.modal-pane-close')) return;
    e.preventDefault();

    const rect = windowRef.current.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
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

  // Overlay klik = flikkeren + error geluid (XP gedrag: dialoog sluit NIET)
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
      className="modal-pane-overlay"
      onMouseDown={handleOverlayClick}
    >
      <div
        ref={windowRef}
        className="modal-pane-window"
        style={windowStyle}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Titelbalk — volgt thema, draggable */}
        <div
          className={`modal-pane-titlebar${isFlashing ? ' flashing' : ''}`}
          onMouseDown={handleTitlebarMouseDown}
        >
          <div className="modal-pane-title-section">
            <span className="modal-pane-icon">{icon}</span>
            <span className="modal-pane-title">{title}</span>
          </div>
          <button
            className="modal-pane-close"
            onClick={onClose}
            title="Sluiten"
          >
            ✕
          </button>
        </div>

        {/* Inhoud */}
        <div className="modal-pane-body">
          {children}
        </div>
      </div>
    </div>
  );
}

export default ModalPane;
