import React, { useState, useEffect } from 'react';
import { X, Minimize2 } from 'lucide-react';
import { BreatheAIChat } from './BreatheAIChat';
import { BreatheAILogo } from './BreatheAILogo';
import './FloatingChatBubble.css';

export const FloatingChatBubble: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Prevent body scroll when chat is open
  useEffect(() => {
    if (isOpen && !isMinimized) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMinimized]);

  const toggleChat = () => {
    if (isMinimized) {
      setIsMinimized(false);
      setIsOpen(true);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className={`floating-chat-button ${isMinimized ? 'minimized' : ''}`}
          aria-label="Open BreatheAI chat"
          aria-expanded={isOpen}
        >
          <BreatheAILogo size="md" variant="icon-only" />
          {!isMinimized && <span className="floating-chat-badge">1</span>}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="floating-chat-window">
          <div className="floating-chat-header">
            <BreatheAILogo size="md" variant="with-text" />
            <div className="flex items-center gap-2">
              <button
                onClick={handleMinimize}
                className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
                aria-label="Minimize chat"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleClose}
                className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="floating-chat-content">
            <BreatheAIChat compact={true} onClose={handleClose} />
          </div>
        </div>
      )}
    </>
  );
};

