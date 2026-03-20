import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

jest.mock('../contexts/SettingsContext', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.createContext(null),
  };
});

import ToastNotification from './ToastNotification';
import SettingsContext from '../contexts/SettingsContext';

function renderWithVariant(ui, appearanceVariant = 'dx') {
  return render(
    <SettingsContext.Provider value={{ appearanceVariant }}>
      {ui}
    </SettingsContext.Provider>
  );
}

describe('ToastNotification', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('adds the liger modifier class when rendered in liger mode', () => {
    const { container } = renderWithVariant(
      <ToastNotification
        toast={{ id: 'toast-1', from: 'Alice', message: 'Hallo', avatar: '/avatar.png', type: 'message' }}
        onClose={jest.fn()}
        onClick={jest.fn()}
      />,
      'liger'
    );

    expect(container.querySelector('.toast-notification--liger')).toBeInTheDocument();
  });

  test('closes through the close button without invoking the click handler', () => {
    const onClose = jest.fn();
    const onClick = jest.fn();

    renderWithVariant(
      <ToastNotification
        toast={{ id: 'toast-2', from: 'Alice', message: 'Ping', avatar: '/avatar.png', type: 'message' }}
        onClose={onClose}
        onClick={onClick}
      />,
      'liger'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sluiten' }));
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(onClose).toHaveBeenCalledWith('toast-2');
    expect(onClick).not.toHaveBeenCalled();
  });
});
