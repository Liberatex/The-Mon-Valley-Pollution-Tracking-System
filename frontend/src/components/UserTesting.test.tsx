import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import UserTesting from './UserTesting';

describe('UserTesting Component', () => {
  const mockOnFeedbackSubmit = jest.fn();
  const sessionId = 'test-session-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders user testing interface', () => {
    render(<UserTesting onFeedbackSubmit={mockOnFeedbackSubmit} sessionId={sessionId} />);
    
    expect(screen.getByText('User Testing Session')).toBeInTheDocument();
    expect(screen.getByText(`Session ID: ${sessionId}`)).toBeInTheDocument();
    expect(screen.getByText('Test Components')).toBeInTheDocument();
  });

  test('displays all test components', () => {
    render(<UserTesting onFeedbackSubmit={mockOnFeedbackSubmit} sessionId={sessionId} />);
    
    // Use getAllByText to get all instances and check they exist
    const dashboardElements = screen.getAllByText('Dashboard');
    expect(dashboardElements.length).toBeGreaterThan(0);
    
    expect(screen.getByText('Sensor Map')).toBeInTheDocument();
    expect(screen.getByText('Symptom Report')).toBeInTheDocument();
    expect(screen.getByText('BreatheAI Assistant')).toBeInTheDocument();
  });

  test('allows switching between components', async () => {
    const user = userEvent.setup();
    render(<UserTesting onFeedbackSubmit={mockOnFeedbackSubmit} sessionId={sessionId} />);
    
    // Initially shows Dashboard
    expect(screen.getByText('Test the main dashboard functionality')).toBeInTheDocument();
    
    // Switch to Sensor Map
    await user.click(screen.getByText('Sensor Map'));
    expect(screen.getByText('Test the sensor map and location features')).toBeInTheDocument();
    
    // Switch to Symptom Report
    await user.click(screen.getByText('Symptom Report'));
    expect(screen.getByText('Test the symptom reporting functionality')).toBeInTheDocument();
  });

  test('displays test tasks for each component', () => {
    render(<UserTesting onFeedbackSubmit={mockOnFeedbackSubmit} sessionId={sessionId} />);
    
    // Dashboard tasks
    expect(screen.getByText('Navigate to the dashboard')).toBeInTheDocument();
    expect(screen.getByText('View air quality data')).toBeInTheDocument();
    expect(screen.getByText('Check recent symptom reports')).toBeInTheDocument();
    expect(screen.getByText('Access BreatheAI assistant')).toBeInTheDocument();
  });

  test('allows checking off tasks', async () => {
    const user = userEvent.setup();
    render(<UserTesting onFeedbackSubmit={mockOnFeedbackSubmit} sessionId={sessionId} />);
    
    const firstTask = screen.getByLabelText('Navigate to the dashboard');
    await user.click(firstTask);
    expect(firstTask).toBeChecked();
  });

  test('opens feedback form when feedback button is clicked', async () => {
    const user = userEvent.setup();
    render(<UserTesting onFeedbackSubmit={mockOnFeedbackSubmit} sessionId={sessionId} />);
    
    await user.click(screen.getByText('Provide Feedback'));
    
    expect(screen.getByText('Component Feedback')).toBeInTheDocument();
    expect(screen.getByText('Overall Rating (1-10):')).toBeInTheDocument();
    expect(screen.getByText('Usability Ratings:')).toBeInTheDocument();
  });

  test('allows rating adjustments', async () => {
    const user = userEvent.setup();
    render(<UserTesting onFeedbackSubmit={mockOnFeedbackSubmit} sessionId={sessionId} />);
    
    await user.click(screen.getByText('Provide Feedback'));
    
    // Use getAllByDisplayValue and select the first one (overall rating)
    const ratingInputs = screen.getAllByDisplayValue('5');
    const overallRating = ratingInputs[0]; // First one is overall rating
    
    // For range inputs, we need to simulate the change event
    fireEvent.change(overallRating, { target: { value: '8' } });
    
    expect(overallRating).toHaveValue('8');
  });

  test('allows usability ratings', async () => {
    const user = userEvent.setup();
    render(<UserTesting onFeedbackSubmit={mockOnFeedbackSubmit} sessionId={sessionId} />);
    
    await user.click(screen.getByText('Provide Feedback'));
    
    // Use getAllByDisplayValue and select the ease of use rating (second one)
    const ratingInputs = screen.getAllByDisplayValue('5');
    const easeOfUseRating = ratingInputs[1]; // Second one is ease of use
    
    // For range inputs, we need to simulate the change event
    fireEvent.change(easeOfUseRating, { target: { value: '7' } });
    
    expect(easeOfUseRating).toHaveValue('7');
  });

  test('allows detailed feedback input', async () => {
    const user = userEvent.setup();
    render(<UserTesting onFeedbackSubmit={mockOnFeedbackSubmit} sessionId={sessionId} />);
    
    await user.click(screen.getByText('Provide Feedback'));
    
    const feedbackTextarea = screen.getByPlaceholderText('Please provide detailed feedback about your experience...');
    await user.type(feedbackTextarea, 'This is a great testing interface!');
    
    expect(feedbackTextarea).toHaveValue('This is a great testing interface!');
  });

  test('allows suggestions input', async () => {
    const user = userEvent.setup();
    render(<UserTesting onFeedbackSubmit={mockOnFeedbackSubmit} sessionId={sessionId} />);
    
    await user.click(screen.getByText('Provide Feedback'));
    
    const suggestionsTextarea = screen.getByPlaceholderText('What would you like to see improved?');
    await user.type(suggestionsTextarea, 'Add more test scenarios');
    
    expect(suggestionsTextarea).toHaveValue('Add more test scenarios');
  });

  test('submits feedback when form is submitted', async () => {
    const user = userEvent.setup();
    render(<UserTesting onFeedbackSubmit={mockOnFeedbackSubmit} sessionId={sessionId} />);
    
    await user.click(screen.getByText('Provide Feedback'));
    
    // Fill out the form
    const feedbackTextarea = screen.getByPlaceholderText('Please provide detailed feedback about your experience...');
    await user.type(feedbackTextarea, 'Great experience!');
    
    const suggestionsTextarea = screen.getByPlaceholderText('What would you like to see improved?');
    await user.type(suggestionsTextarea, 'More features');
    
    await user.click(screen.getByText('Submit Feedback'));
    
    await waitFor(() => {
      expect(mockOnFeedbackSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: sessionId,
          component: 'dashboard',
          feedback: 'Great experience!',
          suggestions: 'More features',
          rating: 5,
          usability: {
            easeOfUse: 5,
            clarity: 5,
            accessibility: 5,
            performance: 5,
          },
        })
      );
    });
  });

  test('closes feedback form when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<UserTesting onFeedbackSubmit={mockOnFeedbackSubmit} sessionId={sessionId} />);
    
    await user.click(screen.getByText('Provide Feedback'));
    expect(screen.getByText('Component Feedback')).toBeInTheDocument();
    
    await user.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Component Feedback')).not.toBeInTheDocument();
  });

  test('displays session summary', () => {
    render(<UserTesting onFeedbackSubmit={mockOnFeedbackSubmit} sessionId={sessionId} />);
    
    expect(screen.getByText('Session Summary')).toBeInTheDocument();
    expect(screen.getByText('Total Interactions: 0')).toBeInTheDocument();
    expect(screen.getByText('Successful Interactions: 0')).toBeInTheDocument();
    expect(screen.getByText('Success Rate: 0%')).toBeInTheDocument();
  });

  test('tracks interactions and updates summary', async () => {
    const user = userEvent.setup();
    render(<UserTesting onFeedbackSubmit={mockOnFeedbackSubmit} sessionId={sessionId} />);
    
    // Perform some interactions
    await user.click(screen.getByText('Sensor Map'));
    await user.click(screen.getByText('Symptom Report'));
    
    // Check a task
    const task = screen.getByLabelText('Fill out a symptom report');
    await user.click(task);
    
    expect(screen.getByText('Total Interactions: 3')).toBeInTheDocument();
    expect(screen.getByText('Successful Interactions: 3')).toBeInTheDocument();
    expect(screen.getByText('Success Rate: 100%')).toBeInTheDocument();
  });

  test('maintains accessibility features', () => {
    render(<UserTesting onFeedbackSubmit={mockOnFeedbackSubmit} sessionId={sessionId} />);
    
    // Check for proper labeling
    const taskCheckbox = screen.getByLabelText('Navigate to the dashboard');
    expect(taskCheckbox).toBeInTheDocument();
    
    // Check for proper button roles
    const feedbackButton = screen.getByText('Provide Feedback');
    expect(feedbackButton).toBeInTheDocument();
  });
}); 