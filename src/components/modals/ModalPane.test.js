import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
const mockPlaySound = jest.fn();

jest.mock('../../contexts/SettingsContext', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.createContext(null),
  };
});

jest.mock('../../hooks/useSounds', () => ({
  useSounds: () => ({
    playSound: mockPlaySound,
  }),
}));

import ModalPane from './ModalPane';
import SettingsContext from '../../contexts/SettingsContext';

function renderWithVariant(ui, appearanceVariant = 'dx') {
  return render(
    <SettingsContext.Provider value={{ appearanceVariant }}>
      {ui}
    </SettingsContext.Provider>
  );
}

describe('ModalPane', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPlaySound.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('renders the liger modal variant classes', () => {
    const { container } = renderWithVariant(
      <ModalPane title="Voorkeuren" onClose={jest.fn()}>
        <div>Inhoud</div>
      </ModalPane>,
      'liger'
    );

    expect(container.querySelector('.modal-pane-overlay--liger')).toBeInTheDocument();
    expect(container.querySelector('.modal-pane-window--liger')).toBeInTheDocument();
    expect(container.querySelector('.modal-pane-titlebar--liger')).toBeInTheDocument();
  });

  test('flashes the titlebar when the overlay is clicked', () => {
    const { container } = renderWithVariant(
      <ModalPane title="Voorkeuren" onClose={jest.fn()}>
        <div>Inhoud</div>
      </ModalPane>,
      'liger'
    );

    fireEvent.mouseDown(container.querySelector('.modal-pane-overlay'));

    expect(container.querySelector('.modal-pane-titlebar--flashing')).toBeInTheDocument();
    expect(mockPlaySound).toHaveBeenCalledWith('error');

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(container.querySelector('.modal-pane-titlebar--flashing')).not.toBeInTheDocument();
  });
});
