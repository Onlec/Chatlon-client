import { useCallback, useEffect, useRef, useState } from 'react';
import { parseFramePacket } from './browserProtocol';
import {
  BROWSER_RESIZE_DEBOUNCE_MS,
  resolveBrowserSocketUrl
} from './browserShared';

const RECONNECT_DELAYS_MS = [250, 500, 1000, 2000, 3000];

function createTransportMessage(type, payload = {}, requestId) {
  const message = { type, payload };
  if (requestId) {
    message.requestId = requestId;
  }
  return JSON.stringify(message);
}

function closeSocket(socket) {
  if (!socket) return;

  socket.onopen = () => {};
  socket.onmessage = () => {};
  socket.onerror = () => {};
  socket.onclose = () => {};

  try {
    socket.close();
  } catch {}
}

export function useBrowserTransport({
  apiBaseUrl,
  sessionId,
  currentUser,
  contentSize,
  browserState,
  applyRemoteState,
  setTransportError,
  setBrowserState
}) {
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const generationRef = useRef(0);
  const reconnectAttemptRef = useRef(0);
  const latestContentSizeRef = useRef(contentSize);
  const latestSessionIdRef = useRef(sessionId);
  const receivedReadyRef = useRef(false);
  const currentFrameUrlRef = useRef('');
  const currentFrameVersionRef = useRef(0);
  const previousSessionIdRef = useRef(null);

  const [frameSrc, setFrameSrc] = useState('');
  const hasInitialContentSize = Boolean(contentSize);

  useEffect(() => {
    latestContentSizeRef.current = contentSize;
  }, [contentSize]);

  useEffect(() => {
    latestSessionIdRef.current = sessionId;
  }, [sessionId]);

  const revokeFrameUrl = useCallback((url) => {
    if (!url) return;
    if (typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(url);
    }
  }, []);

  const replaceFrameUrl = useCallback((nextUrl) => {
    const previousUrl = currentFrameUrlRef.current;
    currentFrameUrlRef.current = nextUrl;
    setFrameSrc(nextUrl);
    if (previousUrl && previousUrl !== nextUrl) {
      revokeFrameUrl(previousUrl);
    }
  }, [revokeFrameUrl]);

  useEffect(() => {
    const previousSessionId = previousSessionIdRef.current;
    previousSessionIdRef.current = sessionId;

    if (previousSessionId && sessionId && previousSessionId !== sessionId) {
      currentFrameVersionRef.current = 0;
      replaceFrameUrl('');
    }

    if (!sessionId) {
      currentFrameVersionRef.current = 0;
    }
  }, [replaceFrameUrl, sessionId]);

  useEffect(() => {
    currentFrameVersionRef.current = 0;
    replaceFrameUrl('');
  }, [apiBaseUrl, currentUser, replaceFrameUrl]);

  const sendTextMessage = useCallback((type, payload = {}, requestId) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(createTransportMessage(type, payload, requestId));
    return true;
  }, []);

  const sendBinaryMessage = useCallback((packet) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(packet);
    return true;
  }, []);

  const sendCommand = useCallback((action, payload = {}) => {
    if (!latestSessionIdRef.current) return false;
    return sendTextMessage('browser.command', { action, ...payload });
  }, [sendTextMessage]);

  const sendJsonInput = useCallback((type, payload = {}) => {
    if (!latestSessionIdRef.current) return false;
    return sendTextMessage(type, payload);
  }, [sendTextMessage]);

  useEffect(() => {
    if (!hasInitialContentSize) return undefined;
    if (typeof WebSocket === 'undefined') {
      setTransportError(new Error('WebSocket wordt niet ondersteund in deze browser.'));
      return undefined;
    }

    let disposed = false;
    const socketUrl = resolveBrowserSocketUrl(apiBaseUrl);
    const connectionGeneration = generationRef.current + 1;
    generationRef.current = connectionGeneration;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (disposed || generationRef.current !== connectionGeneration) {
        return;
      }

      clearReconnectTimer();
      const nextDelay = RECONNECT_DELAYS_MS[
        Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS_MS.length - 1)
      ];
      reconnectAttemptRef.current += 1;
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, nextDelay);
    };

    const handleFramePacket = (packet) => {
      const frame = parseFramePacket(packet);
      if (frame.frameVersion < currentFrameVersionRef.current) {
        return;
      }

      const blob = new Blob([frame.bytes], { type: frame.mimeType });
      const nextUrl = typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL(blob)
        : '';
      currentFrameVersionRef.current = frame.frameVersion;
      replaceFrameUrl(nextUrl);
      setBrowserState((previousState) => (
        frame.frameVersion > previousState.frameVersion
          ? {
            ...previousState,
            frameVersion: frame.frameVersion,
            frameMimeType: frame.mimeType,
            hasFreshFrame: true
          }
          : previousState
      ));
    };

    const handleTextMessage = (event, markSpecificError) => {
      let message;

      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      if (!message || typeof message.type !== 'string') {
        return;
      }

      if (message.type === 'session.ready') {
        receivedReadyRef.current = true;
        reconnectAttemptRef.current = 0;
        applyRemoteState(message.payload?.state || {});
        return;
      }

      if (message.type === 'browser.state') {
        applyRemoteState(message.payload || {});
        return;
      }

      if (message.type === 'browser.error') {
        markSpecificError();
        setTransportError(new Error(message.payload?.message || 'Onbekende browsertransportfout.'));
      }
    };

    const connect = () => {
      if (disposed || generationRef.current !== connectionGeneration) {
        return;
      }

      let socketHasSpecificError = false;
      const socket = new WebSocket(socketUrl);
      socket.binaryType = 'arraybuffer';
      socketRef.current = socket;

      socket.onopen = () => {
        if (disposed || generationRef.current !== connectionGeneration) {
          closeSocket(socket);
          return;
        }

        sendTextMessage('session.ensure', {
          userKey: currentUser || 'guest',
          sessionScope: 'browser',
          viewportWidth: latestContentSizeRef.current?.width,
          viewportHeight: latestContentSizeRef.current?.height
        });
      };

      socket.onmessage = (event) => {
        if (disposed || generationRef.current !== connectionGeneration) {
          return;
        }

        if (typeof event.data === 'string') {
          handleTextMessage(event, () => {
            socketHasSpecificError = true;
          });
          return;
        }

        if (event.data instanceof ArrayBuffer) {
          handleFramePacket(event.data);
        }
      };

      socket.onerror = () => {};

      socket.onclose = () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        if (disposed || generationRef.current !== connectionGeneration) {
          return;
        }

        if (!receivedReadyRef.current && !currentFrameUrlRef.current && !socketHasSpecificError) {
          setTransportError(new Error('NetworkError when attempting to reach browser socket.'));
        }

        scheduleReconnect();
      };
    };

    receivedReadyRef.current = false;
    reconnectAttemptRef.current = 0;
    connect();

    return () => {
      disposed = true;
      generationRef.current += 1;
      clearReconnectTimer();
      if (socketRef.current) {
        closeSocket(socketRef.current);
        socketRef.current = null;
      }
    };
  }, [
    apiBaseUrl,
    applyRemoteState,
    currentUser,
    hasInitialContentSize,
    replaceFrameUrl,
    sendTextMessage,
    setBrowserState,
    setTransportError
  ]);

  useEffect(() => {
    if (!sessionId || !contentSize) return undefined;
    if (
      browserState.viewportWidth === contentSize.width
      && browserState.viewportHeight === contentSize.height
    ) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      sendJsonInput('browser.input.resize', {
        viewportWidth: contentSize.width,
        viewportHeight: contentSize.height
      });
    }, BROWSER_RESIZE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    browserState.viewportHeight,
    browserState.viewportWidth,
    contentSize,
    sendJsonInput,
    sessionId
  ]);

  useEffect(() => () => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    replaceFrameUrl('');
  }, [replaceFrameUrl]);

  return {
    frameSrc,
    sendCommand,
    sendJsonInput,
    sendBinaryMessage
  };
}
