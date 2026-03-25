import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import BrowserPane, {
  BROWSER_RESIZE_DEBOUNCE_MS,
  BROWSER_WHEEL_COALESCE_MS,
  normalizeBrowserInput
} from './BrowserPane';
import {
  CLIENT_BINARY_OPCODE,
  FRAME_MIME_CODE,
  SERVER_BINARY_OPCODE
} from './browser/browserProtocol';

var mockPixelListeners = [];
var mockPixelStore = {};
var mockPixelBlockNodes = new Map();
var mockPixelsMapNode = {
  on: jest.fn((callback) => {
    mockPixelListeners.push(callback);
    Object.entries(mockPixelStore).forEach(([blockId, data]) => callback(data, blockId));
  }),
  off: jest.fn()
};
var mockPixelsRootNode = {
  get: jest.fn((blockId) => {
    if (!mockPixelBlockNodes.has(blockId)) {
      mockPixelBlockNodes.set(blockId, { put: jest.fn() });
    }
    return mockPixelBlockNodes.get(blockId);
  }),
  map: jest.fn(() => mockPixelsMapNode),
  off: jest.fn()
};
var mockGenericNode = {
  get: jest.fn(() => mockGenericNode),
  map: jest.fn(() => ({ on: jest.fn(), off: jest.fn() })),
  on: jest.fn(),
  off: jest.fn(),
  put: jest.fn()
};
var mockGun = {
  get: jest.fn((key) => (key === 'PIXELS_GRID' ? mockPixelsRootNode : mockGenericNode))
};

function mockEmitPixelBlock(blockId, data) {
  if (data) {
    mockPixelStore[blockId] = data;
  } else {
    delete mockPixelStore[blockId];
  }
  mockPixelListeners.forEach((listener) => listener(data, blockId));
}

jest.mock('../../gun', () => {
  return {
    gun: {
      get: (...args) => mockGun.get(...args)
    },
    user: {
      is: { alias: 'alice@example.com' },
      get: jest.fn(() => mockGenericNode)
    },
    __pixelsMock: {
      emitPixelBlock: mockEmitPixelBlock,
      getBlockNode(blockId) {
        return mockPixelsRootNode.get(blockId);
      },
      reset() {
        Object.keys(mockPixelStore).forEach((blockId) => delete mockPixelStore[blockId]);
        mockPixelListeners.splice(0, mockPixelListeners.length);
        mockPixelBlockNodes.clear();
        mockGun.get.mockClear();
        mockPixelsMapNode.on.mockClear();
        mockPixelsMapNode.off.mockClear();
        mockPixelsRootNode.get.mockClear();
        mockPixelsRootNode.map.mockClear();
        mockPixelsRootNode.off.mockClear();
      }
    }
  };
});

jest.mock('./internal/chablo/ChabloPhaserStage', () => function MockChabloPhaserStage(props) {
  return <div data-testid="mock-chablo-phaser-stage">{props.currentRoomMeta.name}</div>;
});

function createStatePayload(state) {
  return {
    sessionId: state.sessionId,
    url: state.url,
    title: state.title,
    canGoBack: false,
    canGoForward: false,
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
    url: 'yoctol://home',
    title: 'Yoctol Startpagina',
    viewportWidth: 320,
    viewportHeight: 240,
    lastError: null,
    isLoading: false,
    frameVersion: 0,
    frameMimeType: 'image/jpeg',
    hasFreshFrame: false,
    nextNavigateError: null
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

  const completeNavigation = (socket, url, title) => {
    state.url = url;
    state.title = title;
    state.isLoading = false;
    state.lastError = state.nextNavigateError;
    state.nextNavigateError = null;
    state.frameVersion += 1;
    state.hasFreshFrame = !state.lastError;

    emitState(socket);
    if (!state.lastError) {
      emitFrame(socket, `navigate-${state.frameVersion}`);
    }
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
          return;
        }

        if (message.type === 'browser.command') {
          if (message.payload.action === 'navigate') {
            completeNavigation(this, message.payload.url, `Title ${message.payload.url}`);
            return;
          }

          if (message.payload.action === 'reload') {
            state.lastError = null;
            state.isLoading = false;
            state.hasFreshFrame = true;
            state.frameVersion += 1;
            emitState(this);
            emitFrame(this, `reload-${state.frameVersion}`);
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
          state.frameVersion += 1;
          state.hasFreshFrame = true;
          emitState(this);
          emitFrame(this, `resize-${state.frameVersion}`);
          return;
        }

        if (message.type === 'browser.input.key' || message.type === 'browser.input.text' || message.type === 'browser.input.paste') {
          state.frameVersion += 1;
          state.hasFreshFrame = true;
          emitState(this);
          emitFrame(this, `input-${state.frameVersion}`);
        }
        return;
      }

      const decoded = decodeClientPacket(data);
      binaryPackets.push(decoded);

      if (decoded.type === 'click' || decoded.type === 'dblclick' || decoded.type === 'wheel') {
        state.frameVersion += 1;
        state.hasFreshFrame = true;
        emitState(this);
        emitFrame(this, `${decoded.type}-${state.frameVersion}`);
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
  const { __pixelsMock } = require('../../gun');
  const originalResizeObserver = global.ResizeObserver;
  const originalWebSocket = global.WebSocket;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  let getContextSpy;

  beforeEach(() => {
    let objectUrlCounter = 0;
    __pixelsMock.reset();
    getContextSpy = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      strokeRect: jest.fn()
    }));
    URL.createObjectURL = jest.fn(() => `blob:frame-${++objectUrlCounter}`);
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    getContextSpy.mockRestore();
    global.ResizeObserver = originalResizeObserver;
    global.WebSocket = originalWebSocket;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('normalizes home, internal and external targets', () => {
    expect(normalizeBrowserInput('startpagina')).toEqual({
      kind: 'home',
      title: 'Yoctol Startpagina',
      url: 'yoctol://home'
    });

    expect(normalizeBrowserInput('pixels.chatlon')).toEqual({
      kind: 'internal',
      internalSiteId: 'pixels',
      title: 'Pixels.chatlon',
      url: 'https://pixels.chatlon/'
    });

    expect(normalizeBrowserInput('example.com')).toEqual({
      kind: 'external',
      title: 'https://example.com/',
      url: 'https://example.com/'
    });
  });

  test('keeps home and internal pages local and boots the websocket only for external pages', async () => {
    const socketMock = createBrowserSocketMock();
    global.WebSocket = socketMock.MockWebSocket;

    render(<BrowserPane currentUser="alice" />);

    expect(screen.getByText(/Yoctol Startpagina/i)).toBeInTheDocument();
    expect(socketMock.instances).toHaveLength(0);

    const addressBar = screen.getByLabelText('Adresbalk');
    fireEvent.change(addressBar, { target: { value: 'myspace.chatlon' } });
    fireEvent.submit(addressBar.closest('form'));

    await screen.findByRole('heading', { name: 'alice' });
    expect(socketMock.instances).toHaveLength(0);

    fireEvent.change(addressBar, { target: { value: 'pixels.chatlon' } });
    fireEvent.submit(addressBar.closest('form'));

    await screen.findByText('Pixels.chatlon');
    expect(socketMock.instances).toHaveLength(0);

    fireEvent.change(addressBar, { target: { value: 'chablo.motel' } });
    fireEvent.submit(addressBar.closest('form'));

    await screen.findByRole('heading', { name: 'Receptie' });
    expect(socketMock.instances).toHaveLength(0);

    fireEvent.change(addressBar, { target: { value: 'example.com' } });
    fireEvent.submit(addressBar.closest('form'));

    await waitFor(() => {
      expect(socketMock.instances).toHaveLength(1);
    });
    await screen.findByAltText('Internet Adventurer - https://example.com/');
  });

  test('uses hybrid history for home, internal and external pages', async () => {
    const socketMock = createBrowserSocketMock();

    URL.createObjectURL = jest.fn(() => 'blob:frame-1');
    URL.revokeObjectURL = jest.fn();
    global.WebSocket = socketMock.MockWebSocket;

    render(<BrowserPane currentUser="alice" />);

    const addressBar = screen.getByLabelText('Adresbalk');

    fireEvent.change(addressBar, { target: { value: 'pixels.chatlon' } });
    fireEvent.submit(addressBar.closest('form'));
    await screen.findByText('Pixels.chatlon');

    fireEvent.change(addressBar, { target: { value: 'example.com' } });
    fireEvent.submit(addressBar.closest('form'));
    await screen.findByAltText('Internet Adventurer - https://example.com/');

    fireEvent.click(screen.getByRole('button', { name: 'Terug' }));
    await screen.findByText('Pixels.chatlon');

    fireEvent.click(screen.getByRole('button', { name: 'Terug' }));
    await screen.findByText(/Yoctol Startpagina/i);

    fireEvent.click(screen.getByRole('button', { name: 'Vooruit' }));
    await screen.findByText('Pixels.chatlon');

    fireEvent.click(screen.getByRole('button', { name: 'Vooruit' }));
    await screen.findByAltText('Internet Adventurer - https://example.com/');

    const navigateMessages = socketMock.textMessages.filter((message) => (
      message.type === 'browser.command'
      && message.payload.action === 'navigate'
      && message.payload.url === 'https://example.com/'
    ));
    expect(navigateMessages).toHaveLength(2);
  });

  test('keeps internal pages usable even when the browser socket is unavailable', async () => {
    global.WebSocket = class FailingSocket {
      constructor() {
        throw new Error('socket should not boot for local pages');
      }
    };

    render(<BrowserPane currentUser="alice" />);

    fireEvent.click(screen.getByRole('button', { name: 'Pixels' }));

    await screen.findByText('Pixels.chatlon');
    expect(screen.queryByRole('heading', { name: 'Browserserver niet bereikbaar' })).toBeNull();
  });

  test('shows an inline remote error page and opens externally for external pages', async () => {
    const socketMock = createBrowserSocketMock();
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    URL.createObjectURL = jest.fn(() => 'blob:frame-1');
    URL.revokeObjectURL = jest.fn();
    global.WebSocket = socketMock.MockWebSocket;
    socketMock.setNextNavigateError('Remote timeout while loading page.');

    render(<BrowserPane currentUser="alice" />);

    const addressBar = screen.getByLabelText('Adresbalk');
    fireEvent.change(addressBar, { target: { value: 'https://example.com/' } });
    fireEvent.submit(addressBar.closest('form'));

    await screen.findByRole('heading', { name: 'Pagina kan niet worden weergegeven' });
    fireEvent.click(screen.getByRole('button', { name: 'Extern openen' }));

    expect(openSpy).toHaveBeenCalledWith('https://example.com/', '_blank', 'noopener,noreferrer');
  });

  test('preserves a specific server error when the socket closes afterwards', async () => {
    const socketMock = createBrowserSocketMock();

    URL.createObjectURL = jest.fn(() => 'blob:frame-1');
    URL.revokeObjectURL = jest.fn();
    global.WebSocket = socketMock.MockWebSocket;

    render(<BrowserPane currentUser="alice" />);

    const addressBar = screen.getByLabelText('Adresbalk');
    fireEvent.change(addressBar, { target: { value: 'example.com' } });
    fireEvent.submit(addressBar.closest('form'));

    await screen.findByAltText('Internet Adventurer - https://example.com/');

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

    const { container } = render(<BrowserPane currentUser="alice" />);

    const content = container.querySelector('.browser-content');
    content.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 900,
      height: 540,
      right: 900,
      bottom: 540
    });

    fireEvent.change(screen.getByLabelText('Adresbalk'), { target: { value: 'example.com' } });
    fireEvent.submit(screen.getByLabelText('Adresbalk').closest('form'));

    await flushMicrotasks();
    await waitFor(() => {
      expect(screen.getByAltText('Internet Adventurer - https://example.com/')).toBeInTheDocument();
    });

    await act(async () => {
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

    const surface = screen.getByLabelText('Remote browser oppervlak');
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

    render(<BrowserPane currentUser="alice" />);

    fireEvent.change(screen.getByLabelText('Adresbalk'), { target: { value: 'example.com' } });
    fireEvent.submit(screen.getByLabelText('Adresbalk').closest('form'));
    await flushMicrotasks();

    const initialImage = await screen.findByAltText('Internet Adventurer - https://example.com/');
    expect(initialImage.getAttribute('src')).toBe('blob:frame-1');

    socketMock.closeFromServer(0);
    await advance(250);
    await flushMicrotasks();

    await waitFor(() => {
      expect(socketMock.instances).toHaveLength(2);
    });

    const refreshedImage = await screen.findByAltText('Internet Adventurer - https://example.com/');
    expect(refreshedImage.getAttribute('src')).toBe('blob:frame-2');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:frame-1');
  });
});
