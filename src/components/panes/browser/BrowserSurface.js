import React from 'react';
import { BROWSER_HOME_URL, BOOKMARKS } from './browserShared';

function BrowserSurface({
  browserState,
  contentRef,
  contentState,
  currentUrl,
  frameSrc,
  homeSearchQuery,
  sessionId,
  setHomeSearchQuery,
  surfaceHandlers,
  visibleError,
  onGoHome,
  onHomeSearchSubmit,
  onNavigateEntry,
  onNavigateFromInput,
  onOpenExternally,
  onRetry
}) {
  const renderHomePage = () => (
    <div className="yoctol-page">
      <div className="yoctol-header">
        <div className="yoctol-logo" aria-label="Yoctol">
          <span className="yoctol-logo-letter yoctol-logo-letter--blue">Y</span>
          <span className="yoctol-logo-letter yoctol-logo-letter--red">o</span>
          <span className="yoctol-logo-letter yoctol-logo-letter--gold">c</span>
          <span className="yoctol-logo-letter yoctol-logo-letter--blue">t</span>
          <span className="yoctol-logo-letter yoctol-logo-letter--green">o</span>
          <span className="yoctol-logo-letter yoctol-logo-letter--red">l</span>
        </div>
        <p className="yoctol-tagline">
          Zoek het web, open een favoriet, of typ meteen een adres in de adresbalk.
        </p>
      </div>

      <form className="yoctol-search-form" onSubmit={onHomeSearchSubmit}>
        <input
          type="text"
          className="yoctol-search-input"
          placeholder="Zoek met Yoctol"
          value={homeSearchQuery}
          onChange={(event) => setHomeSearchQuery(event.target.value)}
        />
        <div className="yoctol-buttons">
          <button type="submit" className="yoctol-btn">Zoeken</button>
          <button
            type="button"
            className="yoctol-btn yoctol-btn--secondary"
            onClick={() => setHomeSearchQuery('nostalgische websites')}
          >
            Inspiratie
          </button>
        </div>
      </form>

      <div className="yoctol-links">
        <button type="button" className="yoctol-inline-link" onClick={() => onNavigateFromInput('example.com')}>
          Naar voorbeeldsite
        </button>
        <span className="yoctol-links-separator">|</span>
        <button type="button" className="yoctol-inline-link" onClick={() => onNavigateFromInput('https://duckduckgo.com/')}>
          Open zoekmachine
        </button>
        <span className="yoctol-links-separator">|</span>
        <button type="button" className="yoctol-inline-link" onClick={() => onNavigateFromInput('web browsers history')}>
          Zoek nostalgie
        </button>
      </div>

      <div className="yoctol-services">
        {BOOKMARKS.map((bookmark) => (
          <button
            key={bookmark.name}
            type="button"
            className="yoctol-service-box"
            onClick={() => onNavigateEntry(bookmark.mode === 'home'
              ? { mode: 'home', url: BROWSER_HOME_URL }
              : { mode: 'page', url: bookmark.url })}
          >
            <strong>{bookmark.name}</strong>
            <span>{bookmark.mode === 'home' ? 'Lokale startpagina' : bookmark.url}</span>
          </button>
        ))}
      </div>

      <div className="yoctol-footer">
        Yoctol Startpagina - lokaal voor jou, met een echte remote browser erachter.
      </div>
    </div>
  );

  const renderErrorPage = () => (
    <div className="browser-error-page">
      <div className="browser-error-card">
        <div className="browser-error-badge">!</div>
        <h2>{visibleError?.title || 'Pagina kan niet worden weergegeven'}</h2>
        <p>{visibleError?.message || 'Internet Adventurer kon deze pagina niet laden.'}</p>
        {currentUrl !== BROWSER_HOME_URL && (
          <div className="browser-error-url">{currentUrl}</div>
        )}
        <div className="browser-error-actions">
          <button type="button" className="yoctol-btn" onClick={onRetry}>
            Opnieuw proberen
          </button>
          <button
            type="button"
            className="browser-secondary-btn"
            onClick={onOpenExternally}
            disabled={currentUrl === BROWSER_HOME_URL}
          >
            Extern openen
          </button>
          <button type="button" className="browser-secondary-btn" onClick={onGoHome}>
            Startpagina
          </button>
        </div>
      </div>
    </div>
  );

  const renderPage = () => {
    const showBlockingLoading = !frameSrc;

    return (
      <div className="browser-page-view">
        <div
          className="browser-remote-surface"
          role="application"
          tabIndex={0}
          aria-label="Remote browser oppervlak"
          {...surfaceHandlers}
        >
          {sessionId && frameSrc && (
            <img
              src={frameSrc}
              className="browser-page-frame"
              alt={`Internet Adventurer - ${currentUrl}`}
              draggable="false"
              data-frame-mime-type={browserState.frameMimeType}
            />
          )}
        </div>
        {showBlockingLoading && (
          <div className="browser-loading-overlay">
            <div className="browser-loading-card">
              <div className="browser-loading-spinner" aria-hidden="true" />
              <div className="browser-loading-title">Laden...</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={contentRef} className={`browser-content browser-content--${contentState}`}>
      {contentState === 'home' && renderHomePage()}
      {contentState === 'page' && renderPage()}
      {contentState === 'error' && renderErrorPage()}
    </div>
  );
}

export default BrowserSurface;
