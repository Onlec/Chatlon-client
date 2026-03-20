import React from 'react';
import { act, render } from '@testing-library/react';
import LigerBootSequence from './LigerBootSequence';

jest.mock('../../../contexts/ScanlinesContext', () => ({
  useScanlinesPreference: () => ({
    scanlinesEnabled: true
  })
}));

describe('LigerBootSequence', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    sessionStorage.clear();
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: jest.fn().mockResolvedValue(undefined)
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  test('advances through post, darwin and liger stages before completing', () => {
    const onBootComplete = jest.fn();
    const { container, getByText } = render(<LigerBootSequence onBootComplete={onBootComplete} />);

    expect(container.firstChild).toHaveAttribute('data-stage', 'post');

    act(() => {
      jest.advanceTimersByTime(3500);
    });

    expect(container.firstChild).toHaveAttribute('data-stage', 'darwin');

    act(() => {
      jest.advanceTimersByTime(120);
    });

    expect(container.querySelectorAll('.liger-darwin__line').length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(2600);
    });

    expect(container.firstChild).toHaveAttribute('data-stage', 'liger');
    expect(getByText('Liger')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(3300);
    });

    expect(sessionStorage.getItem('chatlon_boot_complete')).toBe('true');
    expect(onBootComplete).toHaveBeenCalledTimes(1);
  });
});
