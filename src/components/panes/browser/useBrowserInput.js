import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BROWSER_WHEEL_COALESCE_MS,
  DEFAULT_VIEWPORT,
  isPrintableKey,
  measureViewport,
  MIN_VIEWPORT,
  normalizeRemoteKey
} from './browserShared';
import {
  encodeClickPacket,
  encodeDoubleClickPacket,
  encodeMovePacket,
  encodeWheelPacket
} from './browserProtocol';

function clampCoordinate(value, max) {
  return Math.max(0, Math.min(max - 1, value));
}

function mapMouseButton(button) {
  if (button === 1) return 1;
  if (button === 2) return 2;
  return 0;
}

export function useBrowserInput({
  browserState,
  sessionId,
  sendJsonInput,
  sendBinaryMessage
}) {
  const contentRef = useRef(null);
  const wheelAccumulatorRef = useRef(null);
  const wheelFlushTimerRef = useRef(null);

  const [contentSize, setContentSize] = useState(null);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return undefined;

    const updateSize = () => {
      const nextSize = measureViewport(element);
      setContentSize((previous) => (
        previous && previous.width === nextSize.width && previous.height === nextSize.height
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

  const mapPointerPosition = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const viewportWidth = browserState.viewportWidth || DEFAULT_VIEWPORT.width;
    const viewportHeight = browserState.viewportHeight || DEFAULT_VIEWPORT.height;
    const x = Math.round(((event.clientX - rect.left) / Math.max(rect.width, 1)) * viewportWidth);
    const y = Math.round(((event.clientY - rect.top) / Math.max(rect.height, 1)) * viewportHeight);

    return {
      x: clampCoordinate(x, Math.max(MIN_VIEWPORT.width, viewportWidth)),
      y: clampCoordinate(y, Math.max(MIN_VIEWPORT.height, viewportHeight))
    };
  }, [browserState.viewportHeight, browserState.viewportWidth]);

  const flushWheelInput = useCallback(() => {
    const payload = wheelAccumulatorRef.current;
    wheelAccumulatorRef.current = null;

    if (wheelFlushTimerRef.current) {
      window.clearTimeout(wheelFlushTimerRef.current);
      wheelFlushTimerRef.current = null;
    }

    if (!payload) return;
    sendBinaryMessage(encodeWheelPacket(payload.deltaX, payload.deltaY));
  }, [sendBinaryMessage]);

  const handlePointerAction = useCallback((type, event) => {
    if (!sessionId) return;

    if (type === 'wheel') {
      event.preventDefault();
      const previous = wheelAccumulatorRef.current;
      wheelAccumulatorRef.current = previous
        ? {
          deltaX: previous.deltaX + (event.deltaX || 0),
          deltaY: previous.deltaY + (event.deltaY || 0)
        }
        : {
          deltaX: event.deltaX || 0,
          deltaY: event.deltaY || 0
        };

      if (!wheelFlushTimerRef.current) {
        wheelFlushTimerRef.current = window.setTimeout(flushWheelInput, BROWSER_WHEEL_COALESCE_MS);
      }
      return;
    }

    const position = mapPointerPosition(event);
    const button = mapMouseButton(event.button);

    if (type === 'click') {
      sendBinaryMessage(encodeClickPacket(position.x, position.y, button));
      return;
    }

    if (type === 'dblclick') {
      sendBinaryMessage(encodeDoubleClickPacket(position.x, position.y, button));
    }
  }, [flushWheelInput, mapPointerPosition, sendBinaryMessage, sessionId]);

  const handleMouseMove = useCallback((event) => {
    if (!sessionId || event.buttons === 0) return;
    const position = mapPointerPosition(event);
    sendBinaryMessage(encodeMovePacket(position.x, position.y));
  }, [mapPointerPosition, sendBinaryMessage, sessionId]);

  const handleFocus = useCallback(() => {
    if (!sessionId) return;
    sendJsonInput('browser.input.focus', {});
  }, [sendJsonInput, sessionId]);

  const handleKeyDown = useCallback((event) => {
    if (!sessionId) return;

    if (isPrintableKey(event)) {
      event.preventDefault();
      sendJsonInput('browser.input.text', {
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
    sendJsonInput('browser.input.key', {
      action: 'down',
      key: normalizeRemoteKey(event.key)
    });
  }, [sendJsonInput, sessionId]);

  const handlePaste = useCallback((event) => {
    if (!sessionId) return;

    const pastedText = event.clipboardData?.getData('text/plain') || '';
    if (!pastedText) return;

    event.preventDefault();
    sendJsonInput('browser.input.paste', {
      text: pastedText
    });
  }, [sendJsonInput, sessionId]);

  useEffect(() => () => {
    if (wheelFlushTimerRef.current) {
      window.clearTimeout(wheelFlushTimerRef.current);
      wheelFlushTimerRef.current = null;
    }
  }, []);

  return {
    contentRef,
    contentSize,
    surfaceHandlers: {
      onFocus: handleFocus,
      onClick: (event) => handlePointerAction('click', event),
      onDoubleClick: (event) => handlePointerAction('dblclick', event),
      onWheel: (event) => handlePointerAction('wheel', event),
      onMouseMove: handleMouseMove,
      onKeyDown: handleKeyDown,
      onPaste: handlePaste
    }
  };
}
