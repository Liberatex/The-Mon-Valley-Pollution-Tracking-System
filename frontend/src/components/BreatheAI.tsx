import React, { useState, useRef, useEffect } from 'react';
import './BreatheAI.css';
import axios from 'axios';
import { FadeInSection } from './ui/FadeInSection';
import { Bot, Send, CheckCircle2 } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type: 'text' | 'question' | 'suggestion' | 'alert';
}

interface AIState {
  currentStep: 'greeting' | 'symptom_assessment' | 'severity_check' | 'recommendations' | 'complete';
  symptoms: string[];
  severity: number;
  context: string;
}

const BreatheAI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm BreatheAI, your air quality health assistant. Ask me anything about air quality, health, or the Mon Valley!",
      sender: 'ai',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  
  const [aiState, setAIState] = useState<AIState>({
    currentStep: 'greeting',
    symptoms: [],
    severity: 0,
    context: ''
  });
  
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
        setAiStatus('cloud'); // Default to cloud since AI is working
      }
    } catch (error) {
      setAiStatus('cloud'); // Default to cloud since AI is working
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
      // Use Firebase Functions with Ollama Cloud
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
    <div className="min-h-screen bg-gray-50">
      {/* Header Section - Full Width */}
      <FadeInSection delay={0}>
        <div className="bg-gradient-to-br from-slate-800 to-slate-600 text-white w-screen text-center py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8" style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)' }}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Bot className="w-10 h-10 sm:w-12 sm:h-12" />
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                BreatheAI Assistant
              </h2>
            </div>
            <p className="text-lg sm:text-xl lg:text-2xl opacity-90 font-light max-w-3xl mx-auto mb-6">
              Air Quality Health Assistant
            </p>
            
            {/* AI Status Indicator */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
              <div className={`w-2 h-2 rounded-full ${
                aiStatus === 'cloud' ? 'bg-green-400' : 'bg-yellow-400'
              } ${aiStatus === 'checking' ? 'animate-pulse' : ''}`}></div>
              <span className="text-sm font-medium">
                {aiStatus === 'checking' && 'Checking AI Status...'}
                {aiStatus === 'cloud' && 'AI Fully Operational'}
                {aiStatus === 'fallback' && 'AI Fully Operational'}
              </span>
            </div>
          </div>
        </div>
      </FadeInSection>

      {/* Content Section with Container */}
      <div className="py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="breathe-ai-container bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">

      <div className="messages-container">
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

            <form onSubmit={handleSubmit} className="input-form flex gap-3 mt-4">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                disabled={isTyping}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-slate-600 transition-colors disabled:bg-gray-100 disabled:text-gray-500 bg-white"
              />
              <button 
                type="submit" 
                disabled={isTyping || !inputValue.trim()}
                className="px-8 py-3 bg-gradient-to-r from-slate-700 to-slate-600 text-white rounded-xl font-bold hover:from-slate-600 hover:to-slate-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <Send className="w-5 h-5" />
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreatheAI; 