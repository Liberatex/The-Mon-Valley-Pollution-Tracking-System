import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

test('renders Mon Valley Pollution Tracking System', () => {
  render(<App />);
  const titleElement = screen.getByRole('heading', { level: 1 });
  expect(titleElement).toHaveTextContent('Mon Valley Pollution Tracking System');
});
