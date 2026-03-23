import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DesktopShortcuts from './DesktopShortcuts';

describe('DesktopShortcuts', () => {
  const gridConfig = {
    marginLeft: 20,
    marginTop: 20,
    cellWidth: 96,
    cellHeight: 92,
    itemWidth: 80,
    itemHeight: 72,
    bottomReserved: 30
  };

  const shortcuts = [
    {
      id: 'contacts',
      label: 'Contacts',
      icon: 'favicon.ico',
      position: { x: 20, y: 20 }
    }
  ];

  const mockWorkspaceRect = (rect) => jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function mockRect() {
    if (this.classList?.contains('shortcuts-area')) {
      return {
        x: rect.left,
        y: rect.top,
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
        toJSON: () => ({})
      };
    }
    return {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      right: 0,
      bottom: 0,
      toJSON: () => ({})
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('drag/drop commits new position via onMoveShortcut', () => {
    const onMoveShortcut = jest.fn();
    render(
      <DesktopShortcuts
        shortcuts={shortcuts}
        onOpenShortcut={() => {}}
        onRenameShortcut={() => {}}
        onShortcutContextMenu={() => {}}
        onMoveShortcut={onMoveShortcut}
        gridConfig={gridConfig}
      />
    );

    const shortcutLabel = screen.getByText('Contacts');
    const shortcutNode = shortcutLabel.closest('.shortcut');
    expect(shortcutNode).toBeTruthy();

    fireEvent.mouseDown(shortcutNode, { button: 0, clientX: 40, clientY: 40 });
    fireEvent.mouseMove(document, { clientX: 190, clientY: 190 });
    fireEvent.mouseUp(document);

    expect(onMoveShortcut).toHaveBeenCalledWith('contacts', expect.objectContaining({
      x: expect.any(Number),
      y: expect.any(Number)
    }));
  });

  test('doubleclick opens shortcut when not dragged', () => {
    const onOpenShortcut = jest.fn();
    render(
      <DesktopShortcuts
        shortcuts={shortcuts}
        onOpenShortcut={onOpenShortcut}
        onRenameShortcut={() => {}}
        onShortcutContextMenu={() => {}}
        onMoveShortcut={() => {}}
        gridConfig={gridConfig}
      />
    );

    const shortcutLabel = screen.getByText('Contacts');
    const shortcutNode = shortcutLabel.closest('.shortcut');
    fireEvent.doubleClick(shortcutNode);
    expect(onOpenShortcut).toHaveBeenCalledWith('contacts');
  });

  test('supports the liger layout variant using right-aligned positioning', () => {
    const { container } = render(
      <DesktopShortcuts
        shortcuts={shortcuts}
        onOpenShortcut={() => {}}
        onRenameShortcut={() => {}}
        onShortcutContextMenu={() => {}}
        onMoveShortcut={() => {}}
        gridConfig={gridConfig}
        layoutVariant="liger"
      />
    );

    const shortcutsArea = container.querySelector('.shortcuts-area');
    const shortcutNode = container.querySelector('.shortcut');

    expect(shortcutsArea).toHaveAttribute('data-layout', 'liger');
    expect(shortcutNode).toHaveClass('shortcut--liger');
    expect(shortcutNode.style.right).toBe('20px');
  });

  test('clamps dragged shortcuts to the visible workspace bounds', () => {
    mockWorkspaceRect({ left: 100, top: 60, width: 760, height: 400 });
    const onMoveShortcut = jest.fn();

    render(
      <DesktopShortcuts
        shortcuts={shortcuts}
        onOpenShortcut={() => {}}
        onRenameShortcut={() => {}}
        onShortcutContextMenu={() => {}}
        onMoveShortcut={onMoveShortcut}
        gridConfig={gridConfig}
      />
    );

    const shortcutNode = screen.getByText('Contacts').closest('.shortcut');

    fireEvent.mouseDown(shortcutNode, { button: 0, clientX: 140, clientY: 100 });
    fireEvent.mouseMove(document, { clientX: 3000, clientY: 3000 });
    fireEvent.mouseUp(document);

    expect(onMoveShortcut).toHaveBeenLastCalledWith('contacts', { x: 680, y: 298 });
  });

  test('renders stored shortcuts inside the visible workspace without forcing a move callback', () => {
    mockWorkspaceRect({ left: 100, top: 60, width: 760, height: 400 });
    const onMoveShortcut = jest.fn();

    const props = {
      shortcuts: [{
        ...shortcuts[0],
        position: { x: 900, y: 900 }
      }],
      onOpenShortcut: () => {},
      onRenameShortcut: () => {},
      onShortcutContextMenu: () => {},
      onMoveShortcut,
      gridConfig
    };
    const { container, rerender } = render(<DesktopShortcuts {...props} />);

    rerender(<DesktopShortcuts {...props} />);

    const shortcutNode = container.querySelector('.shortcut');

    expect(shortcutNode.style.left).toBe('680px');
    expect(shortcutNode.style.top).toBe('298px');
    expect(onMoveShortcut).not.toHaveBeenCalled();
  });
});
