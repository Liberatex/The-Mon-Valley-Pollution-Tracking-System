import React, { useState, useEffect } from 'react';
import './App.css';
import Home from './components/Home';
import SensorMap from './components/SensorMap';
import SymptomReportForm from './components/SymptomReportForm';
import Dashboard from './components/Dashboard';
import BreatheAI from './components/BreatheAI';
import ExposureModel from './components/ExposureModel';
import Logo from './components/Logo';
import { feedbackService, UserFeedback } from './services/feedbackService';

type View = 'home' | 'dashboard' | 'map' | 'symptoms' | 'ai' | 'exposure';

function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when switching views
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentView]);

  // Close mobile menu on window resize (if desktop)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleFeedbackSubmit = async (feedback: UserFeedback) => {
    try {
      await feedbackService.submitFeedback(feedback);
      console.log('Feedback submitted successfully');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const handleNavClick = (view: View) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
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
          {/* Mobile Hamburger Button */}
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
          </button>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="App-nav desktop-nav" role="navigation" aria-label="Main navigation">
          <button
            className={`nav-button ${currentView === 'home' ? 'active' : ''}`}
            onClick={() => handleNavClick('home')}
            aria-current={currentView === 'home' ? 'page' : undefined}
          >
            🏠 Home
          </button>
          <button
            className={`nav-button ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('dashboard')}
            aria-current={currentView === 'dashboard' ? 'page' : undefined}
          >
            📊 Dashboard
          </button>
          <button
            className={`nav-button ${currentView === 'map' ? 'active' : ''}`}
            onClick={() => handleNavClick('map')}
            aria-current={currentView === 'map' ? 'page' : undefined}
          >
            🗺️ Sensor Map
          </button>
          <button
            className={`nav-button ${currentView === 'symptoms' ? 'active' : ''}`}
            onClick={() => handleNavClick('symptoms')}
            aria-current={currentView === 'symptoms' ? 'page' : undefined}
          >
            📝 Report Symptoms
          </button>
          <button
            className={`nav-button ${currentView === 'ai' ? 'active' : ''}`}
            onClick={() => handleNavClick('ai')}
            aria-current={currentView === 'ai' ? 'page' : undefined}
          >
            🤖 AI Assistant
          </button>
          <button
            className={`nav-button ${currentView === 'exposure' ? 'active' : ''}`}
            onClick={() => handleNavClick('exposure')}
            aria-current={currentView === 'exposure' ? 'page' : undefined}
          >
            🔬 Exposure Risk
          </button>
        </nav>

        {/* Mobile Navigation */}
        <nav className={`App-nav mobile-nav ${mobileMenuOpen ? 'open' : ''}`} role="navigation" aria-label="Mobile navigation">
          <button
            className={`nav-button ${currentView === 'home' ? 'active' : ''}`}
            onClick={() => handleNavClick('home')}
          >
            🏠 Home
          </button>
          <button
            className={`nav-button ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className={`nav-button ${currentView === 'map' ? 'active' : ''}`}
            onClick={() => handleNavClick('map')}
          >
            🗺️ Sensor Map
          </button>
          <button
            className={`nav-button ${currentView === 'symptoms' ? 'active' : ''}`}
            onClick={() => handleNavClick('symptoms')}
          >
            📝 Report Symptoms
          </button>
          <button
            className={`nav-button ${currentView === 'ai' ? 'active' : ''}`}
            onClick={() => handleNavClick('ai')}
          >
            🤖 AI Assistant
          </button>
          <button
            className={`nav-button ${currentView === 'exposure' ? 'active' : ''}`}
            onClick={() => handleNavClick('exposure')}
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
          © 2025 Mon Valley Pollution Tracking System.
          <a href="/privacy" className="footer-link">Privacy Policy</a> |
          <a href="/accessibility" className="footer-link">Accessibility</a> |
          <a href="/contact" className="footer-link">Contact</a>
        </p>
      </footer>
    </div>
  );
}

export default App;
