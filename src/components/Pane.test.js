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

function appendWorkspaceRect(rect) {
  const workspace = document.createElement('div');
  workspace.className = 'pane-layer';
  workspace.getBoundingClientRect = () => ({
    x: rect.left,
    y: rect.top,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    toJSON: () => ({}),
  });
  document.body.appendChild(workspace);
  return workspace;
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
    const workspace = appendWorkspaceRect({ left: 24, top: 16, width: 640, height: 360 });
    const { container } = render(
      <Pane {...buildProps({ isMaximized: true })}>
        <div>Child</div>
      </Pane>
    );

    const frame = container.querySelector('.pane-frame');
    const body = container.querySelector('.pane-body');

    expect(frame).toHaveClass('pane-frame--maximized');
    expect(frame.style.position).toBe('fixed');
    expect(frame.style.left).toBe('24px');
    expect(frame.style.top).toBe('16px');
    expect(frame.style.width).toBe('640px');
    expect(frame.style.height).toBe('360px');
    expect(body).not.toBeNull();
    workspace.remove();
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
    expect(container.querySelectorAll('.liger-stoplight-symbol')).toHaveLength(3);
    expect(container.querySelectorAll('.liger-stoplight-symbol__mark')).toHaveLength(5);
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
