import React, { useEffect, useRef, useState } from 'react';

export const BROWSER_HOME_URL = 'yoctol://home';
export const BROWSER_LOAD_TIMEOUT_MS = 4500;
export const BROWSER_SEARCH_BASE_URL = 'https://duckduckgo.com/?q=';

const HOME_ALIASES = new Set([
  '',
  'home',
  'start',
  'startpagina',
  'about:home',
  'yoctol',
  BROWSER_HOME_URL
]);

const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i;
const LOCALHOST_PATTERN = /^(?:localhost|127(?:\.\d{1,3}){3})(?::\d+)?(?:[/?#].*)?$/i;
const IPV4_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?:[/?#].*)?$/;

const BOOKMARKS = [
  { name: 'Yoctol Home', mode: 'home', url: BROWSER_HOME_URL },
  { name: 'Example', url: 'https://example.com/' },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com/' },
  { name: 'NeverSSL', url: 'http://neverssl.com/' },
  { name: 'Wikipedia', url: 'https://www.wikipedia.org/' },
  { name: 'Archive.org', url: 'https://archive.org/' }
];

function createHomeEntry() {
  return { mode: 'home', url: BROWSER_HOME_URL };
}

function createPageEntry(url) {
  return { mode: 'page', url };
}

function buildSearchUrl(query) {
  return `${BROWSER_SEARCH_BASE_URL}${encodeURIComponent(query)}`;
}

function getAddressValue(entry) {
  return entry?.url || BROWSER_HOME_URL;
}

function looksLikeUrlWithoutScheme(value) {
  return DOMAIN_PATTERN.test(value) || LOCALHOST_PATTERN.test(value) || IPV4_PATTERN.test(value);
}

function getDefaultProtocol(value) {
  if (LOCALHOST_PATTERN.test(value) || IPV4_PATTERN.test(value)) {
    return 'http://';
  }
  return 'https://';
}

function isInspectableIframeUrl(url) {
  if (typeof window === 'undefined') return false;
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

function getOriginLabel(url) {
  if (!url || url === BROWSER_HOME_URL) return 'Lokale startpagina';
  try {
    return new URL(url).host;
  } catch {
    return 'Onbekende locatie';
  }
}

function getConnectionLabel(url) {
  if (!url || url === BROWSER_HOME_URL) return 'Offline startpagina';
  try {
    return new URL(url).protocol === 'https:' ? 'Veilige verbinding' : 'Onbeveiligde verbinding';
  } catch {
    return 'Onbekende verbinding';
  }
}

function createLoadError(type, url) {
  if (type === 'blank') {
    return {
      type,
      url,
      title: 'Pagina lijkt geblokkeerd',
      message: 'Deze site laadde een lege pagina in Internet Adventurer. De site blokkeert mogelijk weergave in een iframe.'
    };
  }

  if (type === 'failed') {
    return {
      type,
      url,
      title: 'Pagina kon niet laden',
      message: 'Internet Adventurer kon geen bruikbare respons krijgen van deze site.'
    };
  }

  return {
    type: 'timeout',
    url,
    title: 'Pagina reageert niet op tijd',
    message: 'De site laadde niet op tijd, of blokkeert ingebedde weergave. Probeer opnieuw of open de pagina extern.'
  };
}

export function normalizeBrowserInput(rawValue) {
  const trimmed = (rawValue || '').trim();

  if (HOME_ALIASES.has(trimmed.toLowerCase())) {
    return createHomeEntry();
  }

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return createPageEntry(parsed.toString());
      }
    } catch {
      return createPageEntry(buildSearchUrl(trimmed));
    }

    return createPageEntry(buildSearchUrl(trimmed));
  }

  if (looksLikeUrlWithoutScheme(trimmed)) {
    return createPageEntry(new URL(`${getDefaultProtocol(trimmed)}${trimmed}`).toString());
  }

  return createPageEntry(buildSearchUrl(trimmed));
}

function BrowserPane() {
  const initialEntry = createHomeEntry();
  const iframeRef = useRef(null);
  const loadTimeoutRef = useRef(null);
  const [history, setHistory] = useState([initialEntry]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [currentUrl, setCurrentUrl] = useState(initialEntry.url);
  const [inputUrl, setInputUrl] = useState(initialEntry.url);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [frameNonce, setFrameNonce] = useState(0);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');

  const currentEntry = history[historyIndex] || initialEntry;
  const contentState = loadError ? 'error' : currentEntry.mode;
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const clearLoadTimeout = () => {
    if (loadTimeoutRef.current) {
      window.clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  };

  const syncEntryState = (entry, options = {}) => {
    const { reloadFrame = false } = options;
    clearLoadTimeout();
    setCurrentUrl(entry.url);
    setInputUrl(getAddressValue(entry));
    setLoadError(null);
    if (entry.mode === 'page') {
      setIsLoading(true);
      if (reloadFrame) {
        setFrameNonce((value) => value + 1);
      }
    } else {
      setIsLoading(false);
    }
  };

  const pushEntry = (entry) => {
    const nextHistory = [...history.slice(0, historyIndex + 1), entry];
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    syncEntryState(entry, { reloadFrame: entry.mode === 'page' });
  };

  const openHistoryEntry = (nextIndex) => {
    const entry = history[nextIndex];
    if (!entry) return;
    setHistoryIndex(nextIndex);
    syncEntryState(entry, { reloadFrame: entry.mode === 'page' });
  };

  const navigateFromInput = (rawValue) => {
    pushEntry(normalizeBrowserInput(rawValue));
  };

  const navigateHome = () => {
    pushEntry(createHomeEntry());
  };

  const refreshCurrentPage = () => {
    if (currentEntry.mode === 'home') {
      syncEntryState(currentEntry);
      return;
    }
    syncEntryState(currentEntry, { reloadFrame: true });
  };

  const retryCurrentPage = () => {
    if (currentEntry.mode !== 'page') return;
    syncEntryState(currentEntry, { reloadFrame: true });
  };

  const stopLoading = () => {
    clearLoadTimeout();
    setIsLoading(false);
  };

  const openExternally = () => {
    if (!currentUrl || currentUrl === BROWSER_HOME_URL || typeof window === 'undefined') return;
    window.open(currentUrl, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => () => {
    clearLoadTimeout();
  }, []);

  useEffect(() => {
    if (currentEntry.mode !== 'page' || !isLoading || loadError) {
      clearLoadTimeout();
      return undefined;
    }

    loadTimeoutRef.current = window.setTimeout(() => {
      setLoadError(createLoadError('timeout', currentUrl));
      setIsLoading(false);
      loadTimeoutRef.current = null;
    }, BROWSER_LOAD_TIMEOUT_MS);

    return () => {
      clearLoadTimeout();
    };
  }, [currentEntry.mode, currentUrl, isLoading, loadError, frameNonce]);

  const handleAddressSubmit = (event) => {
    event.preventDefault();
    navigateFromInput(inputUrl);
  };

  const handleHomeSearchSubmit = (event) => {
    event.preventDefault();
    if (!homeSearchQuery.trim()) return;
    navigateFromInput(homeSearchQuery);
  };

  const handleIframeLoad = () => {
    clearLoadTimeout();

    if (isInspectableIframeUrl(currentUrl)) {
      const href = iframeRef.current?.contentWindow?.location?.href;
      if (!href || href === 'about:blank') {
        setLoadError(createLoadError('blank', currentUrl));
        setIsLoading(false);
        return;
      }
    }

    setLoadError(null);
    setIsLoading(false);
  };

  const handleIframeError = () => {
    clearLoadTimeout();
    setLoadError(createLoadError('failed', currentUrl));
    setIsLoading(false);
  };

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

      <form className="yoctol-search-form" onSubmit={handleHomeSearchSubmit}>
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
        <button type="button" className="yoctol-inline-link" onClick={() => navigateFromInput('example.com')}>
          Naar voorbeeldsite
        </button>
        <span className="yoctol-links-separator">|</span>
        <button type="button" className="yoctol-inline-link" onClick={() => navigateFromInput('https://duckduckgo.com/')}>
          Open zoekmachine
        </button>
        <span className="yoctol-links-separator">|</span>
        <button type="button" className="yoctol-inline-link" onClick={() => navigateFromInput('web browsers history')}>
          Zoek nostalgie
        </button>
      </div>

      <div className="yoctol-services">
        {BOOKMARKS.map((bookmark) => (
          <button
            key={bookmark.name}
            type="button"
            className="yoctol-service-box"
            onClick={() => {
              if (bookmark.mode === 'home') {
                navigateHome();
                return;
              }
              navigateFromInput(bookmark.url);
            }}
          >
            <strong>{bookmark.name}</strong>
            <span>{bookmark.mode === 'home' ? 'Lokale startpagina' : bookmark.url}</span>
          </button>
        ))}
      </div>

      <div className="yoctol-footer">
        Yoctol Startpagina - rustig, bruikbaar en zonder spam.
      </div>
    </div>
  );

  const renderErrorPage = () => (
    <div className="browser-error-page">
      <div className="browser-error-card">
        <div className="browser-error-badge">!</div>
        <h2>{loadError?.title || 'Pagina kan niet worden weergegeven'}</h2>
        <p>{loadError?.message || 'Internet Adventurer kon deze pagina niet laden.'}</p>
        <div className="browser-error-url">{currentUrl}</div>
        <div className="browser-error-actions">
          <button type="button" className="yoctol-btn" onClick={retryCurrentPage}>
            Opnieuw proberen
          </button>
          <button type="button" className="browser-secondary-btn" onClick={openExternally}>
            Extern openen
          </button>
          <button type="button" className="browser-secondary-btn" onClick={navigateHome}>
            Startpagina
          </button>
        </div>
      </div>
    </div>
  );

  const renderPage = () => (
    <div className="browser-page-view">
      <iframe
        key={`${currentUrl}-${frameNonce}`}
        ref={iframeRef}
        src={currentUrl}
        className="browser-page-frame"
        title={`Internet Adventurer - ${currentUrl}`}
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />
      {isLoading && (
        <div className="browser-loading-overlay">
          <div className="browser-loading-card">
            <div className="browser-loading-title">Pagina laden...</div>
            <div className="browser-loading-url">{currentUrl}</div>
          </div>
        </div>
      )}
    </div>
  );

  const statusText = loadError
    ? 'Pagina kan niet worden weergegeven'
    : (isLoading ? 'Laden...' : 'Gereed');

  return (
    <div className="browser-container">
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
          onClick={() => openHistoryEntry(historyIndex - 1)}
          title="Terug"
          aria-label="Terug"
          disabled={!canGoBack}
        >
          &lt;
        </button>
        <button
          type="button"
          className="browser-nav-btn"
          onClick={() => openHistoryEntry(historyIndex + 1)}
          title="Vooruit"
          aria-label="Vooruit"
          disabled={!canGoForward}
        >
          &gt;
        </button>
        <button
          type="button"
          className="browser-nav-btn"
          onClick={stopLoading}
          title="Stop"
          aria-label="Stop"
          disabled={!isLoading}
        >
          X
        </button>
        <button
          type="button"
          className="browser-nav-btn"
          onClick={refreshCurrentPage}
          title="Vernieuwen"
          aria-label="Vernieuwen"
        >
          R
        </button>
        <button
          type="button"
          className="browser-nav-btn"
          onClick={navigateHome}
          title="Startpagina"
          aria-label="Startpagina"
        >
          H
        </button>

        <form className="browser-address-bar" onSubmit={handleAddressSubmit}>
          <span className="browser-address-label">Adres</span>
          <input
            type="text"
            className="browser-address-input"
            value={inputUrl}
            onChange={(event) => setInputUrl(event.target.value)}
            aria-label="Adresbalk"
          />
          <button type="submit" className="browser-go-btn">
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
            onClick={() => {
              if (bookmark.mode === 'home') {
                navigateHome();
                return;
              }
              navigateFromInput(bookmark.url);
            }}
          >
            {bookmark.name}
          </button>
        ))}
      </div>

      <div className={`browser-content browser-content--${contentState}`}>
        {contentState === 'home' && renderHomePage()}
        {contentState === 'page' && renderPage()}
        {contentState === 'error' && renderErrorPage()}
      </div>

      <div className="browser-status-bar">
        <div className="browser-status-text">{statusText}</div>
        <div className="browser-status-zone">
          <span>{getOriginLabel(currentUrl)}</span>
          <span>{getConnectionLabel(currentUrl)}</span>
        </div>
      </div>
    </div>
  );
}

export default BrowserPane;
