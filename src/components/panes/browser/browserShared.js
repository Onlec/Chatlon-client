export const BROWSER_HOME_URL = 'yoctol://home';
export const BROWSER_SEARCH_BASE_URL = 'https://duckduckgo.com/?q=';
export const BROWSER_RESIZE_DEBOUNCE_MS = 100;
export const BROWSER_WHEEL_COALESCE_MS = 32;
export const DEFAULT_VIEWPORT = { width: 1280, height: 720 };
export const MIN_VIEWPORT = { width: 320, height: 240 };
export const DEFAULT_FRAME_MIME_TYPE = 'image/jpeg';

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

export const BOOKMARKS = [
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

export function stripGunSuffix(value) {
  return value.replace(/\/gun\/?$/i, '').replace(/\/+$/, '');
}

export function createClientError(title, message) {
  return { title, message };
}

export function getOriginLabel(url) {
  if (!url || url === BROWSER_HOME_URL) return 'Lokale startpagina';
  try {
    return new URL(url).host;
  } catch {
    return 'Onbekende locatie';
  }
}

export function getConnectionLabel(url) {
  if (!url || url === BROWSER_HOME_URL) return 'Remote browser gereed';
  try {
    return new URL(url).protocol === 'https:' ? 'Veilige verbinding' : 'Onbeveiligde verbinding';
  } catch {
    return 'Onbekende verbinding';
  }
}

export function getDefaultBrowserState() {
  return {
    sessionId: null,
    url: BROWSER_HOME_URL,
    title: 'Yoctol Startpagina',
    canGoBack: false,
    canGoForward: false,
    isLoading: false,
    lastError: null,
    viewportWidth: DEFAULT_VIEWPORT.width,
    viewportHeight: DEFAULT_VIEWPORT.height,
    frameVersion: 0,
    frameMimeType: DEFAULT_FRAME_MIME_TYPE,
    hasFreshFrame: false
  };
}

export function normalizeRemoteState(nextState = {}) {
  return {
    ...getDefaultBrowserState(),
    ...nextState,
    lastError: nextState.lastError || null,
    frameMimeType: nextState.frameMimeType || DEFAULT_FRAME_MIME_TYPE,
    hasFreshFrame: Boolean(nextState.hasFreshFrame)
  };
}

export function isPrintableKey(event) {
  return (
    event.key.length === 1
    && !event.ctrlKey
    && !event.metaKey
    && !event.altKey
  );
}

export function normalizeRemoteKey(key) {
  if (key === ' ') return 'Space';
  if (key === 'Esc') return 'Escape';
  return key;
}

export function measureViewport(element) {
  const rect = element?.getBoundingClientRect?.() || {};
  return {
    width: Math.max(MIN_VIEWPORT.width, Math.round(rect.width) || 0),
    height: Math.max(MIN_VIEWPORT.height, Math.round(rect.height) || 0)
  };
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

export function resolveBrowserSocketUrl(apiBaseUrl) {
  if (!apiBaseUrl) {
    return '';
  }

  const endpoint = new URL(apiBaseUrl);
  endpoint.protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:';
  endpoint.pathname = '/browser/socket';
  endpoint.search = '';
  endpoint.hash = '';
  return endpoint.toString();
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
