import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import LigerDock from './LigerDock';

describe('LigerDock', () => {
  test('opens dock items through their click handler', () => {
    const onClick = jest.fn();

    render(
      <LigerDock
        items={[
          {
            key: 'contacts',
            icon: '💬',
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
});
