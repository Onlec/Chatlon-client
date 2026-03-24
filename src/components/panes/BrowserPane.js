import React, { useEffect, useRef, useState } from 'react';

export const BROWSER_HOME_URL = 'yoctol://home';
export const BROWSER_SEARCH_BASE_URL = 'https://duckduckgo.com/?q=';
export const BROWSER_STATE_POLL_MS = 1200;

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
const DEFAULT_VIEWPORT = { width: 1280, height: 720 };

const BOOKMARKS = [
  { name: 'Yoctol Home', mode: 'home', url: BROWSER_HOME_URL },
  { name: 'Example', url: 'https://example.com/' },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com/' },
  { name: 'NeverSSL', url: 'http://neverssl.com/' },
  { name: 'Wikipedia', url: 'https://www.wikipedia.org/' },
  { name: 'Archive.org', url: 'https://archive.org/' }
];

function buildSearchUrl(query) {
  return `${BROWSER_SEARCH_BASE_URL}${encodeURIComponent(query)}`;
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

function stripGunSuffix(value) {
  return value.replace(/\/gun\/?$/i, '').replace(/\/+$/, '');
}

function createClientError(title, message) {
  return { title, message };
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
  if (!url || url === BROWSER_HOME_URL) return 'Remote browser gereed';
  try {
    return new URL(url).protocol === 'https:' ? 'Veilige verbinding' : 'Onbeveiligde verbinding';
  } catch {
    return 'Onbekende verbinding';
  }
}

function getDefaultBrowserState() {
  return {
    sessionId: null,
    url: BROWSER_HOME_URL,
    title: 'Yoctol Startpagina',
    canGoBack: false,
    canGoForward: false,
    isLoading: false,
    lastError: null,
    viewportWidth: DEFAULT_VIEWPORT.width,
    viewportHeight: DEFAULT_VIEWPORT.height
  };
}

function isPrintableKey(event) {
  return (
    event.key.length === 1
    && !event.ctrlKey
    && !event.metaKey
    && !event.altKey
  );
}

function normalizeRemoteKey(key) {
  if (key === ' ') return 'Space';
  if (key === 'Esc') return 'Escape';
  return key;
}

export function resolveBrowserApiBaseUrl() {
  const configuredUrl = process.env.REACT_APP_BROWSER_SERVER_URL || process.env.REACT_APP_GUN_URL;
  if (configuredUrl) {
    return stripGunSuffix(configuredUrl);
  }

  if (typeof window !== 'undefined') {
    return stripGunSuffix(window.location.origin);
  }

  return '';
}

export function normalizeBrowserInput(rawValue) {
  const trimmed = (rawValue || '').trim();

  if (HOME_ALIASES.has(trimmed.toLowerCase())) {
    return {
      mode: 'home',
      url: BROWSER_HOME_URL
    };
  }

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return {
          mode: 'page',
          url: parsed.toString()
        };
      }
    } catch {
      return {
        mode: 'page',
        url: buildSearchUrl(trimmed)
      };
    }

    return {
      mode: 'page',
      url: buildSearchUrl(trimmed)
    };
  }

  if (looksLikeUrlWithoutScheme(trimmed)) {
    return {
      mode: 'page',
      url: new URL(`${getDefaultProtocol(trimmed)}${trimmed}`).toString()
    };
  }

  return {
    mode: 'page',
    url: buildSearchUrl(trimmed)
  };
}

function BrowserPane({ currentUser = 'guest' }) {
  const apiBaseUrl = resolveBrowserApiBaseUrl();
  const contentRef = useRef(null);
  const addressEditingRef = useRef(false);
  const [browserState, setBrowserState] = useState(getDefaultBrowserState);
  const [sessionId, setSessionId] = useState(null);
  const [inputUrl, setInputUrl] = useState(BROWSER_HOME_URL);
  const [clientError, setClientError] = useState(null);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [frameVersion, setFrameVersion] = useState(0);
  const [contentSize, setContentSize] = useState(DEFAULT_VIEWPORT);

  const currentUrl = browserState.url || BROWSER_HOME_URL;
  const contentState = clientError || browserState.lastError
    ? 'error'
    : (currentUrl === BROWSER_HOME_URL ? 'home' : 'page');
  const visibleError = clientError || (browserState.lastError
    ? createClientError('Pagina kan niet worden weergegeven', browserState.lastError)
    : null);

  const updateFromRemoteState = (nextState, options = {}) => {
    const { bumpFrame = false } = options;
    setClientError(null);
    setBrowserState(nextState);
    setSessionId(nextState.sessionId || null);
    if (!addressEditingRef.current) {
      setInputUrl(nextState.url || BROWSER_HOME_URL);
    }
    if (bumpFrame && nextState.url !== BROWSER_HOME_URL) {
      setFrameVersion((value) => value + 1);
    }
  };

  const requestJson = async (path, options = {}) => {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: options.method || 'GET',
      headers: options.body
        ? { 'Content-Type': 'application/json' }
        : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const text = await response.text();
    let payload = {};

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { error: text };
      }
    }

    if (!response.ok) {
      throw new Error(payload.error || `Browser request failed (${response.status}).`);
    }

    return payload;
  };

  const handleTransportError = (error) => {
    setClientError(createClientError(
      'Browserserver niet bereikbaar',
      error?.message || 'De remote browser kon niet worden bereikt.'
    ));
  };

  const performAction = async (path, body = {}, options = {}) => {
    const { bumpFrame = true } = options;

    if (!sessionId) return;

    try {
      const nextState = await requestJson(path, {
        method: 'POST',
        body: {
          sessionId,
          ...body
        }
      });
      updateFromRemoteState(nextState, { bumpFrame });
    } catch (error) {
      handleTransportError(error);
    }
  };

  const sendInput = async (payload, options = {}) => {
    const { captureState = false, bumpFrame = true } = options;

    if (!sessionId) return;

    try {
      const nextState = await requestJson('/browser/input', {
        method: 'POST',
        body: {
          sessionId,
          ...payload
        }
      });

      if (captureState) {
        updateFromRemoteState(nextState, { bumpFrame });
      } else {
        setClientError(null);
        if (bumpFrame && currentUrl !== BROWSER_HOME_URL) {
          setFrameVersion((value) => value + 1);
        }
      }
    } catch (error) {
      handleTransportError(error);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const bootSession = async () => {
      try {
        const nextState = await requestJson('/browser/session', {
          method: 'POST',
          body: {
            userKey: currentUser || 'guest',
            sessionScope: 'browser',
            viewportWidth: contentSize.width,
            viewportHeight: contentSize.height
          }
        });

        if (!cancelled) {
          updateFromRemoteState(nextState, { bumpFrame: true });
        }
      } catch (error) {
        if (!cancelled) {
          handleTransportError(error);
        }
      }
    };

    bootSession();

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, currentUser]);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return undefined;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      const nextSize = {
        width: Math.max(320, Math.round(rect.width) || DEFAULT_VIEWPORT.width),
        height: Math.max(240, Math.round(rect.height) || DEFAULT_VIEWPORT.height)
      };

      setContentSize((previous) => (
        previous.width === nextSize.width && previous.height === nextSize.height
          ? previous
          : nextSize
      ));
    };

    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        updateSize();
      });
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!sessionId) return undefined;

    let cancelled = false;

    const syncState = async () => {
      try {
        const nextState = await requestJson(`/browser/state/${sessionId}`);
        if (!cancelled) {
          updateFromRemoteState(nextState, { bumpFrame: true });
        }
      } catch (error) {
        if (!cancelled) {
          handleTransportError(error);
        }
      }
    };

    syncState();
    const timer = window.setInterval(syncState, BROWSER_STATE_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [apiBaseUrl, sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    sendInput({
      type: 'resize',
      viewportWidth: contentSize.width,
      viewportHeight: contentSize.height
    }, {
      captureState: true,
      bumpFrame: false
    });
  }, [contentSize.height, contentSize.width, sessionId]);

  const navigateEntry = (entry) => {
    if (entry.mode === 'home') {
      performAction('/browser/home');
      return;
    }

    performAction('/browser/navigate', { url: entry.url });
  };

  const navigateFromInput = (rawValue) => {
    const entry = normalizeBrowserInput(rawValue);
    addressEditingRef.current = false;
    setInputUrl(entry.url);
    navigateEntry(entry);
  };

  const refreshCurrentPage = () => {
    performAction('/browser/reload');
  };

  const retryCurrentPage = () => {
    performAction('/browser/reload');
  };

  const stopLoading = () => {
    performAction('/browser/stop', {}, { bumpFrame: false });
  };

  const openExternally = () => {
    if (!currentUrl || currentUrl === BROWSER_HOME_URL || typeof window === 'undefined') return;
    window.open(currentUrl, '_blank', 'noopener,noreferrer');
  };

  const handleAddressSubmit = (event) => {
    event.preventDefault();
    navigateFromInput(inputUrl);
  };

  const handleHomeSearchSubmit = (event) => {
    event.preventDefault();
    if (!homeSearchQuery.trim()) return;
    navigateFromInput(homeSearchQuery);
  };

  const mapPointerPosition = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const viewportWidth = browserState.viewportWidth || DEFAULT_VIEWPORT.width;
    const viewportHeight = browserState.viewportHeight || DEFAULT_VIEWPORT.height;
    const x = Math.round(((event.clientX - rect.left) / Math.max(rect.width, 1)) * viewportWidth);
    const y = Math.round(((event.clientY - rect.top) / Math.max(rect.height, 1)) * viewportHeight);

    return {
      x: Math.max(0, Math.min(viewportWidth - 1, x)),
      y: Math.max(0, Math.min(viewportHeight - 1, y))
    };
  };

  const mapMouseButton = (button) => {
    if (button === 1) return 'middle';
    if (button === 2) return 'right';
    return 'left';
  };

  const handlePointerAction = (type, event) => {
    if (!sessionId) return;

    if (type === 'wheel') {
      event.preventDefault();
      sendInput({
        type,
        ...mapPointerPosition(event),
        deltaX: event.deltaX,
        deltaY: event.deltaY
      });
      return;
    }

    sendInput({
      type,
      ...mapPointerPosition(event),
      button: mapMouseButton(event.button)
    });
  };

  const handleKeyDown = (event) => {
    if (!sessionId) return;

    if (isPrintableKey(event)) {
      event.preventDefault();
      sendInput({
        type: 'type',
        text: event.key
      });
      return;
    }

    const supportedKeys = new Set([
      'Enter',
      'Backspace',
      'Tab',
      'Escape',
      'Delete',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Home',
      'End',
      'PageUp',
      'PageDown'
    ]);

    if (!supportedKeys.has(event.key)) return;

    event.preventDefault();
    sendInput({
      type: 'keydown',
      key: normalizeRemoteKey(event.key)
    });
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
            onClick={() => navigateEntry(bookmark.mode === 'home'
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
          <button type="button" className="yoctol-btn" onClick={retryCurrentPage}>
            Opnieuw proberen
          </button>
          <button
            type="button"
            className="browser-secondary-btn"
            onClick={openExternally}
            disabled={currentUrl === BROWSER_HOME_URL}
          >
            Extern openen
          </button>
          <button type="button" className="browser-secondary-btn" onClick={() => performAction('/browser/home')}>
            Startpagina
          </button>
        </div>
      </div>
    </div>
  );

  const renderPage = () => (
    <div className="browser-page-view">
      <div
        className="browser-remote-surface"
        role="application"
        tabIndex={0}
        aria-label="Remote browser oppervlak"
        onFocus={() => sendInput({ type: 'focus' }, { bumpFrame: false })}
        onClick={(event) => handlePointerAction('click', event)}
        onDoubleClick={(event) => handlePointerAction('dblclick', event)}
        onWheel={(event) => handlePointerAction('wheel', event)}
        onMouseMove={(event) => {
          if (event.buttons !== 0) {
            sendInput({
              type: 'move',
              ...mapPointerPosition(event)
            }, {
              bumpFrame: false
            });
          }
        }}
        onKeyDown={handleKeyDown}
      >
        {sessionId && (
          <img
            src={`${apiBaseUrl}/browser/frame/${sessionId}?v=${frameVersion}`}
            className="browser-page-frame"
            alt={`Internet Adventurer - ${currentUrl}`}
            draggable="false"
          />
        )}
      </div>
      {browserState.isLoading && (
        <div className="browser-loading-overlay">
          <div className="browser-loading-card">
            <div className="browser-loading-title">Remote pagina laden...</div>
            <div className="browser-loading-url">{currentUrl}</div>
          </div>
        </div>
      )}
    </div>
  );

  const statusText = visibleError
    ? 'Pagina kan niet worden weergegeven'
    : (browserState.isLoading ? 'Laden...' : 'Gereed');

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
          onClick={() => performAction('/browser/back')}
          title="Terug"
          aria-label="Terug"
          disabled={!browserState.canGoBack}
        >
          &lt;
        </button>
        <button
          type="button"
          className="browser-nav-btn"
          onClick={() => performAction('/browser/forward')}
          title="Vooruit"
          aria-label="Vooruit"
          disabled={!browserState.canGoForward}
        >
          &gt;
        </button>
        <button
          type="button"
          className="browser-nav-btn"
          onClick={stopLoading}
          title="Stop"
          aria-label="Stop"
          disabled={!browserState.isLoading}
        >
          X
        </button>
        <button
          type="button"
          className="browser-nav-btn"
          onClick={refreshCurrentPage}
          title="Vernieuwen"
          aria-label="Vernieuwen"
          disabled={!sessionId}
        >
          R
        </button>
        <button
          type="button"
          className="browser-nav-btn"
          onClick={() => performAction('/browser/home')}
          title="Startpagina"
          aria-label="Startpagina"
          disabled={!sessionId}
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
            onClick={() => navigateEntry(bookmark.mode === 'home'
              ? { mode: 'home', url: BROWSER_HOME_URL }
              : { mode: 'page', url: bookmark.url })}
            disabled={!sessionId}
          >
            {bookmark.name}
          </button>
        ))}
      </div>

      <div ref={contentRef} className={`browser-content browser-content--${contentState}`}>
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
