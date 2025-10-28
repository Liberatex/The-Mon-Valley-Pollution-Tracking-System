import React, { useState } from 'react';
import './App.css';
import Home from './components/Home';
import SensorMap from './components/SensorMap';
import SymptomReportForm from './components/SymptomReportForm';
import Dashboard from './components/Dashboard';
import BreatheAI from './components/BreatheAI';
import UserTesting from './components/UserTesting';
import AdminDashboard from './components/AdminDashboard';
import ExposureModel from './components/ExposureModel';
import EvidenceReport from './components/EvidenceReport';
import Logo from './components/Logo';
import { feedbackService, UserFeedback } from './services/feedbackService';

type View = 'home' | 'dashboard' | 'map' | 'symptoms' | 'ai' | 'exposure';

function App() {
  const [currentView, setCurrentView] = useState<View>('home');

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
      case 'home':
        return <Home />;
      case 'dashboard':
        return <Dashboard />;
      case 'map':
        return <SensorMap onSensorSelect={() => {}} />;
      case 'symptoms':
        return <SymptomReportForm onSuccess={(id) => console.log('Report submitted:', id)} />;
      case 'ai':
        return <BreatheAI />;
      case 'exposure':
        return <ExposureModel />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="App" lang="en">
      <header className="App-header">
        <div className="header-content">
          <Logo />
        </div>
        <nav className="App-nav" role="navigation" aria-label="Main navigation">
          <button
            className={`nav-button ${currentView === 'home' ? 'active' : ''}`}
            onClick={() => setCurrentView('home')}
            aria-current={currentView === 'home' ? 'page' : undefined}
          >
            🏠 Home
          </button>
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
            className={`nav-button ${currentView === 'exposure' ? 'active' : ''}`}
            onClick={() => setCurrentView('exposure')}
            aria-current={currentView === 'exposure' ? 'page' : undefined}
          >
            🔬 Exposure Risk
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
