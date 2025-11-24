import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Home, BarChart3, Map, FileText, Bot, AlertTriangle } from 'lucide-react';
import './App.css';
import Logo from './components/Logo';
import { feedbackService, UserFeedback } from './services/feedbackService';
import { PageTransition } from './components/ui/PageTransition';
import { FloatingChatBubble } from './components/FloatingChatBubble';

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

  // Lazy load page components
  const HomePage = lazy(() => import('./components/Home'));
  const Dashboard = lazy(() => import('./components/Dashboard'));
  const SensorMap = lazy(() => import('./components/SensorMap'));
  const SymptomReportForm = lazy(() => import('./components/SymptomReportForm'));
  const BreatheAI = lazy(() => import('./components/BreatheAI'));
  const ExposureModel = lazy(() => import('./components/ExposureModel'));

  const LoadingFallback = () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  );

  const handleNavigate = (view: 'dashboard' | 'map' | 'symptoms' | 'ai' | 'exposure') => {
    setCurrentView(view);
  };

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <Suspense fallback={<LoadingFallback />}><HomePage onNavigate={handleNavigate} /></Suspense>;
      case 'dashboard':
        return <Suspense fallback={<LoadingFallback />}><Dashboard /></Suspense>;
      case 'map':
        return <Suspense fallback={<LoadingFallback />}><SensorMap onSensorSelect={() => {}} /></Suspense>;
      case 'symptoms':
        return <Suspense fallback={<LoadingFallback />}><SymptomReportForm onSuccess={(id) => console.log('Report submitted:', id)} /></Suspense>;
      case 'ai':
        return <Suspense fallback={<LoadingFallback />}><BreatheAI /></Suspense>;
      case 'exposure':
        return <Suspense fallback={<LoadingFallback />}><ExposureModel onNavigate={handleNavClick} /></Suspense>;
      default:
        return <Suspense fallback={<LoadingFallback />}><HomePage /></Suspense>;
    }
  };

  return (
    <div className="App" lang="en">
      <header className="App-header">
        <div className="header-content">
          <Logo onClick={() => handleNavClick('home')} />
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
            <Home className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Home</span>
          </button>
          <button
            className={`nav-button ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('dashboard')}
            aria-current={currentView === 'dashboard' ? 'page' : undefined}
          >
            <BarChart3 className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <button
            className={`nav-button ${currentView === 'map' ? 'active' : ''}`}
            onClick={() => handleNavClick('map')}
            aria-current={currentView === 'map' ? 'page' : undefined}
          >
            <Map className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Sensor Map</span>
          </button>
          <button
            className={`nav-button ${currentView === 'symptoms' ? 'active' : ''}`}
            onClick={() => handleNavClick('symptoms')}
            aria-current={currentView === 'symptoms' ? 'page' : undefined}
          >
            <FileText className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Report Symptoms</span>
          </button>
          <button
            className={`nav-button ${currentView === 'ai' ? 'active' : ''}`}
            onClick={() => handleNavClick('ai')}
            aria-current={currentView === 'ai' ? 'page' : undefined}
          >
            <Bot className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">AI Assistant</span>
          </button>
          <button
            className={`nav-button ${currentView === 'exposure' ? 'active' : ''}`}
            onClick={() => handleNavClick('exposure')}
            aria-current={currentView === 'exposure' ? 'page' : undefined}
          >
            <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Exposure Risk</span>
          </button>
        </nav>

        {/* Mobile Navigation */}
        <nav className={`App-nav mobile-nav ${mobileMenuOpen ? 'open' : ''}`} role="navigation" aria-label="Mobile navigation">
          <button
            className={`nav-button ${currentView === 'home' ? 'active' : ''}`}
            onClick={() => handleNavClick('home')}
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </button>
          <button
            className={`nav-button ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('dashboard')}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Dashboard</span>
          </button>
          <button
            className={`nav-button ${currentView === 'map' ? 'active' : ''}`}
            onClick={() => handleNavClick('map')}
          >
            <Map className="w-5 h-5" />
            <span>Sensor Map</span>
          </button>
          <button
            className={`nav-button ${currentView === 'symptoms' ? 'active' : ''}`}
            onClick={() => handleNavClick('symptoms')}
          >
            <FileText className="w-5 h-5" />
            <span>Report Symptoms</span>
          </button>
          <button
            className={`nav-button ${currentView === 'ai' ? 'active' : ''}`}
            onClick={() => handleNavClick('ai')}
          >
            <Bot className="w-5 h-5" />
            <span>AI Assistant</span>
          </button>
          <button
            className={`nav-button ${currentView === 'exposure' ? 'active' : ''}`}
            onClick={() => handleNavClick('exposure')}
          >
            <AlertTriangle className="w-5 h-5" />
            <span>Exposure Risk</span>
          </button>
        </nav>
      </header>
      <main className="App-main" role="main">
        <div className="view-container">
          <AnimatePresence mode="wait">
            <PageTransition key={currentView}>
              {renderView()}
            </PageTransition>
          </AnimatePresence>
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
      
      {/* Floating Chat Bubble - Available on all pages */}
      <FloatingChatBubble />
    </div>
  );
}

export default App;
