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

  const localInfo = getLocalUserInfo(currentUser);

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
          {Object.entries(paneConfig).map(([paneName, config]) => (
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
          ))}
        </div>
        <div className="start-right-col">
          <div className="start-item-gray" onClick={onCloseStartMenu}>
            My Documents
          </div>
          <div className="start-item-gray" onClick={onCloseStartMenu}>
            My Computer
          </div>
        </div>
      </div>
      <div className="start-menu-footer">
        <button className="logoff-btn" onClick={onLogoff}>Log Off</button>
        <button className="shutdown-btn" onClick={onShutdown}>Shut Down</button>
      </div>
    </div>
  );
}

export default StartMenu;
