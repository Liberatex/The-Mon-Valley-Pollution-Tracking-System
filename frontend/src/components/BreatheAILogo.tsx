import React from 'react';
import { Wind, Sparkles } from 'lucide-react';

interface BreatheAILogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  variant?: 'icon-only' | 'with-text' | 'full';
  className?: string;
}

export const BreatheAILogo: React.FC<BreatheAILogoProps> = ({ 
  size = 'md', 
  showText = false,
  variant = 'icon-only',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  // Icon-only variant (for floating button)
  if (variant === 'icon-only') {
    return (
      <div className={`relative ${className}`}>
        <div className="relative">
          {/* Wind icon for air/breathing */}
          <Wind className={`${sizeClasses[size]} text-white`} strokeWidth={2.5} />
          {/* Sparkles overlay for AI */}
          <Sparkles className={`${sizeClasses[size]} text-white absolute -top-1 -right-1 opacity-80`} strokeWidth={1.5} style={{ transform: 'scale(0.6)' }} />
        </div>
      </div>
    );
  }

  // With text variant (for headers)
  if (variant === 'with-text') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="relative">
          <Wind className={`${sizeClasses[size]} text-white`} strokeWidth={2.5} />
          <Sparkles className={`${sizeClasses[size]} text-white absolute -top-1 -right-1 opacity-80`} strokeWidth={1.5} style={{ transform: 'scale(0.6)' }} />
        </div>
        <span className={`font-semibold text-white ${textSizes[size]}`}>BreatheAI</span>
      </div>
    );
  }

  // Full variant (with subtitle)
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <Wind className={`${sizeClasses[size]} text-white`} strokeWidth={2.5} />
        <Sparkles className={`${sizeClasses[size]} text-white absolute -top-1 -right-1 opacity-80`} strokeWidth={1.5} style={{ transform: 'scale(0.6)' }} />
      </div>
      <div className="flex flex-col">
        <span className={`font-semibold text-white ${textSizes[size]}`}>BreatheAI</span>
        {size === 'lg' && (
          <span className="text-xs text-white/80">Air Quality Assistant</span>
        )}
      </div>
    </div>
  );
};

