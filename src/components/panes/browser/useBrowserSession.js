import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BROWSER_HOME_URL,
  createClientError,
  getDefaultBrowserState,
  normalizeRemoteState
} from './browserShared';

export function useBrowserSession({ apiBaseUrl, currentUser }) {
  const addressEditingRef = useRef(false);

  const [browserState, setBrowserState] = useState(getDefaultBrowserState);
  const [inputUrl, setInputUrl] = useState(BROWSER_HOME_URL);
  const [clientError, setClientError] = useState(null);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');

  const applyRemoteState = useCallback((nextState) => {
    const normalizedState = normalizeRemoteState(nextState);
    setClientError(null);
    setBrowserState(normalizedState);
    if (!addressEditingRef.current) {
      setInputUrl(normalizedState.url || BROWSER_HOME_URL);
    }
  }, []);

  const setTransportError = useCallback((error) => {
    const message = error?.message || 'De remote browser kon niet worden bereikt.';
    const title = /browserType\.launch|spawn EPERM|Playwright/i.test(message)
      ? 'Remote browser kan niet opstarten'
      : 'Browserserver niet bereikbaar';

    setClientError(createClientError(
      title,
      message
    ));
  }, []);

  const resetSessionState = useCallback(() => {
    setBrowserState(getDefaultBrowserState());
    setInputUrl(BROWSER_HOME_URL);
    setClientError(null);
    setHomeSearchQuery('');
    addressEditingRef.current = false;
  }, []);

  useEffect(() => {
    resetSessionState();
  }, [apiBaseUrl, currentUser, resetSessionState]);

  const currentUrl = browserState.url || BROWSER_HOME_URL;
  const visibleError = clientError || (browserState.lastError
    ? createClientError('Pagina kan niet worden weergegeven', browserState.lastError)
    : null);
  const contentState = visibleError
    ? 'error'
    : (currentUrl === BROWSER_HOME_URL ? 'home' : 'page');
  const statusText = visibleError
    ? 'Pagina kan niet worden weergegeven'
    : ((browserState.isLoading || !browserState.hasFreshFrame) ? 'Laden...' : 'Gereed');

  return {
    addressEditingRef,
    browserState,
    clientError,
    inputUrl,
    homeSearchQuery,
    currentUrl,
    visibleError,
    contentState,
    statusText,
    sessionId: browserState.sessionId || null,
    setBrowserState,
    setClientError,
    setInputUrl,
    setHomeSearchQuery,
    applyRemoteState,
    setTransportError,
    resetSessionState
  };
}
