import React, { useEffect, useState, useRef } from 'react';
import { FadeInSection } from './ui/FadeInSection';

const Home: React.FC = () => {
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
    <div ref={sectionRef} className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 max-w-7xl mx-auto">
      {/* Hero Section */}
      <FadeInSection delay={0}>
      <div className="bg-gradient-to-br from-slate-800 to-slate-600 text-white rounded-2xl text-center mb-12 sm:mb-16 lg:mb-20 shadow-2xl p-8 sm:p-12 lg:p-20">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 tracking-tight leading-tight">
          Mon Valley Pollution Tracking System
        </h1>
        <h2 className="text-lg sm:text-xl md:text-2xl mb-6 sm:mb-8 font-light opacity-95">
          A Project by Valley Clean Air Now (VCAN)
        </h2>
        <p className="text-base sm:text-lg md:text-xl max-w-3xl mx-auto leading-relaxed opacity-90 font-light px-4">
          Empowering Mon Valley residents with real-time air quality data, comprehensive health tracking, 
          and evidence-based advocacy tools to advance environmental justice in our communities.
        </p>
      </div>
      </FadeInSection>

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

        <div className="bg-gradient-to-br from-blue-700 to-blue-600 text-white p-6 sm:p-8 lg:p-12 rounded-2xl shadow-xl">
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
          <div className="border-l-4 border-red-500 pl-4 sm:pl-6 py-2">
            <h4 className="text-red-600 mb-2 sm:mb-3 text-lg sm:text-xl font-semibold tracking-tight">
              Real-Time Monitoring
            </h4>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              Track air quality from PurpleAir community sensors and official Allegheny County 
              Health Department monitoring stations throughout the Mon Valley in real-time.
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4 sm:pl-6 py-2">
            <h4 className="text-blue-600 mb-2 sm:mb-3 text-lg sm:text-xl font-semibold tracking-tight">
              Source Attribution
            </h4>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              Connect pollution sources to health impacts using Title V permit data, 
              emissions records, and regulatory compliance information from EPA and state agencies.
            </p>
          </div>

          <div className="border-l-4 border-purple-500 pl-4 sm:pl-6 py-2">
            <h4 className="text-purple-600 mb-2 sm:mb-3 text-lg sm:text-xl font-semibold tracking-tight">
              Health Tracking
            </h4>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              Securely document symptoms and health impacts using the OSAC framework 
              with privacy-by-design architecture and HIPAA-compliant data protection.
            </p>
          </div>

          <div className="border-l-4 border-teal-500 pl-4 sm:pl-6 py-2">
            <h4 className="text-teal-600 mb-2 sm:mb-3 text-lg sm:text-xl font-semibold tracking-tight">
              Evidence Generation
            </h4>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              Generate actionable advocacy reports linking pollution events to health 
              outcomes for regulatory action and policy advocacy.
            </p>
          </div>

          <div className="border-l-4 border-yellow-500 pl-4 sm:pl-6 py-2">
            <h4 className="text-yellow-600 mb-2 sm:mb-3 text-lg sm:text-xl font-semibold tracking-tight">
              AI Assistant
            </h4>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              Access personalized health advice and pollution information through our 
              AI-powered community health assistant, BreatheAI.
            </p>
          </div>

          <div className="border-l-4 border-green-500 pl-4 sm:pl-6 py-2">
            <h4 className="text-green-600 mb-2 sm:mb-3 text-lg sm:text-xl font-semibold tracking-tight">
              Risk Modeling
            </h4>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              Calculate exposure risks based on distance to facilities, current 
              air quality conditions, and historical pollution patterns.
            </p>
          </div>
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
          Use the navigation menu to explore the platform and start tracking your environment.
        </p>
        <div className="flex gap-4 sm:gap-6 justify-center flex-wrap">
          <a
            href="https://www.valleycleanair.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-slate-800 px-6 sm:px-8 lg:px-12 py-3 sm:py-4 rounded-lg font-semibold text-sm sm:text-base lg:text-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-xl inline-block"
          >
            Visit VCAN Website
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
  );
};

export default Home;
