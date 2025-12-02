import React, { useState } from 'react';
import './BreatheAI.css';
import { FadeInSection } from './ui/FadeInSection';
import { BreatheAIChat } from './BreatheAIChat';
import { BreatheAIChatOSAC } from './BreatheAIChatOSAC';
import { BreatheAILogo } from './BreatheAILogo';

const BreatheAI: React.FC = () => {
  const [useOSAC, setUseOSAC] = useState(true); // Default to OSAC mode

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section - Full Width */}
      <FadeInSection delay={0}>
        <div className="bg-gradient-to-br from-slate-800 to-slate-600 text-white w-screen text-center py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8" style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)' }}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <BreatheAILogo size="lg" variant="icon-only" />
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                BreatheAI Assistant
              </h2>
            </div>
            <p className="text-lg sm:text-xl lg:text-2xl opacity-90 font-light max-w-3xl mx-auto mb-6">
              Air Quality Health Assistant with OSAC Framework
            </p>
            
            {/* Mode Toggle */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() => setUseOSAC(true)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  useOSAC
                    ? 'bg-white text-slate-700'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                OSAC Mode (Recommended)
              </button>
              <button
                onClick={() => setUseOSAC(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !useOSAC
                    ? 'bg-white text-slate-700'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                Standard Mode
              </button>
            </div>
            
            {/* AI Status Indicator */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-sm font-medium">AI Fully Operational</span>
            </div>
          </div>
        </div>
      </FadeInSection>

      {/* Content Section with Container */}
      <div className="py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="breathe-ai-container bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 lg:p-8 w-full max-w-full overflow-x-hidden">
            {useOSAC ? (
              <BreatheAIChatOSAC compact={false} />
            ) : (
              <BreatheAIChat compact={false} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreatheAI; 