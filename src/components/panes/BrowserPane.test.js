import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import BrowserPane, {
  BROWSER_HOME_URL,
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
    viewportWidth: 1280,
    viewportHeight: 720,
    lastError: null,
    isLoading: false,
    nextNavigateError: null
  };
  const inputCalls = [];
  const requestLog = [];

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
    viewportHeight: state.viewportHeight
  });

  const pushEntry = (entry) => {
    state.history = [...state.history.slice(0, state.historyIndex + 1), entry];
    state.historyIndex = state.history.length - 1;
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
      return createJsonResponse(createStatePayload());
    }

    if (method === 'POST' && pathname === '/browser/home') {
      pushEntry({
        mode: 'home',
        url: BROWSER_HOME_URL,
        title: 'Yoctol Startpagina'
      });
      state.lastError = null;
      return createJsonResponse(createStatePayload());
    }

    if (method === 'POST' && pathname === '/browser/back') {
      if (state.historyIndex > 0) {
        state.historyIndex -= 1;
      }
      state.lastError = null;
      return createJsonResponse(createStatePayload());
    }

    if (method === 'POST' && pathname === '/browser/forward') {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex += 1;
      }
      state.lastError = null;
      return createJsonResponse(createStatePayload());
    }

    if (method === 'POST' && pathname === '/browser/reload') {
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
      }
      return createJsonResponse(createStatePayload());
    }

    return createJsonResponse({ error: 'Unknown route' }, 404);
  });

  return {
    fetchMock,
    inputCalls,
    requestLog,
    setNextNavigateError(message) {
      state.nextNavigateError = message;
    }
  };
}

describe('BrowserPane', () => {
  const originalFetch = global.fetch;
  const originalResizeObserver = global.ResizeObserver;

  afterEach(() => {
    global.fetch = originalFetch;
    global.ResizeObserver = originalResizeObserver;
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

  test('maps resize, pointer and keyboard input into remote browser API calls', async () => {
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
    });

    await waitFor(() => {
      expect(api.inputCalls.some((payload) => (
        payload.type === 'resize'
        && payload.viewportWidth === 900
        && payload.viewportHeight === 540
      ))).toBe(true);
    });

    const addressBar = screen.getByLabelText('Adresbalk');
    await act(async () => {
      fireEvent.change(addressBar, { target: { value: 'example.com' } });
      fireEvent.submit(addressBar.closest('form'));
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
      fireEvent.focus(surface);
      fireEvent.click(surface, { clientX: 110, clientY: 70, button: 0 });
      fireEvent.wheel(surface, { clientX: 210, clientY: 120, deltaY: 120 });
      fireEvent.keyDown(surface, { key: 'Enter' });
      fireEvent.keyDown(surface, { key: 'a' });
    });

    await waitFor(() => {
      expect(api.inputCalls).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'focus'
        }),
        expect.objectContaining({
          type: 'click',
          x: 225,
          y: 135,
          button: 'left'
        }),
        expect.objectContaining({
          type: 'wheel',
          x: 450,
          y: 270,
          deltaY: 120
        }),
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
  });

  test('keeps the local home alias available for the start page', () => {
    expect(normalizeBrowserInput('startpagina')).toEqual({
      mode: 'home',
      url: BROWSER_HOME_URL
    });
  });
});
