import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import LigerDock from './LigerDock';

describe('LigerDock', () => {
  test('opens dock app items through their click handler', () => {
    const onClick = jest.fn();

    render(
      <LigerDock
        appItems={[
          {
            key: 'contacts',
            icon: '\u{1F4AC}',
            label: 'Chatlon Messenger',
            isRunning: true,
            isActive: false,
            onClick
          }
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /chatlon messenger/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('renders minimized windows only when present and restores them on click', () => {
    const onRestore = jest.fn();

    render(
      <LigerDock
        appItems={[
          {
            key: 'notepad',
            icon: '\u{1F4DD}',
            label: 'Teksteditor',
            isRunning: true,
            isActive: false,
            onClick: jest.fn()
          }
        ]}
        minimizedItems={[
          {
            key: 'conv_alice',
            icon: '\u{1F4AC}',
            label: 'Alice - Gesprek',
            isActive: false,
            onClick: onRestore
          }
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /alice - gesprek/i }));
    expect(onRestore).toHaveBeenCalledTimes(1);
  });

  test('keeps the trash as the last dock item', () => {
    const { container } = render(
      <LigerDock
        appItems={[
          {
            key: 'contacts',
            icon: '\u{1F4AC}',
            label: 'Chatlon Messenger',
            isRunning: true,
            isActive: false,
            onClick: jest.fn()
          }
        ]}
        minimizedItems={[
          {
            key: 'conv_alice',
            icon: '\u{1F4AC}',
            label: 'Alice - Gesprek',
            isActive: false,
            onClick: jest.fn()
          }
        ]}
      />
    );

    const dock = container.querySelector('.liger-dock');
    expect(dock.lastElementChild).toHaveTextContent('Prullenmand');
  });
});
