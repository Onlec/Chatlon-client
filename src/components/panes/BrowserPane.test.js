import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import BrowserPane, {
  BROWSER_HOME_URL,
  BROWSER_LOAD_TIMEOUT_MS,
  normalizeBrowserInput
} from './BrowserPane';

describe('BrowserPane', () => {
  afterEach(() => {
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

  test('supports single-tab history, bookmarks, home and refresh', () => {
    render(<BrowserPane />);

    const addressBar = screen.getByLabelText('Adresbalk');
    fireEvent.change(addressBar, { target: { value: 'example.com' } });
    fireEvent.submit(addressBar.closest('form'));

    const firstFrame = screen.getByTitle('Internet Adventurer - https://example.com/');
    expect(addressBar).toHaveValue('https://example.com/');
    fireEvent.load(firstFrame);

    fireEvent.click(screen.getByRole('button', { name: 'Startpagina' }));
    expect(screen.getByText(/Yoctol Startpagina/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Terug' }));
    expect(screen.getByTitle('Internet Adventurer - https://example.com/')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Vooruit' }));
    expect(screen.getByText(/Yoctol Startpagina/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'NeverSSL' }));
    const bookmarkFrame = screen.getByTitle('Internet Adventurer - http://neverssl.com/');
    fireEvent.load(bookmarkFrame);

    fireEvent.click(screen.getByRole('button', { name: 'Vernieuwen' }));
    const refreshedFrame = screen.getByTitle('Internet Adventurer - http://neverssl.com/');
    expect(refreshedFrame).not.toBe(bookmarkFrame);
  });

  test('does not spawn legacy spam popups during interaction', () => {
    const { container } = render(<BrowserPane />);

    fireEvent.click(container.querySelector('.browser-content'));
    fireEvent.click(screen.getByRole('button', { name: 'Yoctol Home' }));
    fireEvent.click(screen.getByRole('button', { name: 'DuckDuckGo' }));

    expect(container.querySelector('.browser-popup')).toBeNull();
  });

  test('shows an inline error page and opens externally after timeout', () => {
    jest.useFakeTimers();
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    render(<BrowserPane />);

    const addressBar = screen.getByLabelText('Adresbalk');
    fireEvent.change(addressBar, { target: { value: 'https://example.com/' } });
    fireEvent.submit(addressBar.closest('form'));

    act(() => {
      jest.advanceTimersByTime(BROWSER_LOAD_TIMEOUT_MS + 1);
    });

    expect(screen.getByText('Pagina reageert niet op tijd')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Extern openen' }));
    expect(openSpy).toHaveBeenCalledWith('https://example.com/', '_blank', 'noopener,noreferrer');
  });

  test('shows an inline error page for a same-origin blank iframe load', () => {
    render(<BrowserPane />);

    const addressBar = screen.getByLabelText('Adresbalk');
    fireEvent.change(addressBar, { target: { value: 'http://localhost/test-page' } });
    fireEvent.submit(addressBar.closest('form'));

    const frame = screen.getByTitle('Internet Adventurer - http://localhost/test-page');
    Object.defineProperty(frame, 'contentWindow', {
      configurable: true,
      value: {
        location: {
          href: 'about:blank'
        }
      }
    });

    fireEvent.load(frame);

    expect(screen.getByText('Pagina lijkt geblokkeerd')).toBeInTheDocument();
  });

  test('keeps the local home alias available for the start page', () => {
    expect(normalizeBrowserInput('startpagina')).toEqual({
      mode: 'home',
      url: BROWSER_HOME_URL
    });
  });
});
