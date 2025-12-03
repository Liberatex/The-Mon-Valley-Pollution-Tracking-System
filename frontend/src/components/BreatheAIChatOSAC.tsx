/**
 * BreatheAIChatOSAC - Enhanced version with OSAC framework integration
 * Implements Odors/Symptoms/Actions/Causes protocol
 */

import React, { useState, useRef, useEffect } from 'react';
import './BreatheAI.css';
import axios from 'axios';
import { Send, X, CheckCircle } from 'lucide-react';
import { BreatheAILogo } from './BreatheAILogo';
import {
  OSACData,
  classifySymptom,
  detectOdor,
  generateOSACQuestions,
  correlateWithSensors,
} from '../services/osacFramework';
import { useRealtimeSensorData } from '../hooks/useRealtimeSensorData';
import { shouldUseEmulator } from '../utils/env';
import { getAuth } from 'firebase/auth';

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
      text: "Hello! I'm BreatheAI, your air quality health assistant. I can help you:\n\n• Report symptoms and health impacts (just describe what you're experiencing and I'll guide you through the process)\n• Check air quality in your area\n• Get personalized health recommendations\n• Submit symptom reports for advocacy and regulatory action\n\nWhat would you like to do today?",
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
  
  // Additional OSAC fields for full symptom reporting (matching SymptomReportForm)
  const [osacDetails, setOsacDetails] = useState<{
    onset?: string; // 'Sudden' | 'Gradual' | 'Intermittent'
    severity?: number; // 1-5 scale
    course?: string; // 'Improving' | 'Stable' | 'Worsening'
    aggravatingFactors?: string[]; // From aggravatingOptions
  }>({});
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
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

  // Submit symptom report (VCAN requirement - BreatheAI symptom reporting module)
  const submitSymptomReport = async () => {
    if (!osacData.symptoms || osacData.symptoms.length === 0) {
      addMessage('I need to know about your symptoms first. Can you describe what you\'re experiencing?', 'ai', 'question');
      return;
    }

    setSubmittingReport(true);
    addMessage('Submitting your symptom report...', 'ai');

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      const userId = user?.uid || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Map OSAC data to symptom report format (matching SymptomReportForm structure)
      const reportData = {
        userId,
        fullName: '', // Can be collected if needed
        age: '', // Can be collected if needed
        symptoms: osacData.symptoms || [],
        severity: osacDetails.severity || Math.min(5, (osacData.symptoms?.length || 1) + 1),
        osac: {
          onset: osacDetails.onset || 'Gradual', // 'Sudden' | 'Gradual' | 'Intermittent'
          severity: osacDetails.severity || Math.min(5, (osacData.symptoms?.length || 1) + 1), // 1-5 scale
          aggravatingFactors: osacDetails.aggravatingFactors || osacData.actions || osacData.odors || [],
          course: osacDetails.course || 'Stable', // 'Improving' | 'Stable' | 'Worsening'
        },
        submittedAt: new Date().toISOString(),
        location: osacData.location?.lat && osacData.location?.lng ? {
          lat: osacData.location.lat,
          lng: osacData.location.lng,
        } : undefined,
        consent: true,
      };

      const baseUrl = shouldUseEmulator()
        ? 'http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1'
        : 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net';

      const response = await axios.post(
        `${baseUrl}/submitSymptomReport`,
        reportData,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      if (response.data?.success) {
        setReportSubmitted(true);
        addMessage(
          `✅ Your symptom report has been submitted successfully! Report ID: ${response.data.reportId?.substring(0, 8)}...`,
          'ai',
          'suggestion'
        );
        addMessage(
          'Your report helps build evidence for advocacy and regulatory action. Thank you for contributing to community health tracking.',
          'ai'
        );
      } else {
        throw new Error('Submission failed');
      }
    } catch (error: any) {
      console.error('Error submitting symptom report:', error);
      addMessage(
        'Sorry, there was an error submitting your report. Please try again or use the "Report Symptoms" page.',
        'ai',
        'alert'
      );
    } finally {
      setSubmittingReport(false);
    }
  };

  const processUserInput = async (input: string) => {
    const lowerInput = input.toLowerCase();

    // Check if user wants to submit report
    if (lowerInput.includes('yes') && lowerInput.includes('submit') || 
        lowerInput.includes('submit report') ||
        lowerInput === 'yes, submit report') {
      await submitSymptomReport();
      return;
    }

    if (lowerInput.includes('no') && (lowerInput.includes('just') || lowerInput.includes('chat'))) {
      addMessage('Understood. I\'m here if you need anything else!', 'ai');
      return;
    }

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

    // Handle OSAC detail questions (onset, severity, course, aggravating factors)
    if (lowerInput.includes('sudden') || lowerInput.includes('gradual') || lowerInput.includes('intermittent')) {
      const onset = lowerInput.includes('sudden') ? 'Sudden' : 
                    lowerInput.includes('gradual') ? 'Gradual' : 'Intermittent';
      setOsacDetails(prev => ({ ...prev, onset }));
      addMessage(`Got it - your symptoms started ${onset.toLowerCase()}.`, 'ai');
    }
    
    if (lowerInput.match(/\b(1|2|3|4|5|mild|moderate|severe|very severe|extreme)\b/i)) {
      const severityMatch = lowerInput.match(/\b([1-5])\b/);
      const severity = severityMatch ? parseInt(severityMatch[1]) :
                      lowerInput.includes('mild') ? 1 :
                      lowerInput.includes('moderate') ? 2 :
                      lowerInput.includes('severe') && lowerInput.includes('very') ? 4 :
                      lowerInput.includes('severe') ? 3 :
                      lowerInput.includes('extreme') ? 5 : undefined;
      if (severity) {
        setOsacDetails(prev => ({ ...prev, severity }));
        addMessage(`I've noted your symptom severity as ${severity}/5.`, 'ai');
      }
    }
    
    if (lowerInput.includes('improving') || lowerInput.includes('stable') || lowerInput.includes('worsening')) {
      const course = lowerInput.includes('improving') ? 'Improving' :
                    lowerInput.includes('worsening') ? 'Worsening' : 'Stable';
      setOsacDetails(prev => ({ ...prev, course }));
      addMessage(`Understood - your symptoms are ${course.toLowerCase()}.`, 'ai');
    }
    
    // Handle aggravating factors (multiple selection)
    const aggravatingOptions = ['Physical Activity', 'Outdoor Exposure', 'Industrial Smell', 'Weather Conditions', 'Time of Day'];
    const detectedAggravating = aggravatingOptions.filter(option => 
      lowerInput.includes(option.toLowerCase().split(' ')[0]) || 
      (option === 'Physical Activity' && lowerInput.includes('activity')) ||
      (option === 'Outdoor Exposure' && lowerInput.includes('outdoor')) ||
      (option === 'Industrial Smell' && lowerInput.includes('industrial')) ||
      (option === 'Weather Conditions' && lowerInput.includes('weather')) ||
      (option === 'Time of Day' && lowerInput.includes('time'))
    );
    if (detectedAggravating.length > 0) {
      setOsacDetails(prev => ({
        ...prev,
        aggravatingFactors: [...(prev.aggravatingFactors || []), ...detectedAggravating].filter((v, i, a) => a.indexOf(v) === i)
      }));
      addMessage(`I've noted these aggravating factors: ${detectedAggravating.join(', ')}.`, 'ai');
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

            // Immediate feedback with correlation (VCAN requirement)
            if (correlation.correlation !== 'none') {
              const correlationLevel = correlation.correlation === 'high' ? 'strongly' : 
                                      correlation.correlation === 'medium' ? 'moderately' : 'weakly';
              addMessage(
                `🔍 I've checked nearby air quality sensors. Your symptoms ${correlationLevel} correlate with current air quality conditions.`,
                'ai',
                'suggestion'
              );
              
              if (correlation.nearbySensors && correlation.nearbySensors.length > 0) {
                const avgPM25 = correlation.nearbySensors.reduce((sum, s) => sum + (s.pm25 || 0), 0) / correlation.nearbySensors.length;
                addMessage(
                  `📊 Nearby sensors show PM2.5 levels of ${avgPM25.toFixed(1)} μg/m³. ${correlation.recommendation}`,
                  'ai',
                  'suggestion'
                );
              } else {
                addMessage(correlation.recommendation, 'ai', 'suggestion');
              }
            } else {
              addMessage(
                'I couldn\'t find nearby sensors to correlate with your symptoms. This may be due to limited sensor coverage in your area.',
                'ai',
                'alert'
              );
            }
            
            // Offer to submit symptom report if we have symptoms (VCAN requirement - closed feedback loop)
            if (osacData.symptoms && osacData.symptoms.length > 0 && !reportSubmitted) {
              addMessage(
                'Would you like me to submit a symptom report with this information? This helps track health impacts in your community and creates legally defensible data for advocacy.',
                'ai',
                'question',
                ['Yes, submit report', 'No, just chatting']
              );
            }
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

        // Immediate feedback with correlation (VCAN requirement)
        if (correlation.correlation !== 'none') {
          const correlationLevel = correlation.correlation === 'high' ? 'strongly' : 
                                  correlation.correlation === 'medium' ? 'moderately' : 'weakly';
          addMessage(
            `🔍 I've checked nearby air quality sensors. Your symptoms ${correlationLevel} correlate with current air quality conditions.`,
            'ai',
            'suggestion'
          );
          
          if (correlation.nearbySensors && correlation.nearbySensors.length > 0) {
            const avgPM25 = correlation.nearbySensors.reduce((sum, s) => sum + (s.pm25 || 0), 0) / correlation.nearbySensors.length;
            addMessage(
              `📊 Nearby sensors show PM2.5 levels of ${avgPM25.toFixed(1)} μg/m³. ${correlation.recommendation}`,
              'ai',
              'suggestion'
            );
          } else {
            addMessage(correlation.recommendation, 'ai', 'suggestion');
          }
        } else {
          addMessage(
            'I couldn\'t find nearby sensors to correlate with your symptoms. This may be due to limited sensor coverage in your area.',
            'ai',
            'alert'
          );
        }
        
        // Offer to submit symptom report if we have symptoms (VCAN requirement - closed feedback loop)
        if (osacData.symptoms && osacData.symptoms.length > 0 && !reportSubmitted) {
          addMessage(
            'Would you like me to submit a symptom report with this information? This helps track health impacts in your community and creates legally defensible data for advocacy.',
            'ai',
            'question',
            ['Yes, submit report', 'No, just chatting']
          );
        }
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

