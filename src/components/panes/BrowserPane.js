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

function BrowserPane({ currentUser = 'guest' }) {
  const apiBaseUrl = resolveBrowserApiBaseUrl();
  const {
    addressEditingRef,
    browserState,
    contentState,
    currentUrl,
    homeSearchQuery,
    inputUrl,
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
    sessionId,
    sendJsonInput: (...args) => transportRef.current.sendJsonInput(...args),
    sendBinaryMessage: (...args) => transportRef.current.sendBinaryMessage(...args)
  });

  const transport = useBrowserTransport({
    apiBaseUrl,
    currentUser,
    contentSize,
    browserState,
    sessionId,
    applyRemoteState,
    setTransportError,
    setBrowserState
  });

  useEffect(() => {
    transportRef.current = {
      sendJsonInput: transport.sendJsonInput,
      sendBinaryMessage: transport.sendBinaryMessage
    };
  }, [transport.sendBinaryMessage, transport.sendJsonInput]);

  const navigateEntry = useCallback((entry) => {
    if (entry.mode === 'home') {
      transport.sendCommand('home');
      return;
    }

    transport.sendCommand('navigate', { url: entry.url });
  }, [transport]);

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

  const openExternally = useCallback(() => {
    if (!currentUrl || currentUrl === BROWSER_HOME_URL || typeof window === 'undefined') return;
    window.open(currentUrl, '_blank', 'noopener,noreferrer');
  }, [currentUrl]);

  return (
    <div className="browser-container">
      <BrowserChrome
        addressEditingRef={addressEditingRef}
        browserState={browserState}
        currentUrl={currentUrl}
        inputUrl={inputUrl}
        sessionId={sessionId}
        setInputUrl={setInputUrl}
        onAddressSubmit={handleAddressSubmit}
        onBack={() => transport.sendCommand('back')}
        onForward={() => transport.sendCommand('forward')}
        onHome={() => transport.sendCommand('home')}
        onNavigateEntry={navigateEntry}
        onRefresh={() => transport.sendCommand('reload')}
        onStop={() => transport.sendCommand('stop')}
      />

      <BrowserSurface
        browserState={browserState}
        contentRef={contentRef}
        contentState={contentState}
        currentUrl={currentUrl}
        frameSrc={transport.frameSrc}
        homeSearchQuery={homeSearchQuery}
        sessionId={sessionId}
        setHomeSearchQuery={setHomeSearchQuery}
        surfaceHandlers={surfaceHandlers}
        visibleError={visibleError}
        onGoHome={() => transport.sendCommand('home')}
        onHomeSearchSubmit={handleHomeSearchSubmit}
        onNavigateEntry={navigateEntry}
        onNavigateFromInput={navigateFromInput}
        onOpenExternally={openExternally}
        onRetry={() => transport.sendCommand('reload')}
      />

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
export {
  BROWSER_HOME_URL,
  BROWSER_RESIZE_DEBOUNCE_MS,
  BROWSER_WHEEL_COALESCE_MS,
  normalizeBrowserInput
};
