import { useCallback, useEffect, useRef, useState } from 'react';
import { getInternalBrowserSiteById } from './browserInternalSites';
import {
  BROWSER_HOME_URL,
  createClientError,
  createHomeEntry,
  getDefaultBrowserState,
  normalizeRemoteState
} from './browserShared';

function sameHistoryEntry(left, right) {
  return (
    left.kind === right.kind
    && left.url === right.url
    && left.internalSiteId === right.internalSiteId
  );
}

export function useBrowserSession({ apiBaseUrl, currentUser }) {
  const addressEditingRef = useRef(false);
  const nextEntryIdRef = useRef(2);

  const [browserState, setBrowserState] = useState(getDefaultBrowserState);
  const [clientError, setClientError] = useState(null);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [inputUrl, setInputUrl] = useState(BROWSER_HOME_URL);
  const [historyState, setHistoryState] = useState(() => ({
    entries: [{ ...createHomeEntry(), id: 1 }],
    index: 0
  }));

  const currentEntry = historyState.entries[historyState.index] || { ...createHomeEntry(), id: 1 };

  const createHistoryEntry = useCallback((entry) => ({
    ...entry,
    title: entry.title || entry.url,
    id: nextEntryIdRef.current++
  }), []);

  const navigateToEntry = useCallback((entry) => {
    setHistoryState((previousState) => {
      const currentHistoryEntry = previousState.entries[previousState.index];
      if (currentHistoryEntry && sameHistoryEntry(currentHistoryEntry, entry)) {
        return previousState;
      }

      const nextEntry = createHistoryEntry(entry);
      return {
        entries: [...previousState.entries.slice(0, previousState.index + 1), nextEntry],
        index: previousState.index + 1
      };
    });
  }, [createHistoryEntry]);

  const navigateHome = useCallback(() => {
    navigateToEntry(createHomeEntry());
  }, [navigateToEntry]);

  const goBack = useCallback(() => {
    setHistoryState((previousState) => (
      previousState.index > 0
        ? { ...previousState, index: previousState.index - 1 }
        : previousState
    ));
  }, []);

  const goForward = useCallback(() => {
    setHistoryState((previousState) => (
      previousState.index < previousState.entries.length - 1
        ? { ...previousState, index: previousState.index + 1 }
        : previousState
    ));
  }, []);

  const applyRemoteState = useCallback((nextState) => {
    const normalizedState = normalizeRemoteState(nextState);
    setClientError(null);
    setBrowserState(normalizedState);
    setHistoryState((previousState) => {
      const currentHistoryEntry = previousState.entries[previousState.index];
      if (!currentHistoryEntry || currentHistoryEntry.kind !== 'external') {
        return previousState;
      }

      const nextUrl = normalizedState.url || currentHistoryEntry.url;
      const nextTitle = normalizedState.title || currentHistoryEntry.title || nextUrl;
      if (currentHistoryEntry.url === nextUrl && currentHistoryEntry.title === nextTitle) {
        return previousState;
      }

      const nextEntries = [...previousState.entries];
      nextEntries[previousState.index] = {
        ...currentHistoryEntry,
        url: nextUrl,
        title: nextTitle
      };

      return {
        ...previousState,
        entries: nextEntries
      };
    });
  }, []);

  const setTransportError = useCallback((error) => {
    const message = error?.message || 'De remote browser kon niet worden bereikt.';
    const title = /browserType\.launch|spawn EPERM|Playwright/i.test(message)
      ? 'Remote browser kan niet opstarten'
      : 'Browserserver niet bereikbaar';

    setClientError(createClientError(title, message));
  }, []);

  const resetSessionState = useCallback(() => {
    nextEntryIdRef.current = 2;
    setBrowserState(getDefaultBrowserState());
    setInputUrl(BROWSER_HOME_URL);
    setClientError(null);
    setHomeSearchQuery('');
    setHistoryState({
      entries: [{ ...createHomeEntry(), id: 1 }],
      index: 0
    });
    addressEditingRef.current = false;
  }, []);

  useEffect(() => {
    resetSessionState();
  }, [apiBaseUrl, currentUser, resetSessionState]);

  useEffect(() => {
    if (!addressEditingRef.current) {
      setInputUrl(currentEntry.url);
    }
  }, [currentEntry.url]);

  useEffect(() => {
    setClientError(null);
    setBrowserState((previousState) => {
      if (currentEntry.kind === 'external') {
        return {
          ...previousState,
          url: currentEntry.url,
          title: currentEntry.title || currentEntry.url,
          isLoading: true,
          lastError: null,
          hasFreshFrame: false
        };
      }

      return {
        ...previousState,
        url: currentEntry.url,
        title: currentEntry.title || previousState.title,
        isLoading: false,
        lastError: null
      };
    });
  }, [currentEntry.id, currentEntry.kind, currentEntry.title, currentEntry.url]);

  const isExternalPage = currentEntry.kind === 'external';
  const visibleError = isExternalPage
    ? (
      clientError
      || (browserState.lastError
        ? createClientError('Pagina kan niet worden weergegeven', browserState.lastError)
        : null)
    )
    : null;
  const contentState = visibleError
    ? 'error'
    : (currentEntry.kind === 'external' ? 'page' : currentEntry.kind);
  const statusText = visibleError
    ? 'Pagina kan niet worden weergegeven'
    : (currentEntry.kind === 'home'
      ? 'Lokale startpagina gereed'
      : (currentEntry.kind === 'internal'
        ? 'Lokale Chatlon-pagina gereed'
        : ((browserState.isLoading || !browserState.hasFreshFrame) ? 'Laden...' : 'Gereed')));

  return {
    addressEditingRef,
    browserState,
    clientError,
    contentState,
    currentEntry,
    currentInternalSite: currentEntry.kind === 'internal'
      ? getInternalBrowserSiteById(currentEntry.internalSiteId)
      : null,
    currentUrl: currentEntry.url || BROWSER_HOME_URL,
    historyIndex: historyState.index,
    historyLength: historyState.entries.length,
    homeSearchQuery,
    inputUrl,
    isExternalPage,
    sessionId: browserState.sessionId || null,
    statusText,
    visibleError,
    goBack,
    goForward,
    navigateHome,
    navigateToEntry,
    setBrowserState,
    setClientError,
    setHomeSearchQuery,
    setInputUrl,
    applyRemoteState,
    resetSessionState,
    setTransportError
  };
}
