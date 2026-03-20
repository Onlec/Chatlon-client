import React from 'react';

function StartMenu({
  isOpen,
  paneConfig,
  currentUser,
  getAvatar,
  getLocalUserInfo,
  onOpenPane,
  onCloseStartMenu,
  onLogoff,
  onShutdown
}) {
  if (!isOpen) return null;

  const rightMenuEntries = [
    { label: 'My Documents', icon: '/assets/xp/startmenu/app-documents.png', emphasis: 'primary' },
    { label: 'My Pictures', icon: '/assets/xp/startmenu/app-pictures.png', emphasis: 'primary' },
    { label: 'My Music', icon: '/assets/xp/startmenu/app-music.png', emphasis: 'primary' },
    { label: 'My Computer', icon: '/assets/xp/startmenu/app-computer.png', emphasis: 'primary' },
    { divider: true },
    { label: 'Control Panel', icon: '/assets/xp/startmenu/app-control-panel.png', emphasis: 'secondary' },
    { label: 'Help and Support', icon: '/assets/xp/startmenu/app-help.png', emphasis: 'secondary' },
    { label: 'Search', icon: '/assets/xp/startmenu/app-search.png', emphasis: 'secondary' },
    { label: 'Run...', icon: '/assets/xp/startmenu/app-run.png', emphasis: 'secondary' }
  ];

  const localInfo = getLocalUserInfo(currentUser);
  const startMenuEntries = Object.entries(paneConfig)
    .filter(([, config]) => config.startMenu?.section)
    .sort(([, a], [, b]) => (a.startMenu?.order || 0) - (b.startMenu?.order || 0));

  const pinnedEntries = startMenuEntries.filter(([, config]) => config.startMenu?.section === 'pinned');
  const programEntries = startMenuEntries.filter(([, config]) => config.startMenu?.section === 'programs');

  const renderStartItem = ([paneName, config]) => (
    <div
      key={paneName}
      className="start-item"
      onClick={() => {
        onOpenPane(paneName);
        onCloseStartMenu();
      }}
    >
      {config.desktopIcon.endsWith('.ico') || config.desktopIcon.endsWith('.png') ? (
        <img src={config.desktopIcon} alt="icon" className="start-item-icon-image" />
      ) : (
        <span className="start-item-icon-emoji">{config.desktopIcon}</span>
      )}
      <span>{config.desktopLabel}</span>
    </div>
  );

  const renderRightMenuItem = (entry, index) => {
    if (entry.divider) {
      return <div key={`divider-${index}`} className="start-right-divider" />;
    }

    return (
      <div
        key={entry.label}
        className={`start-item-gray start-item-gray--${entry.emphasis}`}
        onClick={onCloseStartMenu}
      >
        <img src={entry.icon} alt="" aria-hidden="true" className="start-item-icon-image" />
        <span>{entry.label}</span>
      </div>
    );
  };

  return (
    <div className="start-menu" onClick={(e) => e.stopPropagation()}>
      <div className="start-menu-header">
        <img
          src={localInfo?.localAvatar ? `/avatars/${localInfo.localAvatar}` : getAvatar(currentUser)}
          alt="user"
          className="start-user-img"
        />
        <span className="start-user-name">{localInfo?.localName || currentUser}</span>
      </div>
      <div className="start-menu-main">
        <div className="start-left-col">
          {pinnedEntries.length > 0 && (
            <div className="start-left-group start-left-group--pinned">
              {pinnedEntries.map(renderStartItem)}
            </div>
          )}
          {pinnedEntries.length > 0 && programEntries.length > 0 && <div className="start-left-divider" />}
          {programEntries.length > 0 && (
            <div className="start-left-group start-left-group--programs">
              {programEntries.map(renderStartItem)}
            </div>
          )}
        </div>
        <div className="start-right-col">
          <div className="start-right-group">
            {rightMenuEntries.map(renderRightMenuItem)}
          </div>
        </div>
      </div>
      <div className="start-menu-footer">
        <button className="logoff-btn" onClick={onLogoff}>
          <img
            src="/assets/xp/startmenu/action-logoff.png"
            alt=""
            aria-hidden="true"
            className="start-footer-icon"
          />
          <span>Log Off</span>
        </button>
        <button className="shutdown-btn" onClick={onShutdown}>
          <img
            src="/assets/xp/startmenu/action-shutdown.png"
            alt=""
            aria-hidden="true"
            className="start-footer-icon"
          />
          <span>Shut Down</span>
        </button>
      </div>
    </div>
  );
}

export default StartMenu;
