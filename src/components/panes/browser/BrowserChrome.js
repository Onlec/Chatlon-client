import React from 'react';
import {
  BROWSER_HOME_URL,
  BOOKMARKS
} from './browserShared';

function BrowserChrome({
  browserState,
  currentUrl,
  inputUrl,
  sessionId,
  setInputUrl,
  onAddressSubmit,
  onBack,
  onForward,
  onStop,
  onRefresh,
  onHome,
  onNavigateEntry,
  addressEditingRef
}) {
  return (
    <>
      <div className="browser-menubar" data-decorative-menubar="true">
        <span className="browser-menu-item">Bestand</span>
        <span className="browser-menu-item">Bewerken</span>
        <span className="browser-menu-item">Beeld</span>
        <span className="browser-menu-item">Favorieten</span>
        <span className="browser-menu-item">Extra</span>
        <span className="browser-menu-item">Help</span>
      </div>

      <div className="browser-toolbar">
        <button
          type="button"
          className="browser-nav-btn"
          onClick={onBack}
          title="Terug"
          aria-label="Terug"
          disabled={!browserState.canGoBack}
        >
          &lt;
        </button>
        <button
          type="button"
          className="browser-nav-btn"
          onClick={onForward}
          title="Vooruit"
          aria-label="Vooruit"
          disabled={!browserState.canGoForward}
        >
          &gt;
        </button>
        <button
          type="button"
          className="browser-nav-btn"
          onClick={onStop}
          title="Stop"
          aria-label="Stop"
          disabled={!browserState.isLoading}
        >
          X
        </button>
        <button
          type="button"
          className="browser-nav-btn"
          onClick={onRefresh}
          title="Vernieuwen"
          aria-label="Vernieuwen"
          disabled={!sessionId}
        >
          R
        </button>
        <button
          type="button"
          className="browser-nav-btn"
          onClick={onHome}
          title="Startpagina"
          aria-label="Startpagina"
          disabled={!sessionId}
        >
          H
        </button>

        <form className="browser-address-bar" onSubmit={onAddressSubmit}>
          <span className="browser-address-label">Adres</span>
          <input
            type="text"
            className="browser-address-input"
            value={inputUrl}
            onChange={(event) => setInputUrl(event.target.value)}
            onFocus={() => {
              addressEditingRef.current = true;
            }}
            onBlur={() => {
              addressEditingRef.current = false;
              setInputUrl(currentUrl);
            }}
            aria-label="Adresbalk"
          />
          <button type="submit" className="browser-go-btn" disabled={!sessionId}>
            Start
          </button>
        </form>
      </div>

      <div className="browser-bookmarks-bar">
        <span className="browser-bookmarks-label">Favorieten:</span>
        {BOOKMARKS.map((bookmark) => (
          <button
            key={bookmark.name}
            type="button"
            className="browser-bookmark-btn"
            onClick={() => onNavigateEntry(bookmark.mode === 'home'
              ? { mode: 'home', url: BROWSER_HOME_URL }
              : { mode: 'page', url: bookmark.url })}
            disabled={!sessionId}
          >
            {bookmark.name}
          </button>
        ))}
      </div>
    </>
  );
}

export default BrowserChrome;
