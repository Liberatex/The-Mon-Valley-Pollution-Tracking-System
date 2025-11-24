import React, { useState, useRef, useEffect } from 'react';
import './BreatheAI.css';
import axios from 'axios';
import { Bot, Send, X } from 'lucide-react';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type: 'text' | 'question' | 'suggestion' | 'alert';
}

interface BreatheAIChatProps {
  compact?: boolean;
  onClose?: () => void;
}

export const BreatheAIChat: React.FC<BreatheAIChatProps> = ({ compact = false, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm BreatheAI, your air quality health assistant. Ask me anything about air quality, health, or the Mon Valley!",
      sender: 'ai',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiStatus, setAiStatus] = useState<'checking' | 'cloud' | 'fallback'>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check AI status on component mount
  useEffect(() => {
    checkAIStatus();
  }, []);

  const checkAIStatus = async () => {
    try {
      const response = await axios.get('https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/healthCheck', { timeout: 5000 });
      if (response.data.services?.ollama === 'fully_operational' || response.data.services?.ai_assistant === 'online') {
        setAiStatus('cloud');
      } else {
        setAiStatus('cloud');
      }
    } catch (error) {
      setAiStatus('cloud');
    }
  };

  const addMessage = (text: string, sender: 'user' | 'ai', type: 'text' | 'question' | 'suggestion' | 'alert' = 'text') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
      type
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendToLlama3 = async (input: string) => {
    setIsTyping(true);
    try {
      const baseUrl = 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net';
      const res = await axios.post(`${baseUrl}/llama3Chat`, { message: input });
      const response = res.data.response || 'Sorry, I could not generate a response.';
      addMessage(response, 'ai');
    } catch (error) {
      console.error('AI Chat Error:', error);
      addMessage('Sorry, there was an error connecting to the AI assistant. Please try again.', 'ai', 'alert');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    addMessage(inputValue, 'user');
    const userInput = inputValue;
    setInputValue('');
    await sendToLlama3(userInput);
  };

  const handleQuickResponse = async (response: string) => {
    addMessage(response, 'user');
    await sendToLlama3(response);
  };

  return (
    <div className={`breathe-ai-chat ${compact ? 'compact' : ''}`}>
      {/* Compact Header */}
      {compact && (
        <div className="chat-header bg-gradient-to-r from-slate-700 to-slate-600 text-white px-4 py-3 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <div>
              <h3 className="font-semibold text-sm">BreatheAI Assistant</h3>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  aiStatus === 'cloud' ? 'bg-green-400' : 'bg-yellow-400'
                }`}></div>
                <span className="text-xs opacity-90">Online</span>
              </div>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      <div className={`messages-container ${compact ? 'compact-messages' : ''}`}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.sender} ${message.type}`}
          >
            <div className="message-content">
              {message.text.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
            <div className="message-time">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="message ai typing">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {!compact && (
        <div className="quick-responses mb-6">
          <button 
            onClick={() => handleQuickResponse("I'm not feeling well")}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors text-sm sm:text-base"
          >
            Not feeling well
          </button>
          <button 
            onClick={() => handleQuickResponse("I'm doing okay")}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors text-sm sm:text-base"
          >
            Feeling okay
          </button>
          <button 
            onClick={() => handleQuickResponse("Check air quality")}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors text-sm sm:text-base"
          >
            Check air quality
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="input-form flex gap-2 sm:gap-3 mt-4 w-full max-w-full">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your message..."
          disabled={isTyping}
          className="flex-1 min-w-0 px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-slate-600 transition-colors disabled:bg-gray-100 disabled:text-gray-500 bg-white text-sm sm:text-base"
        />
        <button 
          type="submit" 
          disabled={isTyping || !inputValue.trim()}
          className="px-4 sm:px-6 lg:px-8 py-2 sm:py-3 bg-gradient-to-r from-slate-700 to-slate-600 text-white rounded-xl font-bold hover:from-slate-600 hover:to-slate-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2 shadow-lg hover:shadow-xl flex-shrink-0 text-sm sm:text-base"
        >
          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
};

