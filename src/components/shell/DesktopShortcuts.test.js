import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DesktopShortcuts from './DesktopShortcuts';

describe('DesktopShortcuts', () => {
  const shortcuts = [
    {
      id: 'contacts',
      label: 'Contacts',
      icon: 'favicon.ico',
      position: { x: 20, y: 20 }
    }
  ];

  test('drag/drop commits new position via onMoveShortcut', () => {
    const onMoveShortcut = jest.fn();
    render(
      <DesktopShortcuts
        shortcuts={shortcuts}
        onOpenShortcut={() => {}}
        onRenameShortcut={() => {}}
        onShortcutContextMenu={() => {}}
        onMoveShortcut={onMoveShortcut}
        gridConfig={{ marginLeft: 20, marginTop: 20, itemWidth: 80, itemHeight: 72, bottomReserved: 30 }}
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
        gridConfig={{ marginLeft: 20, marginTop: 20, itemWidth: 80, itemHeight: 72, bottomReserved: 30 }}
      />
    );

    const shortcutLabel = screen.getByText('Contacts');
    const shortcutNode = shortcutLabel.closest('.shortcut');
    fireEvent.doubleClick(shortcutNode);
    expect(onOpenShortcut).toHaveBeenCalledWith('contacts');
  });
});

