import React, { useCallback, useEffect, useRef } from 'react';
import BrowserChrome from './browser/BrowserChrome';
import BrowserSurface from './browser/BrowserSurface';
import {
  BROWSER_HOME_URL,
  BROWSER_RESIZE_DEBOUNCE_MS,
  BROWSER_WHEEL_COALESCE_MS,
  getConnectionLabel,
  getOriginLabel,
  normalizeBrowserInput,
  resolveBrowserApiBaseUrl
} from './browser/browserShared';
import { useBrowserInput } from './browser/useBrowserInput';
import { useBrowserSession } from './browser/useBrowserSession';
import { useBrowserTransport } from './browser/useBrowserTransport';

function BrowserPane({ currentUser = 'guest', onOpenConversation }) {
  const apiBaseUrl = resolveBrowserApiBaseUrl();
  const {
    addressEditingRef,
    browserState,
    contentState,
    currentEntry,
    currentInternalSite,
    currentUrl,
    goBack,
    goForward,
    historyIndex,
    historyLength,
    homeSearchQuery,
    inputUrl,
    isExternalPage,
    navigateHome,
    navigateToEntry,
    sessionId,
    setBrowserState,
    setHomeSearchQuery,
    setInputUrl,
    applyRemoteState,
    setTransportError,
    statusText,
    visibleError
  } = useBrowserSession({ apiBaseUrl, currentUser });

  const transportRef = useRef({
    sendJsonInput: () => false,
    sendBinaryMessage: () => false
  });

  const {
    contentRef,
    contentSize,
    surfaceHandlers
  } = useBrowserInput({
    browserState,
    sessionId: isExternalPage ? sessionId : null,
    sendJsonInput: (...args) => transportRef.current.sendJsonInput(...args),
    sendBinaryMessage: (...args) => transportRef.current.sendBinaryMessage(...args)
  });

  const transport = useBrowserTransport({
    apiBaseUrl,
    enabled: isExternalPage,
    currentUser,
    contentSize,
    browserState,
    sessionId,
    applyRemoteState,
    setTransportError,
    setBrowserState
  });

  const {
    frameSrc,
    navigateToUrl,
    sendBinaryMessage,
    sendCommand,
    sendJsonInput
  } = transport;

  useEffect(() => {
    transportRef.current = {
      sendJsonInput,
      sendBinaryMessage
    };
  }, [sendBinaryMessage, sendJsonInput]);

  const navigateEntry = useCallback((entry) => {
    navigateToEntry(entry);
  }, [navigateToEntry]);

  useEffect(() => {
    if (!isExternalPage) {
      return;
    }

    navigateToUrl(currentEntry.url, { resetFrame: true });
  }, [currentEntry.id, currentEntry.url, isExternalPage, navigateToUrl]);

  const navigateFromInput = useCallback((rawValue) => {
    const entry = normalizeBrowserInput(rawValue);
    addressEditingRef.current = false;
    setInputUrl(entry.url);
    navigateEntry(entry);
  }, [addressEditingRef, navigateEntry, setInputUrl]);

  const handleAddressSubmit = useCallback((event) => {
    event.preventDefault();
    navigateFromInput(inputUrl);
  }, [inputUrl, navigateFromInput]);

  const handleHomeSearchSubmit = useCallback((event) => {
    event.preventDefault();
    if (!homeSearchQuery.trim()) return;
    navigateFromInput(homeSearchQuery);
  }, [homeSearchQuery, navigateFromInput]);

  const handleRefresh = useCallback(() => {
    if (currentEntry.kind === 'external') {
      if (!sendCommand('reload')) {
        navigateToUrl(currentEntry.url, { resetFrame: true });
      }
      return;
    }

    if (currentEntry.kind === 'home') {
      navigateHome();
      return;
    }

    navigateEntry(currentEntry);
  }, [currentEntry, navigateEntry, navigateHome, navigateToUrl, sendCommand]);

  const handleStop = useCallback(() => {
    if (currentEntry.kind !== 'external') return;
    sendCommand('stop');
  }, [currentEntry.kind, sendCommand]);

  const openExternally = useCallback(() => {
    if (currentEntry.kind !== 'external' || !currentUrl || typeof window === 'undefined') return;
    window.open(currentUrl, '_blank', 'noopener,noreferrer');
  }, [currentEntry.kind, currentUrl]);

  return (
    <div className="browser-container">
      <BrowserChrome
        addressEditingRef={addressEditingRef}
        browserState={{
          ...browserState,
          canGoBack: historyIndex > 0,
          canGoForward: historyIndex < historyLength - 1
        }}
        currentEntry={currentEntry}
        currentUrl={currentUrl}
        inputUrl={inputUrl}
        sessionId={sessionId}
        setInputUrl={setInputUrl}
        onAddressSubmit={handleAddressSubmit}
        onBack={goBack}
        onForward={goForward}
        onHome={navigateHome}
        onNavigateEntry={navigateEntry}
        onRefresh={handleRefresh}
        onStop={handleStop}
      />

      <BrowserSurface
        browserState={browserState}
        contentRef={contentRef}
        contentState={contentState}
        currentEntry={currentEntry}
        currentInternalSite={currentInternalSite}
        currentUrl={currentUrl}
        frameSrc={frameSrc}
        homeSearchQuery={homeSearchQuery}
        currentUser={currentUser}
        onOpenConversation={onOpenConversation}
        sessionId={sessionId}
        setHomeSearchQuery={setHomeSearchQuery}
        surfaceHandlers={surfaceHandlers}
        visibleError={visibleError}
        onGoHome={navigateHome}
        onHomeSearchSubmit={handleHomeSearchSubmit}
        onNavigateEntry={navigateEntry}
        onNavigateFromInput={navigateFromInput}
        onOpenExternally={openExternally}
        onRetry={handleRefresh}
      />

      <div className="browser-status-bar">
        <div className="browser-status-text">{statusText}</div>
        <div className="browser-status-zone">
          <span>{getOriginLabel(currentEntry)}</span>
          <span>{getConnectionLabel(currentEntry)}</span>
        </div>
      </div>
    </div>
  );
}

export default BrowserPane;
export {
  BROWSER_HOME_URL,
  BROWSER_RESIZE_DEBOUNCE_MS,
  BROWSER_WHEEL_COALESCE_MS,
  normalizeBrowserInput
};
