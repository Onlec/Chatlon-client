import React, { useEffect, useRef, useState } from 'react';

function LigerMenuBar({
  activeAppName,
  currentUser,
  relayStatus,
  isSuperpeer,
  connectedSuperpeers,
  currentStatusOption,
  windowItems,
  onOpenContacts,
  onLogoff,
  onShutdown
}) {
  const [time, setTime] = useState('');
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const intervalId = setInterval(update, 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!openMenu) return undefined;

    const handleClickOutside = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      setOpenMenu(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenu]);

  const relayLabel = relayStatus?.anyOnline ? 'Relay online' : 'Relay offline';

  return (
    <div className="liger-menubar" ref={menuRef}>
      <div className="liger-menubar__left">
        <button
          type="button"
          className="liger-menubar__trigger liger-menubar__trigger--logo"
          onClick={() => setOpenMenu((current) => (current === 'system' ? null : 'system'))}
          aria-label="Liger-menu"
        >
          🐯
        </button>
        <span className="liger-menubar__app">{activeAppName || 'Liger'}</span>
        <button
          type="button"
          className="liger-menubar__trigger"
          onClick={() => setOpenMenu((current) => (current === 'window' ? null : 'window'))}
        >
          Venster
        </button>
      </div>

      <div className="liger-menubar__right">
        <span
          className={`liger-menubar__relay ${relayStatus?.anyOnline ? 'liger-menubar__relay--online' : 'liger-menubar__relay--offline'}`}
          title={`${relayLabel}${isSuperpeer ? ` | Superpeer actief (${connectedSuperpeers} peer(s))` : ''}`}
        >
          {relayStatus?.anyOnline ? '\u25CF' : '\u25CB'}
        </span>
        <span className="liger-menubar__status" style={{ color: currentStatusOption?.color }}>
          {currentStatusOption?.label || 'Offline'}
        </span>
        {isSuperpeer && <span className="liger-menubar__badge">Superpeer</span>}
        <span className="liger-menubar__user">{currentUser}</span>
        <span className="liger-menubar__clock">{time}</span>
      </div>

      {openMenu === 'system' && (
        <div className="liger-menu liger-menu--system">
          <button type="button" className="liger-menu__item" onClick={() => { onOpenContacts?.(); setOpenMenu(null); }}>
            Chatlon openen
          </button>
          <button type="button" className="liger-menu__item" onClick={() => { onLogoff?.(); setOpenMenu(null); }}>
            Afmelden
          </button>
          <button type="button" className="liger-menu__item" onClick={() => { onShutdown?.(); setOpenMenu(null); }}>
            Afsluiten
          </button>
        </div>
      )}

      {openMenu === 'window' && (
        <div className="liger-menu liger-menu--window">
          {windowItems?.length ? (
            windowItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`liger-menu__item${item.isActive ? ' liger-menu__item--active' : ''}`}
                onClick={() => {
                  item.onSelect?.();
                  setOpenMenu(null);
                }}
              >
                <span className="liger-menu__icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.isMinimized && <span className="liger-menu__meta">Geminimaliseerd</span>}
              </button>
            ))
          ) : (
            <div className="liger-menu__empty">Geen open vensters</div>
          )}
        </div>
      )}
    </div>
  );
}

export default LigerMenuBar;
