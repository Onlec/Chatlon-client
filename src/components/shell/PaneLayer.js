import React from 'react';
import Pane from '../Pane';
import ConversationPane from '../panes/ConversationPane';

function PaneLayer({
  paneConfig,
  panes,
  conversations,
  focusPane,
  getZIndex,
  toggleMaximizePane,
  closePane,
  minimizePane,
  activePane,
  savedSizes,
  handleSizeChange,
  getInitialPosition,
  handlePositionChange,
  openConversation,
  userStatus,
  handleStatusChange,
  handleLogoff,
  closeAllConversations,
  setMessengerSignedIn,
  nowPlaying,
  currentUser,
  messengerSignedIn,
  messengerCoordinator,
  handlePresenceChange,
  setNowPlaying,
  toggleMaximizeConversation,
  closeConversation,
  minimizeConversation,
  unreadMetadata,
  clearNotificationTime,
  sharedContactPresence,
  getDisplayName
}) {
  return (
    <div className="pane-layer">
      {Object.entries(paneConfig).map(([paneName, config]) => {
        const pane = panes[paneName];
        if (!pane || !pane.isOpen) return null;

        const Component = config.component;

        return (
          <div key={paneName} onMouseDown={() => focusPane(paneName)} style={{ display: pane.isMinimized ? 'none' : 'block', zIndex: getZIndex(paneName), position: 'absolute' }}>
            <Pane
              title={config.title}
              type={paneName}
              isMaximized={pane.isMaximized}
              onMaximize={() => toggleMaximizePane(paneName)}
              onClose={() => closePane(paneName)}
              onMinimize={() => minimizePane(paneName)}
              zIndex={getZIndex(paneName)}
              onFocus={() => focusPane(paneName)}
              isActive={activePane === paneName}
              savedSize={savedSizes[paneName]}
              onSizeChange={(newSize) => handleSizeChange(paneName, newSize)}
              initialPosition={pane.initialPos || getInitialPosition(paneName)}
              onPositionChange={(newPosition) => handlePositionChange(paneName, newPosition)}
            >
              {paneName === 'contacts' ? (
                <Component
                  onOpenConversation={openConversation}
                  userStatus={userStatus}
                  onStatusChange={handleStatusChange}
                  onLogoff={handleLogoff}
                  onSignOut={() => { closeAllConversations(); }}
                  onClosePane={() => { closeAllConversations(); setMessengerSignedIn(false); closePane('contacts'); }}
                  nowPlaying={nowPlaying}
                  currentUserEmail={currentUser}
                  messengerSignedIn={messengerSignedIn}
                  setMessengerSignedIn={setMessengerSignedIn}
                  onContactOnline={messengerCoordinator.handleContactOnline}
                  onPresenceChange={handlePresenceChange}
                />
              ) : paneName === 'media' ? (
                <Component onNowPlayingChange={setNowPlaying} />
              ) : (
                <Component />
              )}
            </Pane>
          </div>
        );
      })}

      {Object.entries(conversations).map(([convId, conv]) => {
        if (!conv || !conv.isOpen) return null;

        return (
          <div
            key={convId}
            onMouseDown={() => focusPane(convId)}
            style={{ display: conv.isMinimized ? 'none' : 'block', zIndex: getZIndex(convId), position: 'absolute' }}
          >
            <Pane
              title={`${getDisplayName(conv.contactName)} - Gesprek`}
              type="conversation"
              isMaximized={conv.isMaximized}
              onMaximize={() => toggleMaximizeConversation(convId)}
              onClose={() => closeConversation(convId)}
              onMinimize={() => minimizeConversation(convId)}
              zIndex={getZIndex(convId)}
              onFocus={() => focusPane(convId)}
              isActive={activePane === convId}
              savedSize={savedSizes[convId]}
              onSizeChange={(newSize) => handleSizeChange(convId, newSize)}
              initialPosition={getInitialPosition(convId)}
              onPositionChange={(newPosition) => handlePositionChange(convId, newPosition)}
            >
              <ConversationPane
                contactName={conv.contactName}
                lastNotificationTime={unreadMetadata[conv.contactName]}
                clearNotificationTime={clearNotificationTime}
                contactPresenceData={sharedContactPresence[conv.contactName]}
              />
            </Pane>
          </div>
        );
      })}
    </div>
  );
}

export default PaneLayer;
