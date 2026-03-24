import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import BrowserPane, {
  BROWSER_HOME_URL,
  BROWSER_RESIZE_DEBOUNCE_MS,
  BROWSER_WHEEL_COALESCE_MS,
  normalizeBrowserInput
} from './BrowserPane';
import {
  CLIENT_BINARY_OPCODE,
  FRAME_MIME_CODE,
  SERVER_BINARY_OPCODE
} from './browser/browserProtocol';

function createStatePayload(state) {
  const currentEntry = state.history[state.historyIndex];
  return {
    sessionId: state.sessionId,
    url: currentEntry.url,
    title: currentEntry.title,
    canGoBack: state.historyIndex > 0,
    canGoForward: state.historyIndex < state.history.length - 1,
    isLoading: state.isLoading,
    lastError: state.lastError,
    viewportWidth: state.viewportWidth,
    viewportHeight: state.viewportHeight,
    frameVersion: state.frameVersion,
    frameMimeType: state.frameMimeType,
    hasFreshFrame: state.hasFreshFrame
  };
}

function decodeClientPacket(packet) {
  const bytes = packet instanceof ArrayBuffer ? packet : packet.buffer.slice(
    packet.byteOffset,
    packet.byteOffset + packet.byteLength
  );
  const view = new DataView(bytes);
  const opcode = view.getUint8(0);
  const payloadLength = view.getUint16(1, true);

  if (opcode === CLIENT_BINARY_OPCODE.MOVE) {
    return {
      opcode,
      payloadLength,
      type: 'move',
      x: view.getUint16(3, true),
      y: view.getUint16(5, true)
    };
  }

  if (opcode === CLIENT_BINARY_OPCODE.WHEEL) {
    return {
      opcode,
      payloadLength,
      type: 'wheel',
      deltaX: view.getInt16(3, true),
      deltaY: view.getInt16(5, true)
    };
  }

  return {
    opcode,
    payloadLength,
    type: opcode === CLIENT_BINARY_OPCODE.CLICK ? 'click' : 'dblclick',
    x: view.getUint16(3, true),
    y: view.getUint16(5, true),
    button: view.getUint8(7)
  };
}

function encodeFramePacket(frameVersion, label) {
  const payload = Uint8Array.from(Buffer.from(label));
  const bytes = new Uint8Array(6 + payload.length);
  const view = new DataView(bytes.buffer);
  view.setUint8(0, SERVER_BINARY_OPCODE.FRAME);
  view.setUint32(1, frameVersion, true);
  view.setUint8(5, FRAME_MIME_CODE.JPEG);
  bytes.set(payload, 6);
  return bytes.buffer;
}

function createBrowserSocketMock() {
  const instances = [];
  const textMessages = [];
  const binaryPackets = [];

  const state = {
    sessionId: 'session-1',
    history: [
      {
        mode: 'home',
        url: BROWSER_HOME_URL,
        title: 'Yoctol Startpagina'
      }
    ],
    historyIndex: 0,
    viewportWidth: 320,
    viewportHeight: 240,
    lastError: null,
    isLoading: false,
    frameVersion: 1,
    frameMimeType: 'image/jpeg',
    hasFreshFrame: true,
    nextNavigateError: null
  };

  const pushEntry = (entry) => {
    state.history = [...state.history.slice(0, state.historyIndex + 1), entry];
    state.historyIndex = state.history.length - 1;
  };

  const emitState = (socket, type = 'browser.state') => {
    socket.onmessage?.({
      data: JSON.stringify({
        type,
        payload: createStatePayload(state)
      })
    });
  };

  const emitFrame = (socket, label = `frame-${state.frameVersion}`) => {
    socket.onmessage?.({
      data: encodeFramePacket(state.frameVersion, label)
    });
  };

  const bumpFrame = (socket, label) => {
    state.frameVersion += 1;
    state.hasFreshFrame = true;
    emitState(socket);
    emitFrame(socket, label);
  };

  class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    constructor(url) {
      this.url = url;
      this.readyState = MockWebSocket.CONNECTING;
      this.binaryType = 'blob';
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;
      this.onclose = null;
      instances.push(this);

      Promise.resolve().then(() => {
        if (this.readyState !== MockWebSocket.CONNECTING) return;
        this.readyState = MockWebSocket.OPEN;
        this.onopen?.({});
      });
    }

    send(data) {
      if (typeof data === 'string') {
        const message = JSON.parse(data);
        textMessages.push(message);

        if (message.type === 'session.ensure') {
          state.viewportWidth = message.payload.viewportWidth;
          state.viewportHeight = message.payload.viewportHeight;
          this.onmessage?.({
            data: JSON.stringify({
              type: 'session.ready',
              payload: {
                state: createStatePayload(state)
              }
            })
          });
          emitFrame(this, 'home-1');
          return;
        }

        if (message.type === 'browser.command') {
          if (message.payload.action === 'navigate') {
            pushEntry({
              mode: 'page',
              url: message.payload.url,
              title: `Title ${message.payload.url}`
            });
            state.lastError = state.nextNavigateError;
            state.nextNavigateError = null;
            if (state.lastError) {
              emitState(this);
            } else {
              bumpFrame(this, `navigate-${state.frameVersion}`);
            }
            return;
          }

          if (message.payload.action === 'home') {
            pushEntry({
              mode: 'home',
              url: BROWSER_HOME_URL,
              title: 'Yoctol Startpagina'
            });
            state.lastError = null;
            bumpFrame(this, `home-${state.frameVersion}`);
            return;
          }

          if (message.payload.action === 'back') {
            if (state.historyIndex > 0) {
              state.historyIndex -= 1;
            }
            state.lastError = null;
            bumpFrame(this, `back-${state.frameVersion}`);
            return;
          }

          if (message.payload.action === 'forward') {
            if (state.historyIndex < state.history.length - 1) {
              state.historyIndex += 1;
            }
            state.lastError = null;
            bumpFrame(this, `forward-${state.frameVersion}`);
            return;
          }

          if (message.payload.action === 'reload') {
            state.lastError = null;
            bumpFrame(this, `reload-${state.frameVersion}`);
            return;
          }

          if (message.payload.action === 'stop') {
            state.isLoading = false;
            emitState(this);
          }
          return;
        }

        if (message.type === 'browser.input.resize') {
          state.viewportWidth = message.payload.viewportWidth;
          state.viewportHeight = message.payload.viewportHeight;
          bumpFrame(this, `resize-${state.frameVersion}`);
          return;
        }

        if (message.type === 'browser.input.key') {
          bumpFrame(this, `key-${state.frameVersion}`);
          return;
        }

        if (message.type === 'browser.input.text') {
          bumpFrame(this, `text-${state.frameVersion}`);
          return;
        }

        if (message.type === 'browser.input.paste') {
          bumpFrame(this, `paste-${state.frameVersion}`);
          return;
        }

        return;
      }

      const decoded = decodeClientPacket(data);
      binaryPackets.push(decoded);

      if (decoded.type === 'click' || decoded.type === 'dblclick' || decoded.type === 'wheel') {
        bumpFrame(this, `${decoded.type}-${state.frameVersion}`);
      }
    }

    close() {
      this.readyState = MockWebSocket.CLOSED;
      this.onclose?.({});
    }
  }

  return {
    MockWebSocket,
    instances,
    textMessages,
    binaryPackets,
    setNextNavigateError(message) {
      state.nextNavigateError = message;
    },
    closeFromServer(index = 0) {
      const socket = instances[index];
      if (!socket) return;
      socket.readyState = MockWebSocket.CLOSED;
      socket.onclose?.({});
    },
    emitServerError(message, code = 'BROWSER_SOCKET_ERROR', index = 0) {
      const socket = instances[index];
      if (!socket) return;
      socket.onmessage?.({
        data: JSON.stringify({
          type: 'browser.error',
          payload: {
            code,
            message,
            recoverable: true
          }
        })
      });
    }
  };
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function advance(ms) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

describe('BrowserPane', () => {
  const originalFetch = global.fetch;
  const originalResizeObserver = global.ResizeObserver;
  const originalWebSocket = global.WebSocket;
  const originalEventSource = global.EventSource;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  afterEach(() => {
    global.fetch = originalFetch;
    global.ResizeObserver = originalResizeObserver;
    global.WebSocket = originalWebSocket;
    global.EventSource = originalEventSource;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('normalizes bare domains to https', () => {
    expect(normalizeBrowserInput('example.com')).toEqual({
      mode: 'page',
      url: 'https://example.com/'
    });
  });

  test('turns free text into a DuckDuckGo search URL', () => {
    expect(normalizeBrowserInput('open source chat')).toEqual({
      mode: 'page',
      url: 'https://duckduckgo.com/?q=open%20source%20chat'
    });
  });

  test('keeps the local home alias available for the start page', () => {
    expect(normalizeBrowserInput('startpagina')).toEqual({
      mode: 'home',
      url: BROWSER_HOME_URL
    });
  });

  test('uses websocket transport only and keeps the browser surface free of iframe spam', async () => {
    const socketMock = createBrowserSocketMock();
    const fetchSpy = jest.fn(() => Promise.reject(new Error('fetch should not be called')));
    const eventSourceSpy = jest.fn(() => {
      throw new Error('EventSource should not be constructed');
    });

    let objectUrlCounter = 0;
    URL.createObjectURL = jest.fn(() => `blob:frame-${++objectUrlCounter}`);
    URL.revokeObjectURL = jest.fn();
    global.fetch = fetchSpy;
    global.WebSocket = socketMock.MockWebSocket;
    global.EventSource = eventSourceSpy;

    const { container } = render(<BrowserPane />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start' })).not.toBeDisabled();
    });

    expect(socketMock.instances).toHaveLength(1);
    expect(socketMock.instances[0].url).toMatch(/\/browser\/socket$/);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(eventSourceSpy).not.toHaveBeenCalled();
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('.browser-popup')).toBeNull();
  });

  test('supports remote history, bookmarks, home and refresh over websocket', async () => {
    const socketMock = createBrowserSocketMock();

    let objectUrlCounter = 0;
    URL.createObjectURL = jest.fn(() => `blob:frame-${++objectUrlCounter}`);
    URL.revokeObjectURL = jest.fn();
    global.WebSocket = socketMock.MockWebSocket;

    const { container } = render(<BrowserPane />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start' })).not.toBeDisabled();
    });

    const addressBar = screen.getByLabelText('Adresbalk');
    await act(async () => {
      fireEvent.change(addressBar, { target: { value: 'example.com' } });
      fireEvent.submit(addressBar.closest('form'));
      await Promise.resolve();
    });

    await screen.findByAltText('Internet Adventurer - https://example.com/');
    expect(addressBar).toHaveValue('https://example.com/');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Startpagina' }));
      await Promise.resolve();
    });
    await screen.findByText(/Yoctol Startpagina/i);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Terug' }));
      await Promise.resolve();
    });
    await screen.findByAltText('Internet Adventurer - https://example.com/');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Vooruit' }));
      await Promise.resolve();
    });
    await screen.findByText(/Yoctol Startpagina/i);

    const bookmarksBar = within(container.querySelector('.browser-bookmarks-bar'));
    await act(async () => {
      fireEvent.click(bookmarksBar.getByRole('button', { name: 'NeverSSL' }));
      await Promise.resolve();
    });
    await screen.findByAltText('Internet Adventurer - http://neverssl.com/');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Vernieuwen' }));
      await Promise.resolve();
    });

    expect(socketMock.textMessages.some((message) => (
      message.type === 'browser.command' && message.payload.action === 'reload'
    ))).toBe(true);
  });

  test('shows an inline remote error page and opens externally', async () => {
    const socketMock = createBrowserSocketMock();
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    URL.createObjectURL = jest.fn(() => 'blob:frame-1');
    URL.revokeObjectURL = jest.fn();
    global.WebSocket = socketMock.MockWebSocket;
    socketMock.setNextNavigateError('Remote timeout while loading page.');

    render(<BrowserPane />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start' })).not.toBeDisabled();
    });

    const addressBar = screen.getByLabelText('Adresbalk');
    await act(async () => {
      fireEvent.change(addressBar, { target: { value: 'https://example.com/' } });
      fireEvent.submit(addressBar.closest('form'));
      await Promise.resolve();
    });

    await screen.findByRole('heading', { name: 'Pagina kan niet worden weergegeven' });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Extern openen' }));
    });

    expect(openSpy).toHaveBeenCalledWith('https://example.com/', '_blank', 'noopener,noreferrer');
  });

  test('preserves a specific server error when the socket closes afterwards', async () => {
    const socketMock = createBrowserSocketMock();

    URL.createObjectURL = jest.fn(() => 'blob:frame-1');
    URL.revokeObjectURL = jest.fn();
    global.WebSocket = socketMock.MockWebSocket;

    render(<BrowserPane />);
    await flushMicrotasks();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start' })).not.toBeDisabled();
    });

    await act(async () => {
      socketMock.emitServerError('browserType.launch: spawn EPERM');
      socketMock.closeFromServer(0);
      await Promise.resolve();
    });

    await screen.findByRole('heading', { name: 'Remote browser kan niet opstarten' });
    expect(screen.getByText(/spawn EPERM/i)).toBeInTheDocument();
    expect(screen.queryByText(/NetworkError when attempting to reach browser socket/i)).toBeNull();
  });

  test('maps resize, keyboard, paste and binary pointer input onto the websocket transport', async () => {
    jest.useFakeTimers();
    const socketMock = createBrowserSocketMock();
    const observers = [];

    URL.createObjectURL = jest.fn(() => 'blob:frame-1');
    URL.revokeObjectURL = jest.fn();
    global.WebSocket = socketMock.MockWebSocket;
    global.ResizeObserver = class ResizeObserver {
      constructor(callback) {
        this.callback = callback;
        observers.push(this);
      }

      observe() {}

      disconnect() {}
    };

    const { container } = render(<BrowserPane />);
    await flushMicrotasks();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start' })).not.toBeDisabled();
    });

    const content = container.querySelector('.browser-content');
    content.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 900,
      height: 540,
      right: 900,
      bottom: 540
    });

    await act(async () => {
      observers.forEach((observer) => observer.callback([]));
      observers.forEach((observer) => observer.callback([]));
      await Promise.resolve();
    });

    await advance(BROWSER_RESIZE_DEBOUNCE_MS);
    expect(socketMock.textMessages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'browser.input.resize',
        payload: expect.objectContaining({
          viewportWidth: 900,
          viewportHeight: 540
        })
      })
    ]));

    const addressBar = screen.getByLabelText('Adresbalk');
    await act(async () => {
      fireEvent.change(addressBar, { target: { value: 'example.com' } });
      fireEvent.submit(addressBar.closest('form'));
      await Promise.resolve();
    });

    const surface = await screen.findByLabelText('Remote browser oppervlak');
    surface.getBoundingClientRect = () => ({
      left: 10,
      top: 20,
      width: 400,
      height: 200,
      right: 410,
      bottom: 220
    });

    await act(async () => {
      fireEvent.click(surface, { clientX: 110, clientY: 70, button: 0 });
      fireEvent.doubleClick(surface, { clientX: 210, clientY: 120, button: 0 });
      fireEvent.wheel(surface, { clientX: 110, clientY: 70, deltaX: 5, deltaY: 80 });
      fireEvent.wheel(surface, { clientX: 210, clientY: 120, deltaX: 0, deltaY: 40 });
      fireEvent.keyDown(surface, { key: 'Enter' });
      fireEvent.keyDown(surface, { key: 'a' });
      fireEvent.paste(surface, {
        clipboardData: {
          getData: (type) => (type === 'text/plain' ? 'hunter2' : '')
        }
      });
      await Promise.resolve();
    });

    await advance(BROWSER_WHEEL_COALESCE_MS);

    expect(socketMock.binaryPackets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'click',
        x: 225,
        y: 135,
        button: 0
      }),
      expect.objectContaining({
        type: 'dblclick',
        x: 450,
        y: 270,
        button: 0
      }),
      expect.objectContaining({
        type: 'wheel',
        deltaX: 5,
        deltaY: 120
      })
    ]));

    expect(socketMock.textMessages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'browser.input.key',
        payload: expect.objectContaining({
          action: 'down',
          key: 'Enter'
        })
      }),
      expect.objectContaining({
        type: 'browser.input.text',
        payload: expect.objectContaining({
          text: 'a'
        })
      }),
      expect.objectContaining({
        type: 'browser.input.paste',
        payload: expect.objectContaining({
          text: 'hunter2'
        })
      })
    ]));
  });

  test('reconnects after a socket drop and revokes replaced frame URLs', async () => {
    jest.useFakeTimers();
    const socketMock = createBrowserSocketMock();

    let objectUrlCounter = 0;
    URL.createObjectURL = jest.fn(() => `blob:frame-${++objectUrlCounter}`);
    URL.revokeObjectURL = jest.fn();
    global.WebSocket = socketMock.MockWebSocket;

    render(<BrowserPane />);
    await flushMicrotasks();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start' })).not.toBeDisabled();
    });

    const addressBar = screen.getByLabelText('Adresbalk');
    await act(async () => {
      fireEvent.change(addressBar, { target: { value: 'example.com' } });
      fireEvent.submit(addressBar.closest('form'));
      await Promise.resolve();
    });

    const initialImage = await screen.findByAltText('Internet Adventurer - https://example.com/');
    expect(initialImage.getAttribute('src')).toBe('blob:frame-2');

    socketMock.closeFromServer(0);
    await advance(250);
    await flushMicrotasks();

    await waitFor(() => {
      expect(socketMock.instances).toHaveLength(2);
    });

    const refreshedImage = await screen.findByAltText('Internet Adventurer - https://example.com/');
    expect(refreshedImage.getAttribute('src')).toBe('blob:frame-3');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:frame-2');
  });
});
