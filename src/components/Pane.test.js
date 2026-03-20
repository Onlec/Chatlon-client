import React from 'react';
import { render, screen } from '@testing-library/react';
import Pane from './Pane';

jest.mock('../utils/debug', () => ({
  log: jest.fn(),
}));

jest.mock('../paneConfig', () => ({
  paneConfig: {
    notepad: {
      defaultSize: { width: 300, height: 250 },
      minSize: { width: 250, height: 200 },
    },
  },
}));

function buildProps(overrides = {}) {
  return {
    title: 'Test pane',
    isMaximized: false,
    onMaximize: jest.fn(),
    onClose: jest.fn(),
    onMinimize: jest.fn(),
    onFocus: jest.fn(),
    zIndex: 7,
    type: 'notepad',
    onSizeChange: jest.fn(),
    onPositionChange: jest.fn(),
    ...overrides,
  };
}

describe('Pane', () => {
  test('renders pane-body between header and content', () => {
    const { container } = render(
      <Pane {...buildProps()}>
        <div data-testid="pane-child">Child</div>
      </Pane>
    );

    const innerContainer = container.querySelector('.pane-inner-container');
    const body = container.querySelector('.pane-body');
    const content = container.querySelector('.pane-content');

    expect(innerContainer).not.toBeNull();
    expect(body).not.toBeNull();
    expect(content).not.toBeNull();
    expect(innerContainer.children[1]).toBe(body);
    expect(body.firstElementChild).toBe(content);
    expect(content.firstElementChild).toBe(screen.getByTestId('pane-child'));
  });

  test('keeps maximized positioning while rendering the pane body wrapper', () => {
    const { container } = render(
      <Pane {...buildProps({ isMaximized: true })}>
        <div>Child</div>
      </Pane>
    );

    const frame = container.querySelector('.pane-frame');
    const body = container.querySelector('.pane-body');

    expect(frame).toHaveClass('pane-frame--maximized');
    expect(frame.style.position).toBe('fixed');
    expect(frame.style.width).toBe('100vw');
    expect(frame.style.height).toBe('');
    expect(body).not.toBeNull();
  });

  test('renders the liger chrome variant with stoplight controls', () => {
    const { container } = render(
      <Pane {...buildProps({ chromeVariant: 'liger' })}>
        <div>Child</div>
      </Pane>
    );

    expect(container.querySelector('.pane-frame--liger')).toBeTruthy();
    expect(container.querySelector('.pane-controls--liger')).toBeTruthy();
    expect(container.querySelector('.pane-title-section--liger')).toBeTruthy();
  });

  test('adds inactive state classes for liger panes', () => {
    const { container } = render(
      <Pane {...buildProps({ chromeVariant: 'liger', isActive: false })}>
        <div>Child</div>
      </Pane>
    );

    expect(container.querySelector('.pane-frame--liger-inactive')).toBeTruthy();
    expect(container.querySelector('.pane-header--liger-inactive')).toBeTruthy();
  });
});
