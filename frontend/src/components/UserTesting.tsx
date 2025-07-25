import React, { useState } from 'react';
import './UserTesting.css';

interface UserFeedback {
  id: string;
  timestamp: Date;
  userId: string;
  component: string;
  rating: number;
  feedback: string;
  usability: {
    easeOfUse: number;
    clarity: number;
    accessibility: number;
    performance: number;
  };
  suggestions: string;
  sessionDuration: number;
  interactions: UserInteraction[];
}

interface UserInteraction {
  timestamp: Date;
  action: string;
  component: string;
  success: boolean;
  timeToComplete: number;
}

interface UserTestingProps {
  onFeedbackSubmit: (feedback: UserFeedback) => void;
  sessionId: string;
}

const UserTesting: React.FC<UserTestingProps> = ({ onFeedbackSubmit, sessionId }) => {
  const [currentComponent, setCurrentComponent] = useState<string>('dashboard');
  const [sessionStart] = useState<Date>(new Date());
  const [interactions, setInteractions] = useState<UserInteraction[]>([]);
  const [feedback, setFeedback] = useState({
    rating: 5,
    feedback: '',
    usability: {
      easeOfUse: 5,
      clarity: 5,
      accessibility: 5,
      performance: 5,
    },
    suggestions: '',
  });

  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  // Track user interactions
  const trackInteraction = (action: string, component: string, success: boolean, timeToComplete: number) => {
    const interaction: UserInteraction = {
      timestamp: new Date(),
      action,
      component,
      success,
      timeToComplete,
    };
    setInteractions(prev => [...prev, interaction]);
  };

  // Calculate session duration
  const getSessionDuration = (): number => {
    return Math.floor((new Date().getTime() - sessionStart.getTime()) / 1000);
  };

  // Handle feedback submission
  const handleSubmitFeedback = () => {
    const userFeedback: UserFeedback = {
      id: `${sessionId}-${Date.now()}`,
      timestamp: new Date(),
      userId: sessionId,
      component: currentComponent,
      rating: feedback.rating,
      feedback: feedback.feedback,
      usability: feedback.usability,
      suggestions: feedback.suggestions,
      sessionDuration: getSessionDuration(),
      interactions,
    };

    onFeedbackSubmit(userFeedback);
    setShowFeedbackForm(false);
    
    // Reset form
    setFeedback({
      rating: 5,
      feedback: '',
      usability: {
        easeOfUse: 5,
        clarity: 5,
        accessibility: 5,
        performance: 5,
      },
      suggestions: '',
    });
  };

  // Component testing scenarios
  const testScenarios = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'Test the main dashboard functionality',
      tasks: [
        'Navigate to the dashboard',
        'View air quality data',
        'Check recent symptom reports',
        'Access BreatheAI assistant',
      ],
    },
    {
      id: 'sensor-map',
      name: 'Sensor Map',
      description: 'Test the sensor map and location features',
      tasks: [
        'View sensor locations on the map',
        'Click on a sensor to see details',
        'Check PM2.5 readings',
        'Navigate between different sensors',
      ],
    },
    {
      id: 'symptom-report',
      name: 'Symptom Report',
      description: 'Test the symptom reporting functionality',
      tasks: [
        'Fill out a symptom report',
        'Add multiple symptoms',
        'Select severity levels',
        'Submit the report',
      ],
    },
    {
      id: 'breathe-ai',
      name: 'BreatheAI Assistant',
      description: 'Test the AI assistant interactions',
      tasks: [
        'Start a conversation with BreatheAI',
        'Report symptoms to the AI',
        'Receive health recommendations',
        'Test emergency alerts',
      ],
    },
  ];

  return (
    <div className="user-testing-container">
      <div className="testing-header">
        <h2>User Testing Session</h2>
        <p>Session ID: {sessionId}</p>
        <p>Duration: {getSessionDuration()} seconds</p>
      </div>

      <div className="testing-navigation">
        <h3>Test Components</h3>
        <div className="component-buttons">
          {testScenarios.map(scenario => (
            <button
              key={scenario.id}
              className={`component-button ${currentComponent === scenario.id ? 'active' : ''}`}
              onClick={() => {
                setCurrentComponent(scenario.id);
                trackInteraction('component_switch', scenario.id, true, 0);
              }}
            >
              {scenario.name}
            </button>
          ))}
        </div>
      </div>

      <div className="current-scenario">
        <h3>{testScenarios.find(s => s.id === currentComponent)?.name}</h3>
        <p>{testScenarios.find(s => s.id === currentComponent)?.description}</p>
        
        <div className="test-tasks">
          <h4>Test Tasks:</h4>
          <ul>
            {testScenarios.find(s => s.id === currentComponent)?.tasks.map((task, index) => (
              <li key={index}>
                <input
                  type="checkbox"
                  id={`task-${index}`}
                  onChange={(e) => {
                    trackInteraction(
                      'task_completion',
                      currentComponent,
                      e.target.checked,
                      0
                    );
                  }}
                />
                <label htmlFor={`task-${index}`}>{task}</label>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="feedback-section">
        <button
          className="feedback-button"
          onClick={() => setShowFeedbackForm(true)}
        >
          Provide Feedback
        </button>

        {showFeedbackForm && (
          <div className="feedback-modal">
            <div className="feedback-content">
              <h3>Component Feedback</h3>
              
              <div className="feedback-field">
                <label>Overall Rating (1-10):</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={feedback.rating}
                  onChange={(e) => setFeedback(prev => ({ ...prev, rating: Number(e.target.value) }))}
                />
                <span>{feedback.rating}/10</span>
              </div>

              <div className="usability-ratings">
                <h4>Usability Ratings:</h4>
                
                <div className="rating-field">
                  <label>Ease of Use:</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={feedback.usability.easeOfUse}
                    onChange={(e) => setFeedback(prev => ({
                      ...prev,
                      usability: { ...prev.usability, easeOfUse: Number(e.target.value) }
                    }))}
                  />
                  <span>{feedback.usability.easeOfUse}/10</span>
                </div>

                <div className="rating-field">
                  <label>Clarity:</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={feedback.usability.clarity}
                    onChange={(e) => setFeedback(prev => ({
                      ...prev,
                      usability: { ...prev.usability, clarity: Number(e.target.value) }
                    }))}
                  />
                  <span>{feedback.usability.clarity}/10</span>
                </div>

                <div className="rating-field">
                  <label>Accessibility:</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={feedback.usability.accessibility}
                    onChange={(e) => setFeedback(prev => ({
                      ...prev,
                      usability: { ...prev.usability, accessibility: Number(e.target.value) }
                    }))}
                  />
                  <span>{feedback.usability.accessibility}/10</span>
                </div>

                <div className="rating-field">
                  <label>Performance:</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={feedback.usability.performance}
                    onChange={(e) => setFeedback(prev => ({
                      ...prev,
                      usability: { ...prev.usability, performance: Number(e.target.value) }
                    }))}
                  />
                  <span>{feedback.usability.performance}/10</span>
                </div>
              </div>

              <div className="feedback-field">
                <label>Detailed Feedback:</label>
                <textarea
                  value={feedback.feedback}
                  onChange={(e) => setFeedback(prev => ({ ...prev, feedback: e.target.value }))}
                  placeholder="Please provide detailed feedback about your experience..."
                  rows={4}
                />
              </div>

              <div className="feedback-field">
                <label>Suggestions for Improvement:</label>
                <textarea
                  value={feedback.suggestions}
                  onChange={(e) => setFeedback(prev => ({ ...prev, suggestions: e.target.value }))}
                  placeholder="What would you like to see improved?"
                  rows={3}
                />
              </div>

              <div className="feedback-actions">
                <button onClick={handleSubmitFeedback} className="submit-button">
                  Submit Feedback
                </button>
                <button onClick={() => setShowFeedbackForm(false)} className="cancel-button">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="session-summary">
        <h3>Session Summary</h3>
        <p>Total Interactions: {interactions.length}</p>
        <p>Successful Interactions: {interactions.filter(i => i.success).length}</p>
        <p>Success Rate: {interactions.length > 0 ? Math.round((interactions.filter(i => i.success).length / interactions.length) * 100) : 0}%</p>
      </div>
    </div>
  );
};

export default UserTesting; 