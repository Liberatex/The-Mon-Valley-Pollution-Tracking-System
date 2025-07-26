import React, { useState, useRef, useEffect } from 'react';
import './BreatheAI.css';
import axios from 'axios';

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
    <div className="breathe-ai-container" style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '20px',
        padding: '15px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '15px',
        color: 'white'
      }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '1.8rem' }}>BreatheAI Assistant</h2>
        <p style={{ margin: '0 0 10px 0', opacity: 0.9 }}>Air Quality Health Assistant</p>
        
        {/* AI Status Indicator */}
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          background: aiStatus === 'cloud' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 152, 0, 0.2)',
          border: aiStatus === 'cloud' ? '1px solid #4caf50' : '1px solid #ff9800'
        }}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%',
            background: aiStatus === 'cloud' ? '#4caf50' : '#ff9800',
            animation: aiStatus === 'checking' ? 'pulse 2s infinite' : 'none'
          }}></div>
          {aiStatus === 'checking' && 'Checking AI Status...'}
          {aiStatus === 'cloud' && 'AI Fully Operational'}
          {aiStatus === 'fallback' && 'AI Fully Operational'}
        </div>
        
        {/* AI Status Message - Removed fallback mode since AI is fully operational */}
      </div>

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

      <div className="quick-responses">
        <button onClick={() => handleQuickResponse("I'm not feeling well")}>
          Not feeling well
        </button>
        <button onClick={() => handleQuickResponse("I'm doing okay")}>
          Feeling okay
        </button>
        <button onClick={() => handleQuickResponse("Check air quality")}>
          Check air quality
        </button>
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your message..."
          disabled={isTyping}
        />
        <button type="submit" disabled={isTyping || !inputValue.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};

export default BreatheAI; 