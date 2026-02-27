import React from 'react';
import { render, screen } from '@testing-library/react';
import PostLoginWelcomeScreen from './PostLoginWelcomeScreen';

describe('PostLoginWelcomeScreen', () => {
  test('renders welcome text and bars', () => {
    const { container } = render(<PostLoginWelcomeScreen fadingOut={false} />);
    expect(screen.getAllByText('Welkom').length).toBeGreaterThan(0);
    expect(container.querySelector('.xp-top-bar')).toBeTruthy();
    expect(container.querySelector('.xp-bottom-bar')).toBeTruthy();
  });

  test('applies fade-out class', () => {
    const { container } = render(<PostLoginWelcomeScreen fadingOut={true} />);
    expect(container.querySelector('.xp-post-login-welcome--fade-out')).toBeTruthy();
  });
});

