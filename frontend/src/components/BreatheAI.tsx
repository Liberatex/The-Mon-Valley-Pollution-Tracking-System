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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      // Use Firebase Functions for production, localhost for development
      const baseUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:5001' 
        : 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net';
      
      const endpoint = window.location.hostname === 'localhost' 
        ? '/api/llama3-chat' 
        : '/llama3Chat';
      
      const res = await axios.post(`${baseUrl}${endpoint}`, { message: input });
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
    <div className="breathe-ai-container">
      <div className="ai-header">
        <div className="ai-avatar">🤖</div>
        <div className="ai-info">
          <h3>BreatheAI Assistant</h3>
          <p>Air Quality Health Assistant</p>
        </div>
        <div className="ai-status">
          {isTyping ? 'Typing...' : 'Online'}
        </div>
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