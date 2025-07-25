import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SymptomReportForm from './SymptomReportForm';

describe('SymptomReportForm', () => {
  test('allows adding symptoms', async () => {
    const user = userEvent.setup();
    render(<SymptomReportForm onSuccess={jest.fn()} />);
    
    const symptomInput = screen.getByPlaceholderText('Enter symptom');
    const addButton = screen.getByText('Add');
    
    await user.type(symptomInput, 'Headache');
    await user.click(addButton);
    
    expect(screen.getByText('Headache')).toBeInTheDocument();
  });

  test('handles form submission with error', async () => {
    const user = userEvent.setup();
    const onSuccess = jest.fn();
    render(<SymptomReportForm onSuccess={onSuccess} />);
    
    // Fill out the form using more specific selectors
    const userIdInput = screen.getByLabelText(/User ID/);
    await user.type(userIdInput, 'user123');
    
    const symptomInput = screen.getByPlaceholderText('Enter symptom');
    await user.type(symptomInput, 'Headache');
    await user.click(screen.getByText('Add'));
    
    // Select required fields
    const onsetSelect = screen.getByLabelText(/Onset/);
    await user.selectOptions(onsetSelect, 'sudden');
    
    const courseSelect = screen.getByLabelText(/Course/);
    await user.selectOptions(courseSelect, 'stable');
    
    // Submit the form
    await user.click(screen.getByText('Submit Report'));
    
    // Should show error due to API failure
    await waitFor(() => {
      expect(screen.getByText(/Cannot read properties of undefined/)).toBeInTheDocument();
    });
    
    // onSuccess should not be called due to error
    expect(onSuccess).not.toHaveBeenCalled();
  });
}); 