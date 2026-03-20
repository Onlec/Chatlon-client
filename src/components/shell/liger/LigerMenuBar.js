import React, { useEffect, useRef, useState } from 'react';

function renderItemIcon(icon) {
  if (!icon) return null;
  if (typeof icon === 'string' && (icon.endsWith('.ico') || icon.endsWith('.png'))) {
    return <img src={icon} alt="" aria-hidden="true" />;
  }
  return <span aria-hidden="true">{icon}</span>;
}

function LigerMenuBar({
  activeAppName,
  menus = [],
  onMenuAction,
  currentUser,
  relayStatus,
  isSuperpeer,
  connectedSuperpeers,
  currentStatusOption,
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

  const handleTriggerToggle = (menuKey, hasItems = true) => {
    if (!hasItems) return;
    setOpenMenu((current) => (current === menuKey ? null : menuKey));
  };

  const handleMenuHover = (menuKey, hasItems = true) => {
    if (openMenu === null || !hasItems) return;
    setOpenMenu(menuKey);
  };

  const handleMenuItemClick = (item) => {
    const isInteractive = typeof item?.onSelect === 'function' || Boolean(item?.action);
    if (!item || item.disabled || !isInteractive) return;

    if (typeof item.onSelect === 'function') {
      item.onSelect();
    } else if (item.action) {
      onMenuAction?.(item.action);
    }

    setOpenMenu(null);
  };

  return (
    <div className="liger-menubar" ref={menuRef}>
      <div className="liger-menubar__left">
        <div
          className={`liger-menubar__menu-group${openMenu === 'system' ? ' liger-menubar__menu-group--open' : ''}`}
          onMouseEnter={() => handleMenuHover('system')}
        >
          <button
            type="button"
            className="liger-menubar__trigger liger-menubar__trigger--logo"
            onClick={() => handleTriggerToggle('system')}
            aria-label="Liger-menu"
          >
            {'\u{1F42F}'}
          </button>

          {openMenu === 'system' && (
            <div className="liger-menu liger-menu--system">
              <button type="button" className="liger-menu__item" onClick={() => { onOpenContacts?.(); setOpenMenu(null); }}>
                <span className="liger-menu__label">Chatlon openen</span>
              </button>
              <button type="button" className="liger-menu__item" onClick={() => { onLogoff?.(); setOpenMenu(null); }}>
                <span className="liger-menu__label">Afmelden</span>
              </button>
              <button type="button" className="liger-menu__item" onClick={() => { onShutdown?.(); setOpenMenu(null); }}>
                <span className="liger-menu__label">Afsluiten</span>
              </button>
            </div>
          )}
        </div>

        <span className="liger-menubar__app">{activeAppName || 'Liger'}</span>

        {menus.map((menu, index) => {
          const menuKey = `menu-${index}`;
          const hasItems = Boolean(menu?.items?.length);

          return (
            <div
              key={`${menu.label}-${menuKey}`}
              className={`liger-menubar__menu-group${openMenu === menuKey ? ' liger-menubar__menu-group--open' : ''}`}
              onMouseEnter={() => handleMenuHover(menuKey, hasItems)}
            >
              <button
                type="button"
                className="liger-menubar__trigger"
                onClick={() => handleTriggerToggle(menuKey, hasItems)}
                disabled={!hasItems}
              >
                {menu.label}
              </button>

              {openMenu === menuKey && hasItems && (
                <div className="liger-menu liger-menu--app">
                  {menu.items.map((item, itemIndex) => {
                    if (item.type === 'separator') {
                      return <div key={`${menuKey}-separator-${itemIndex}`} className="liger-menu__separator" />;
                    }

                    const isInteractive = typeof item?.onSelect === 'function' || Boolean(item?.action);
                    const isDisabled = item.disabled || !isInteractive;

                    return (
                      <button
                        key={`${menuKey}-${item.label}-${itemIndex}`}
                        type="button"
                        className={`liger-menu__item${item.isActive ? ' liger-menu__item--active' : ''}${isDisabled ? ' liger-menu__item--disabled' : ''}`}
                        disabled={isDisabled}
                        onClick={() => handleMenuItemClick(item)}
                      >
                        <span className="liger-menu__main">
                          {item.icon && <span className="liger-menu__icon">{renderItemIcon(item.icon)}</span>}
                          <span className="liger-menu__label">{item.label}</span>
                        </span>

                        {(item.meta || item.shortcut) && (
                          <span className="liger-menu__meta-group">
                            {item.meta && <span className="liger-menu__meta">{item.meta}</span>}
                            {item.shortcut && <span className="liger-menu__shortcut">{item.shortcut}</span>}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
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
    </div>
  );
}

export default LigerMenuBar;
