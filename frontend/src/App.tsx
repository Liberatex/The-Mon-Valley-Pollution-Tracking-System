import React, { useState } from 'react';
import './App.css';
import SensorMap from './components/SensorMap';
import SymptomReportForm from './components/SymptomReportForm';
import Dashboard from './components/Dashboard';
import BreatheAI from './components/BreatheAI';
import UserTesting from './components/UserTesting';
import { feedbackService, UserFeedback } from './services/feedbackService';

type View = 'dashboard' | 'map' | 'symptoms' | 'ai' | 'testing';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [language, setLanguage] = useState<'en' | 'es'>('en');

  const handleFeedbackSubmit = async (feedback: UserFeedback) => {
    try {
      await feedbackService.submitFeedback(feedback);
      console.log('Feedback submitted successfully');
      // You could show a success message here
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      // You could show an error message here
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'map':
        return <SensorMap onSensorSelect={() => {}} />;
      case 'symptoms':
        return <SymptomReportForm onSuccess={(id) => console.log('Report submitted:', id)} />;
      case 'ai':
        return <BreatheAI />;
      case 'testing':
        return <UserTesting onFeedbackSubmit={handleFeedbackSubmit} sessionId={`session-${Date.now()}`} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="App" lang={language}>
      <header className="App-header">
        <div className="header-content">
          <h1 className="App-title">Mon Valley Pollution Tracking System</h1>
          <div className="header-controls">
            <div className="language-selector">
              <label htmlFor="language-select" className="sr-only">
                Language
              </label>
              <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'es')}
                aria-label="Language"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>
        </div>
        <nav className="App-nav" role="navigation" aria-label="Main navigation">
          <button
            className={`nav-button ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
            aria-current={currentView === 'dashboard' ? 'page' : undefined}
          >
            📊 Dashboard
          </button>
          <button
            className={`nav-button ${currentView === 'map' ? 'active' : ''}`}
            onClick={() => setCurrentView('map')}
            aria-current={currentView === 'map' ? 'page' : undefined}
          >
            🗺️ Sensor Map
          </button>
          <button
            className={`nav-button ${currentView === 'symptoms' ? 'active' : ''}`}
            onClick={() => setCurrentView('symptoms')}
            aria-current={currentView === 'symptoms' ? 'page' : undefined}
          >
            📝 Report Symptoms
          </button>
          <button
            className={`nav-button ${currentView === 'ai' ? 'active' : ''}`}
            onClick={() => setCurrentView('ai')}
            aria-current={currentView === 'ai' ? 'page' : undefined}
          >
            🤖 AI Assistant
          </button>
          <button
            className={`nav-button ${currentView === 'testing' ? 'active' : ''}`}
            onClick={() => setCurrentView('testing')}
            aria-current={currentView === 'testing' ? 'page' : undefined}
          >
            🧪 User Testing
          </button>
        </nav>
      </header>
      <main className="App-main" role="main">
        <div className="view-container">
          {renderView()}
        </div>
      </main>
      <footer className="App-footer">
        <p>
          © 2024 Mon Valley Pollution Tracking System.
          <a href="/privacy" className="footer-link">Privacy Policy</a> |
          <a href="/accessibility" className="footer-link">Accessibility</a> |
          <a href="/contact" className="footer-link">Contact</a>
        </p>
      </footer>
    </div>
  );
}

export default App;
