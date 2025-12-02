/**
 * BreatheAIChatOSAC - Enhanced version with OSAC framework integration
 * Implements Odors/Symptoms/Actions/Causes protocol
 */

import React, { useState, useRef, useEffect } from 'react';
import './BreatheAI.css';
import axios from 'axios';
import { Send, X } from 'lucide-react';
import { BreatheAILogo } from './BreatheAILogo';
import {
  OSACData,
  classifySymptom,
  detectOdor,
  generateOSACQuestions,
  correlateWithSensors,
} from '../services/osacFramework';
import { useRealtimeSensorData } from '../hooks/useRealtimeSensorData';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type: 'text' | 'question' | 'suggestion' | 'alert';
  options?: string[];
}

interface BreatheAIChatOSACProps {
  compact?: boolean;
  onClose?: () => void;
}

export const BreatheAIChatOSAC: React.FC<BreatheAIChatOSACProps> = ({
  compact = false,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm BreatheAI, your air quality health assistant. I can help you report symptoms, check air quality, and get personalized recommendations. How can I help you today?",
      sender: 'ai',
      timestamp: new Date(),
      type: 'text',
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [osacData, setOsacData] = useState<Partial<OSACData>>({
    odors: [],
    symptoms: [],
    actions: [],
    causes: [],
    timestamp: new Date(),
  });
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get real-time sensor data for correlation
  const { sensors } = useRealtimeSensorData(60000);

  const scrollToBottom = () => {
    if (
      messagesEndRef.current &&
      typeof messagesEndRef.current.scrollIntoView === 'function'
    ) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (
    text: string,
    sender: 'user' | 'ai',
    type: 'text' | 'question' | 'suggestion' | 'alert' = 'text',
    options?: string[]
  ) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
      type,
      options,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const processUserInput = async (input: string) => {
    const lowerInput = input.toLowerCase();

    // Detect symptoms
    const symptomClassification = classifySymptom(input);
    if (symptomClassification.confidence > 0) {
      const currentSymptoms = osacData.symptoms || [];
      if (!currentSymptoms.includes(symptomClassification.category)) {
        setOsacData((prev) => ({
          ...prev,
          symptoms: [...currentSymptoms, symptomClassification.category],
        }));
      }
    }

    // Detect odors
    const detectedOdors = detectOdor(input);
    if (detectedOdors.length > 0) {
      const currentOdors = osacData.odors || [];
      const newOdors = detectedOdors.filter((o) => !currentOdors.includes(o));
      if (newOdors.length > 0) {
        setOsacData((prev) => ({
          ...prev,
          odors: [...currentOdors, ...newOdors],
        }));
      }
    }

    // Generate OSAC questions
    const questions = generateOSACQuestions(osacData, input);

    // If we have enough data, correlate with sensors
    if (
      (osacData.symptoms && osacData.symptoms.length > 0) ||
      (osacData.odors && osacData.odors.length > 0)
    ) {
      // Try to get user location
      if (navigator.geolocation && !osacData.location?.lat) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              indoor: osacData.location?.indoor,
            };

            setOsacData((prev) => ({ ...prev, location }));

            // Correlate with sensors
            const sensorData = sensors.map((s) => ({
              lat: s.location.lat,
              lng: s.location.lng,
              pm25: s.pm25,
            }));

            const correlation = await correlateWithSensors(
              { ...osacData, location } as OSACData,
              sensorData
            );

            addMessage(correlation.recommendation, 'ai', 'suggestion');
          },
          () => {
            // Location denied - continue without it
          }
        );
      } else if (osacData.location?.lat) {
        // Already have location, correlate
        const sensorData = sensors.map((s) => ({
          lat: s.location.lat,
          lng: s.location.lng,
          pm25: s.pm25,
        }));

        const correlation = await correlateWithSensors(
          osacData as OSACData,
          sensorData
        );

        addMessage(correlation.recommendation, 'ai', 'suggestion');
      }
    }

    // Ask OSAC questions
    if (questions.length > 0 && !awaitingResponse) {
      const question = questions[0];
      setAwaitingResponse(true);
      addMessage(question.question, 'ai', 'question', question.options);
      return;
    }

    // Send to AI for general conversation
    await sendToAI(input);
  };

  const sendToAI = async (input: string) => {
    setIsTyping(true);
    try {
      const baseUrl =
        'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net';
      const res = await axios.post(`${baseUrl}/llama3Chat`, {
        message: input,
        context: {
          osacData,
          hasSymptoms: (osacData.symptoms?.length || 0) > 0,
          hasOdors: (osacData.odors?.length || 0) > 0,
        },
      });
      const response = res.data.response || 'Sorry, I could not generate a response.';
      addMessage(response, 'ai');
    } catch (error) {
      console.error('AI Chat Error:', error);
      addMessage(
        'Sorry, there was an error connecting to the AI assistant. Please try again.',
        'ai',
        'alert'
      );
    } finally {
      setIsTyping(false);
      setAwaitingResponse(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    addMessage(inputValue, 'user');
    const userInput = inputValue;
    setInputValue('');
    await processUserInput(userInput);
  };

  const handleOptionSelect = async (option: string) => {
    addMessage(option, 'user');
    setInputValue('');
    await processUserInput(option);
  };

  return (
    <div className={`breathe-ai-chat ${compact ? 'compact' : ''}`}>
      {compact && (
        <div className="chat-header bg-gradient-to-r from-slate-700 to-slate-600 text-white px-4 py-3 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BreatheAILogo size="sm" variant="with-text" />
            <span className="text-xs opacity-90">OSAC Mode</span>
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
            {message.options && message.options.length > 0 && (
              <div className="message-options mt-2 flex flex-wrap gap-2">
                {message.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionSelect(option)}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 transition-colors"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
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

      <form
        onSubmit={handleSubmit}
        className="input-form flex gap-2 sm:gap-3 mt-4 w-full max-w-full"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Describe your symptoms or ask a question..."
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

