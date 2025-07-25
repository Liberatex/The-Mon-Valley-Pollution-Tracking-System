import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SensorMap from './SensorMap';

// Mock Firebase
jest.mock('../firebase', () => ({
  db: null
}));

const mockSensors = [
  {
    id: '1',
    name: 'Sensor 1',
    location: { lat: 40.4, lng: -79.9 },
    pm25: 12
  },
  {
    id: '2',
    name: 'Sensor 2',
    location: { lat: 40.41, lng: -79.91 },
    pm25: 15
  }
];

describe('SensorMap', () => {
  it('renders sensor map component with provided sensors', () => {
    render(<SensorMap sensors={mockSensors} onSensorSelect={jest.fn()} />);
    expect(screen.getByText('Sensor Map')).toBeInTheDocument();
  });

  it('renders sensor markers when sensors are provided', () => {
    render(<SensorMap sensors={mockSensors} onSensorSelect={jest.fn()} />);
    
    // Check for sensor list items
    const sensorList = screen.getByRole('list');
    expect(sensorList).toBeInTheDocument();
    
    // Check that sensors are rendered in the list
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(2);
  });
}); 