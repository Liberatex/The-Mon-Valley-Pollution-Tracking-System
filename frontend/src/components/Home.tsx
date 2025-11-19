import React, { useEffect, useState, useRef } from 'react';
import { FadeInSection } from './ui/FadeInSection';
import { BarChart3, Map, FileText, Bot, AlertTriangle, ArrowRight, Activity, Shield, Zap } from 'lucide-react';

interface HomeProps {
  onNavigate?: (view: 'dashboard' | 'map' | 'symptoms' | 'ai' | 'exposure') => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef} className="w-full">
      {/* Hero Section - Full Width */}
      <FadeInSection delay={0}>
      <div className="bg-gradient-to-br from-slate-800 to-slate-600 text-white w-full text-center py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 tracking-tight leading-tight">
            Mon Valley Pollution Tracking System
          </h1>
          <h2 className="text-lg sm:text-xl md:text-2xl mb-6 sm:mb-8 font-light opacity-95">
            A Project by Valley Clean Air Now (VCAN)
          </h2>
          <p className="text-base sm:text-lg md:text-xl max-w-3xl mx-auto leading-relaxed opacity-90 font-light px-4 mb-8">
            Empowering Mon Valley residents with real-time air quality data, comprehensive health tracking, 
            and evidence-based advocacy tools to advance environmental justice in our communities.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <button
              onClick={() => onNavigate?.('map')}
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 hover:-translate-y-1 hover:shadow-xl backdrop-blur-sm border border-white/20 flex items-center gap-2"
            >
              <Map className="w-5 h-5" />
              Explore Sensor Map
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate?.('dashboard')}
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 hover:-translate-y-1 hover:shadow-xl backdrop-blur-sm border border-white/20 flex items-center gap-2"
            >
              <BarChart3 className="w-5 h-5" />
              View Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate?.('symptoms')}
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 hover:-translate-y-1 hover:shadow-xl backdrop-blur-sm border border-white/20 flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Report Symptoms
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      </FadeInSection>

      {/* Rest of content with container */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 max-w-7xl mx-auto">

      {/* VCAN Connection */}
      <FadeInSection delay={0.2}>
      <div className="bg-white rounded-2xl shadow-lg mb-12 sm:mb-16 border border-gray-200 p-6 sm:p-8 lg:p-12">
        <h3 className="text-2xl sm:text-3xl lg:text-4xl text-slate-800 mb-4 sm:mb-6 font-semibold tracking-tight">
          About Valley Clean Air Now
        </h3>
        <p className="text-base sm:text-lg text-gray-700 mb-6 sm:mb-8 leading-relaxed max-w-4xl">
          Valley Clean Air Now (VCAN) is a community-led movement dedicated to protecting the health 
          and wellbeing of Mon Valley residents. Founded to address the persistent air quality crisis 
          affecting Clairton, Braddock, Dravosburg, and surrounding communities, VCAN works to hold 
          industrial polluters accountable and advocate for stronger environmental protections.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h4 className="text-slate-700 mb-3 text-lg font-semibold">
              Location
            </h4>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              635 Monongahela Avenue, First FL Rear Office<br />
              Glassport, PA 15045
            </p>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h4 className="text-slate-700 mb-3 text-lg font-semibold">
              Contact
            </h4>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              Phone: (412) 226-6512<br />
              Email: info@valleycleanair.com
            </p>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 sm:col-span-2 lg:col-span-1">
            <h4 className="text-slate-700 mb-3 text-lg font-semibold">
              Visit VCAN
            </h4>
            <p className="text-gray-600 text-sm sm:text-base">
              <a 
                href="https://www.valleycleanair.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-slate-700 font-semibold border-b-2 border-slate-700 hover:opacity-70 transition-opacity"
              >
                valleycleanair.com
              </a>
            </p>
          </div>
        </div>
      </div>
      </FadeInSection>

      {/* Mission & Vision */}
      <FadeInSection delay={0.4}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
        <div className="bg-gradient-to-br from-slate-700 to-slate-600 text-white p-6 sm:p-8 lg:p-12 rounded-2xl shadow-xl">
          <h3 className="text-xl sm:text-2xl lg:text-3xl mb-4 sm:mb-6 font-semibold tracking-tight">
            Mission
          </h3>
          <p className="text-sm sm:text-base lg:text-lg leading-relaxed opacity-95 font-light">
            To empower Mon Valley residents with data-driven tools to track air pollution, 
            document health impacts, and advocate for environmental justice through 
            evidence-based community organizing and policy engagement.
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-700 to-slate-600 text-white p-6 sm:p-8 lg:p-12 rounded-2xl shadow-xl">
          <h3 className="text-xl sm:text-2xl lg:text-3xl mb-4 sm:mb-6 font-semibold tracking-tight">
            Vision
          </h3>
          <p className="text-sm sm:text-base lg:text-lg leading-relaxed opacity-95 font-light">
            A future where Mon Valley communities breathe clean air, where industrial 
            polluters are held accountable, and where residents have the tools and 
            evidence needed to advocate effectively for their health and wellbeing.
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-700 text-white p-6 sm:p-8 lg:p-12 rounded-2xl shadow-xl md:col-span-2 lg:col-span-1">
          <h3 className="text-xl sm:text-2xl lg:text-3xl mb-4 sm:mb-6 font-semibold tracking-tight">
            Strategic Goals
          </h3>
          <ul className="text-sm sm:text-base lg:text-lg leading-relaxed opacity-95 font-light space-y-3 list-none pl-0">
            <li className="flex items-start">
              <span className="mr-3">•</span>
              <span>Real-time air quality monitoring and analysis</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3">•</span>
              <span>Comprehensive health impact documentation</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3">•</span>
              <span>Policy advocacy and regulatory engagement</span>
            </li>
            <li className="flex items-start">
              <span className="mr-3">•</span>
              <span>Community empowerment and education</span>
            </li>
          </ul>
        </div>
      </div>
      </FadeInSection>

      {/* Platform Capabilities */}
      <FadeInSection delay={0.6}>
      <div className="bg-white rounded-2xl shadow-lg mb-12 sm:mb-16 border border-gray-200 p-6 sm:p-8 lg:p-12">
        <h3 className="text-2xl sm:text-3xl lg:text-4xl text-slate-800 mb-8 sm:mb-12 text-center font-semibold tracking-tight">
          Platform Capabilities
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="border-l-4 border-red-500 pl-4 sm:pl-6 py-2 group hover:bg-gray-50 rounded-r-lg transition-colors duration-200">
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              <h4 className="text-red-600 text-lg sm:text-xl font-semibold tracking-tight flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Real-Time Monitoring
              </h4>
            </div>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-4">
              Track air quality from PurpleAir community sensors and official Allegheny County 
              Health Department monitoring stations throughout the Mon Valley in real-time.
            </p>
            <button
              onClick={() => onNavigate?.('map')}
              className="text-red-600 hover:text-red-700 font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all duration-200"
            >
              View Sensor Map
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="border-l-4 border-blue-500 pl-4 sm:pl-6 py-2 group hover:bg-gray-50 rounded-r-lg transition-colors duration-200">
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              <h4 className="text-blue-600 text-lg sm:text-xl font-semibold tracking-tight flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Air Quality Dashboard
              </h4>
            </div>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-4">
              View comprehensive air quality data, trends, and historical patterns 
              from multiple monitoring sources across the Mon Valley region.
            </p>
            <button
              onClick={() => onNavigate?.('dashboard')}
              className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all duration-200"
            >
              Open Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="border-l-4 border-purple-500 pl-4 sm:pl-6 py-2 group hover:bg-gray-50 rounded-r-lg transition-colors duration-200">
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              <h4 className="text-purple-600 text-lg sm:text-xl font-semibold tracking-tight flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Health Tracking
              </h4>
            </div>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-4">
              Securely document symptoms and health impacts using the OSAC framework 
              with privacy-by-design architecture and HIPAA-compliant data protection.
            </p>
            <button
              onClick={() => onNavigate?.('symptoms')}
              className="text-purple-600 hover:text-purple-700 font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all duration-200"
            >
              Report Symptoms
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="border-l-4 border-teal-500 pl-4 sm:pl-6 py-2 group hover:bg-gray-50 rounded-r-lg transition-colors duration-200">
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              <h4 className="text-teal-600 text-lg sm:text-xl font-semibold tracking-tight flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Evidence Generation
              </h4>
            </div>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-4">
              Generate actionable advocacy reports linking pollution events to health 
              outcomes for regulatory action and policy advocacy.
            </p>
            <button
              onClick={() => onNavigate?.('symptoms')}
              className="text-teal-600 hover:text-teal-700 font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all duration-200"
            >
              Create Report
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="border-l-4 border-yellow-500 pl-4 sm:pl-6 py-2 group hover:bg-gray-50 rounded-r-lg transition-colors duration-200">
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              <h4 className="text-yellow-600 text-lg sm:text-xl font-semibold tracking-tight flex items-center gap-2">
                <Bot className="w-5 h-5" />
                AI Assistant
              </h4>
            </div>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-4">
              Access personalized health advice and pollution information through our 
              AI-powered community health assistant, BreatheAI.
            </p>
            <button
              onClick={() => onNavigate?.('ai')}
              className="text-yellow-600 hover:text-yellow-700 font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all duration-200"
            >
              Chat with BreatheAI
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="border-l-4 border-green-500 pl-4 sm:pl-6 py-2 group hover:bg-gray-50 rounded-r-lg transition-colors duration-200">
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              <h4 className="text-green-600 text-lg sm:text-xl font-semibold tracking-tight flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Risk Modeling
              </h4>
            </div>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-4">
              Calculate exposure risks based on distance to facilities, current 
              air quality conditions, and historical pollution patterns.
            </p>
            <button
              onClick={() => onNavigate?.('exposure')}
              className="text-green-600 hover:text-green-700 font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all duration-200"
            >
              Calculate Risk
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      </FadeInSection>

      {/* Quick Actions Section */}
      <FadeInSection delay={0.7}>
      <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-2xl shadow-lg mb-12 sm:mb-16 border border-gray-200 p-6 sm:p-8 lg:p-12">
        <h3 className="text-2xl sm:text-3xl lg:text-4xl text-slate-800 mb-6 sm:mb-8 text-center font-semibold tracking-tight">
          Get Started
        </h3>
        <p className="text-base sm:text-lg text-gray-700 mb-8 sm:mb-10 text-center max-w-2xl mx-auto">
          Choose how you'd like to engage with the platform. Each tool is designed to help you track, understand, and advocate for cleaner air.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <button
            onClick={() => onNavigate?.('map')}
            className="bg-white hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-400 rounded-xl p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition-colors">
                <Map className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold text-slate-800">Explore the Map</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              See real-time air quality sensors, industrial facilities, and monitoring stations in your area.
            </p>
            <span className="text-blue-600 font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
              View Map <ArrowRight className="w-4 h-4" />
            </span>
          </button>

          <button
            onClick={() => onNavigate?.('symptoms')}
            className="bg-white hover:bg-purple-50 border-2 border-purple-200 hover:border-purple-400 rounded-xl p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-purple-100 p-3 rounded-lg group-hover:bg-purple-200 transition-colors">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="text-lg font-semibold text-slate-800">Report Symptoms</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Document health symptoms and create evidence reports linking pollution to health impacts.
            </p>
            <span className="text-purple-600 font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
              Start Reporting <ArrowRight className="w-4 h-4" />
            </span>
          </button>

          <button
            onClick={() => onNavigate?.('dashboard')}
            className="bg-white hover:bg-teal-50 border-2 border-teal-200 hover:border-teal-400 rounded-xl p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-teal-100 p-3 rounded-lg group-hover:bg-teal-200 transition-colors">
                <BarChart3 className="w-6 h-6 text-teal-600" />
              </div>
              <h4 className="text-lg font-semibold text-slate-800">View Dashboard</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Access comprehensive air quality data, trends, and analytics from multiple sources.
            </p>
            <span className="text-teal-600 font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
              Open Dashboard <ArrowRight className="w-4 h-4" />
            </span>
          </button>

          <button
            onClick={() => onNavigate?.('exposure')}
            className="bg-white hover:bg-green-50 border-2 border-green-200 hover:border-green-400 rounded-xl p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition-colors">
                <AlertTriangle className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-slate-800">Calculate Risk</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Assess your exposure risk based on location, air quality, and proximity to facilities.
            </p>
            <span className="text-green-600 font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
              Check Risk <ArrowRight className="w-4 h-4" />
            </span>
          </button>

          <button
            onClick={() => onNavigate?.('ai')}
            className="bg-white hover:bg-yellow-50 border-2 border-yellow-200 hover:border-yellow-400 rounded-xl p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-yellow-100 p-3 rounded-lg group-hover:bg-yellow-200 transition-colors">
                <Bot className="w-6 h-6 text-yellow-600" />
              </div>
              <h4 className="text-lg font-semibold text-slate-800">Ask BreatheAI</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Get personalized health advice and answers about air quality and pollution in your area.
            </p>
            <span className="text-yellow-600 font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
              Chat Now <ArrowRight className="w-4 h-4" />
            </span>
          </button>

          <a
            href="https://www.valleycleanair.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-400 rounded-xl p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-slate-100 p-3 rounded-lg group-hover:bg-slate-200 transition-colors">
                <Zap className="w-6 h-6 text-slate-600" />
              </div>
              <h4 className="text-lg font-semibold text-slate-800">Join VCAN</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Learn more about Valley Clean Air Now and how to get involved in the movement.
            </p>
            <span className="text-slate-600 font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
              Visit Website <ArrowRight className="w-4 h-4" />
            </span>
          </a>
        </div>
      </div>
      </FadeInSection>

      {/* Call to Action */}
      <FadeInSection delay={0.8}>
      <div className="bg-gradient-to-br from-slate-800 to-slate-600 text-white rounded-2xl text-center shadow-2xl p-8 sm:p-12 lg:p-16">
        <h3 className="text-2xl sm:text-3xl lg:text-4xl mb-4 sm:mb-6 font-semibold tracking-tight">
          Ready to Make a Difference?
        </h3>
        <p className="text-base sm:text-lg lg:text-xl mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed opacity-95 font-light px-4">
          Join VCAN and thousands of Mon Valley residents fighting for clean air. 
          Start by exploring the platform tools above or visit VCAN to learn more about our mission.
        </p>
        <div className="flex gap-4 sm:gap-6 justify-center flex-wrap">
          <button
            onClick={() => onNavigate?.('map')}
            className="bg-white text-slate-800 px-6 sm:px-8 lg:px-12 py-3 sm:py-4 rounded-lg font-semibold text-sm sm:text-base lg:text-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-xl inline-flex items-center gap-2"
          >
            <Map className="w-5 h-5" />
            Start Exploring
          </button>
          <a
            href="https://www.valleycleanair.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/10 hover:bg-white/20 text-white px-6 sm:px-8 lg:px-12 py-3 sm:py-4 rounded-lg font-semibold text-sm sm:text-base lg:text-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-xl inline-flex items-center gap-2 backdrop-blur-sm border border-white/20"
          >
            Visit VCAN Website
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>
      </FadeInSection>

      {/* Footer Note */}
      <FadeInSection delay={1.0}>
      <div className="text-center mt-12 sm:mt-16 lg:mt-20 text-gray-500 text-sm sm:text-base leading-relaxed">
        <p className="mb-2">
          This platform is part of VCAN's Proactive Health and Pollution Advocacy (PHPA) initiative.
        </p>
        <p>
          Built for the Mon Valley community by Liberate X in partnership with VCAN.
        </p>
      </div>
      </FadeInSection>
      </div>
    </div>
  );
};

export default Home;
