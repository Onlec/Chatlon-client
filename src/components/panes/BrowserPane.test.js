import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import BrowserPane, {
  BROWSER_HOME_URL,
  BROWSER_IDLE_POLL_MS,
  BROWSER_INTERACTIVE_POLL_MS,
  BROWSER_INTERACTIVE_WINDOW_MS,
  BROWSER_RESIZE_DEBOUNCE_MS,
  BROWSER_WHEEL_COALESCE_MS,
  normalizeBrowserInput
} from './BrowserPane';

function createJsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: () => 'application/json'
    },
    text: async () => JSON.stringify(payload)
  };
}

function createBrowserApiMock() {
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
  const inputCalls = [];
  const requestLog = [];
  const queuedStateMutations = [];

  const getCurrentEntry = () => state.history[state.historyIndex];

  const createStatePayload = () => ({
    sessionId: state.sessionId,
    url: getCurrentEntry().url,
    title: getCurrentEntry().title,
    canGoBack: state.historyIndex > 0,
    canGoForward: state.historyIndex < state.history.length - 1,
    isLoading: state.isLoading,
    lastError: state.lastError,
    viewportWidth: state.viewportWidth,
    viewportHeight: state.viewportHeight,
    frameVersion: state.frameVersion,
    frameMimeType: state.frameMimeType,
    hasFreshFrame: state.hasFreshFrame
  });

  const pushEntry = (entry) => {
    state.history = [...state.history.slice(0, state.historyIndex + 1), entry];
    state.historyIndex = state.history.length - 1;
  };

  const bumpFrame = () => {
    state.frameVersion += 1;
    state.hasFreshFrame = true;
  };

  const applyQueuedStateMutation = () => {
    const nextMutation = queuedStateMutations.shift();
    if (!nextMutation) return;
    if (typeof nextMutation === 'function') {
      nextMutation(state);
      return;
    }
    Object.assign(state, nextMutation);
  };

  const fetchMock = jest.fn(async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const parsedUrl = new URL(url, 'http://localhost');
    const pathname = parsedUrl.pathname;
    const method = (init.method || 'GET').toUpperCase();
    const body = init.body ? JSON.parse(init.body) : null;

    requestLog.push({ pathname, method, body });

    if (method === 'POST' && pathname === '/browser/session') {
      if (body?.viewportWidth) state.viewportWidth = body.viewportWidth;
      if (body?.viewportHeight) state.viewportHeight = body.viewportHeight;
      return createJsonResponse(createStatePayload());
    }

    if (method === 'GET' && pathname === `/browser/state/${state.sessionId}`) {
      applyQueuedStateMutation();
      return createJsonResponse(createStatePayload());
    }

    if (method === 'POST' && pathname === '/browser/navigate') {
      pushEntry({
        mode: 'page',
        url: body.url,
        title: `Title ${body.url}`
      });
      state.lastError = state.nextNavigateError;
      state.nextNavigateError = null;
      if (!state.lastError) {
        bumpFrame();
      }
      return createJsonResponse(createStatePayload());
    }

    if (method === 'POST' && pathname === '/browser/home') {
      pushEntry({
        mode: 'home',
        url: BROWSER_HOME_URL,
        title: 'Yoctol Startpagina'
      });
      state.lastError = null;
      bumpFrame();
      return createJsonResponse(createStatePayload());
    }

    if (method === 'POST' && pathname === '/browser/back') {
      if (state.historyIndex > 0) {
        state.historyIndex -= 1;
      }
      state.lastError = null;
      bumpFrame();
      return createJsonResponse(createStatePayload());
    }

    if (method === 'POST' && pathname === '/browser/forward') {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex += 1;
      }
      state.lastError = null;
      bumpFrame();
      return createJsonResponse(createStatePayload());
    }

    if (method === 'POST' && pathname === '/browser/reload') {
      state.lastError = null;
      bumpFrame();
      return createJsonResponse(createStatePayload());
    }

    if (method === 'POST' && pathname === '/browser/stop') {
      state.isLoading = false;
      return createJsonResponse(createStatePayload());
    }

    if (method === 'POST' && pathname === '/browser/input') {
      inputCalls.push(body);
      if (body.type === 'resize') {
        state.viewportWidth = body.viewportWidth;
        state.viewportHeight = body.viewportHeight;
        bumpFrame();
      }
      return createJsonResponse(createStatePayload());
    }

    return createJsonResponse({ error: 'Unknown route' }, 404);
  });

  return {
    fetchMock,
    inputCalls,
    requestLog,
    queueStateMutation(mutation) {
      queuedStateMutations.push(mutation);
    },
    setNextNavigateError(message) {
      state.nextNavigateError = message;
    }
  };
}

function createEventSourceMock() {
  const instances = [];

  class MockEventSource {
    constructor(url) {
      this.url = url;
      this.listeners = new Map();
      this.closed = false;
      this.onopen = null;
      this.onerror = null;
      this.onmessage = null;
      instances.push(this);
    }

    addEventListener(type, callback) {
      const callbacks = this.listeners.get(type) || new Set();
      callbacks.add(callback);
      this.listeners.set(type, callbacks);
    }

    removeEventListener(type, callback) {
      const callbacks = this.listeners.get(type);
      callbacks?.delete(callback);
    }

    emit(type, payload) {
      const event = {
        data: JSON.stringify(payload)
      };
      const callbacks = this.listeners.get(type);
      callbacks?.forEach((callback) => callback(event));
      if (type === 'message' && typeof this.onmessage === 'function') {
        this.onmessage(event);
      }
    }

    open() {
      this.onopen?.();
    }

    fail() {
      this.onerror?.(new Event('error'));
    }

    close() {
      this.closed = true;
    }
  }

  return {
    MockEventSource,
    instances
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
  const originalEventSource = global.EventSource;

  afterEach(() => {
    global.fetch = originalFetch;
    global.ResizeObserver = originalResizeObserver;
    global.EventSource = originalEventSource;
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

  test('supports single-tab remote history, bookmarks, home and refresh', async () => {
    const api = createBrowserApiMock();
    global.fetch = api.fetchMock;

    const { container } = render(<BrowserPane />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start' })).not.toBeDisabled();
    });

    const addressBar = screen.getByLabelText('Adresbalk');
    await act(async () => {
      fireEvent.change(addressBar, { target: { value: 'example.com' } });
      fireEvent.submit(addressBar.closest('form'));
    });

    await screen.findByAltText('Internet Adventurer - https://example.com/');
    expect(addressBar).toHaveValue('https://example.com/');
    expect(container.querySelector('iframe')).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Startpagina' }));
    });
    await screen.findByText(/Yoctol Startpagina/i);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Terug' }));
    });
    await screen.findByAltText('Internet Adventurer - https://example.com/');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Vooruit' }));
    });
    await screen.findByText(/Yoctol Startpagina/i);

    const bookmarksBar = within(container.querySelector('.browser-bookmarks-bar'));
    await act(async () => {
      fireEvent.click(bookmarksBar.getByRole('button', { name: 'NeverSSL' }));
    });
    await screen.findByAltText('Internet Adventurer - http://neverssl.com/');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Vernieuwen' }));
    });
    expect(api.requestLog.some((entry) => entry.pathname === '/browser/reload')).toBe(true);
  });

  test('removes the legacy spam gag flow and keeps the browser surface clean', async () => {
    const api = createBrowserApiMock();
    global.fetch = api.fetchMock;

    const { container } = render(<BrowserPane />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start' })).not.toBeDisabled();
    });

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'DuckDuckGo' })[0]);
    });
    await screen.findByAltText('Internet Adventurer - https://duckduckgo.com/');

    expect(container.querySelector('.browser-popup')).toBeNull();
    expect(container.querySelector('iframe')).toBeNull();
  });

  test('shows an inline remote error page and opens externally', async () => {
    const api = createBrowserApiMock();
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    api.setNextNavigateError('Remote timeout while loading page.');
    global.fetch = api.fetchMock;

    render(<BrowserPane />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start' })).not.toBeDisabled();
    });

    const addressBar = screen.getByLabelText('Adresbalk');
    await act(async () => {
      fireEvent.change(addressBar, { target: { value: 'https://example.com/' } });
      fireEvent.submit(addressBar.closest('form'));
    });

    await screen.findByRole('heading', { name: 'Pagina kan niet worden weergegeven' });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Extern openen' }));
    });

    expect(openSpy).toHaveBeenCalledWith('https://example.com/', '_blank', 'noopener,noreferrer');
  });

  test('refreshes the frame image only when the server frameVersion changes', async () => {
    jest.useFakeTimers();
    const api = createBrowserApiMock();
    global.fetch = api.fetchMock;

    render(<BrowserPane />);
    await flushMicrotasks();

    const addressBar = screen.getByLabelText('Adresbalk');
    await act(async () => {
      fireEvent.change(addressBar, { target: { value: 'example.com' } });
      fireEvent.submit(addressBar.closest('form'));
      await Promise.resolve();
    });

    const image = await screen.findByAltText('Internet Adventurer - https://example.com/');
    expect(image.getAttribute('src')).toContain('v=2');

    api.queueStateMutation((state) => {
      state.frameVersion = 2;
    });
    await advance(BROWSER_IDLE_POLL_MS);
    expect(screen.getByAltText('Internet Adventurer - https://example.com/').getAttribute('src')).toContain('v=2');

    api.queueStateMutation((state) => {
      state.frameVersion = 3;
    });
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Remote browser oppervlak'), {
        clientX: 40,
        clientY: 40,
        button: 0
      });
      await Promise.resolve();
    });
    await advance(BROWSER_INTERACTIVE_POLL_MS);

    expect(screen.getByAltText('Internet Adventurer - https://example.com/').getAttribute('src')).toContain('v=3');
  });

  test('uses SSE state pushes for immediate frame updates and keeps polling only as fallback', async () => {
    jest.useFakeTimers();
    const api = createBrowserApiMock();
    const eventSource = createEventSourceMock();

    global.fetch = api.fetchMock;
    global.EventSource = eventSource.MockEventSource;

    render(<BrowserPane />);
    await flushMicrotasks();

    await waitFor(() => {
      expect(eventSource.instances).toHaveLength(1);
    });

    expect(eventSource.instances[0].url).toContain('/browser/events/session-1');

    await act(async () => {
      eventSource.instances[0].open();
      await Promise.resolve();
    });

    const addressBar = screen.getByLabelText('Adresbalk');
    await act(async () => {
      fireEvent.change(addressBar, { target: { value: 'example.com' } });
      fireEvent.submit(addressBar.closest('form'));
      await Promise.resolve();
    });

    api.requestLog.length = 0;

    await act(async () => {
      eventSource.instances[0].emit('state', {
        sessionId: 'session-1',
        url: 'https://example.com/',
        title: 'Title https://example.com/',
        canGoBack: true,
        canGoForward: false,
        isLoading: false,
        lastError: null,
        viewportWidth: 320,
        viewportHeight: 240,
        frameVersion: 3,
        frameMimeType: 'image/jpeg',
        hasFreshFrame: true
      });
      await Promise.resolve();
    });

    expect(screen.getByAltText('Internet Adventurer - https://example.com/').getAttribute('src')).toContain('v=3');

    await advance(BROWSER_INTERACTIVE_POLL_MS * 2);
    expect(api.requestLog.filter((entry) => (
      entry.method === 'GET' && entry.pathname === '/browser/state/session-1'
    ))).toHaveLength(0);

    await advance(BROWSER_IDLE_POLL_MS);
    expect(api.requestLog.filter((entry) => (
      entry.method === 'GET' && entry.pathname === '/browser/state/session-1'
    ))).toHaveLength(1);
  });

  test('keeps polling quickly while a page has no fresh frame yet', async () => {
    jest.useFakeTimers();
    const api = createBrowserApiMock();
    global.fetch = api.fetchMock;

    render(<BrowserPane />);
    await flushMicrotasks();

    const addressBar = screen.getByLabelText('Adresbalk');
    await act(async () => {
      fireEvent.change(addressBar, { target: { value: 'example.com' } });
      fireEvent.submit(addressBar.closest('form'));
      await Promise.resolve();
    });

    api.requestLog.length = 0;
    api.queueStateMutation((state) => {
      state.isLoading = false;
      state.hasFreshFrame = false;
      state.frameVersion = 2;
    });

    await advance(BROWSER_INTERACTIVE_POLL_MS);
    expect(api.requestLog.filter((entry) => (
      entry.method === 'GET' && entry.pathname === '/browser/state/session-1'
    ))).toHaveLength(1);
    expect(screen.queryByText(/Remote beeld verversen/i)).toBeNull();
    expect(screen.getByText('Laden...')).toBeInTheDocument();

    api.queueStateMutation((state) => {
      state.hasFreshFrame = true;
      state.frameVersion = 3;
    });
    await advance(BROWSER_INTERACTIVE_POLL_MS);

    expect(screen.getByText('Gereed')).toBeInTheDocument();
    expect(screen.getByAltText('Internet Adventurer - https://example.com/').getAttribute('src')).toContain('v=3');
  });

  test('debounces resize updates and maps keyboard input into the remote browser API', async () => {
    jest.useFakeTimers();
    const api = createBrowserApiMock();
    const observers = [];

    global.fetch = api.fetchMock;
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

    expect(api.inputCalls.filter((payload) => payload.type === 'resize')).toHaveLength(0);
    await advance(BROWSER_RESIZE_DEBOUNCE_MS - 1);
    expect(api.inputCalls.filter((payload) => payload.type === 'resize')).toHaveLength(0);
    await advance(1);

    expect(api.inputCalls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'resize',
        viewportWidth: 900,
        viewportHeight: 540
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
      fireEvent.keyDown(surface, { key: 'Enter' });
      fireEvent.keyDown(surface, { key: 'a' });
      await Promise.resolve();
    });

    expect(api.inputCalls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'keydown',
        key: 'Enter'
      }),
      expect.objectContaining({
        type: 'type',
        text: 'a'
      })
    ]));
  });

  test('coalesces wheel input and polls quickly after local interaction before returning to idle', async () => {
    jest.useFakeTimers();
    const api = createBrowserApiMock();
    global.fetch = api.fetchMock;

    render(<BrowserPane />);
    await flushMicrotasks();

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

    api.requestLog.length = 0;

    await act(async () => {
      fireEvent.wheel(surface, { clientX: 110, clientY: 70, deltaX: 0, deltaY: 40 });
      fireEvent.wheel(surface, { clientX: 210, clientY: 120, deltaX: 5, deltaY: 80 });
      await Promise.resolve();
    });

    expect(api.inputCalls.filter((payload) => payload.type === 'wheel')).toHaveLength(0);
    await advance(BROWSER_WHEEL_COALESCE_MS);

    expect(api.inputCalls).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'wheel',
        x: 160,
        y: 120,
        deltaX: 5,
        deltaY: 120
      })
    ]));

    const stateCallCount = () => api.requestLog.filter((entry) => (
      entry.method === 'GET' && entry.pathname === '/browser/state/session-1'
    )).length;

    expect(stateCallCount()).toBe(0);
    await advance(BROWSER_INTERACTIVE_POLL_MS);
    expect(stateCallCount()).toBe(1);
    await advance(BROWSER_INTERACTIVE_POLL_MS);
    expect(stateCallCount()).toBe(2);

    await advance(BROWSER_INTERACTIVE_WINDOW_MS);
    const countAfterInteractiveWindow = stateCallCount();
    await advance(BROWSER_IDLE_POLL_MS - 1);
    expect(stateCallCount()).toBe(countAfterInteractiveWindow);
    await advance(1);
    expect(stateCallCount()).toBe(countAfterInteractiveWindow + 1);
  });

  test('keeps the local home alias available for the start page', () => {
    expect(normalizeBrowserInput('startpagina')).toEqual({
      mode: 'home',
      url: BROWSER_HOME_URL
    });
  });
});
