import React, { useState, useEffect } from 'react';
import './SymptomReportForm.css';
import { getAuth } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { shouldUseEmulator } from '../utils/env';
import { FadeInSection } from './ui/FadeInSection';
import { CheckCircle2, AlertCircle, X, Plus, ArrowRight, ArrowLeft } from 'lucide-react';

interface OSAC {
  onset: string;
  severity: number;
  aggravatingFactors: string[];
  course: string;
}

interface SymptomReportFormProps {
  onSuccess: (reportId: string) => void;
}

const initialOSAC: OSAC = {
  onset: '',
  severity: 1,
  aggravatingFactors: [],
  course: '',
};

const aggravatingOptions = [
  'Physical Activity',
  'Outdoor Exposure',
  'Industrial Smell',
  'Weather Conditions',
  'Time of Day',
];

const courseOptions = ['Improving', 'Stable', 'Worsening'];
const onsetOptions = ['Sudden', 'Gradual', 'Intermittent'];
const severityLabels = ['Mild', 'Moderate', 'Severe', 'Very Severe', 'Extreme'];

const SymptomReportForm: React.FC<SymptomReportFormProps> = ({ onSuccess }) => {
  const [user, setUser] = useState<any>(null);
  const [anonymousUserId, setAnonymousUserId] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [symptomInput, setSymptomInput] = useState('');
  const [osac, setOSAC] = useState<OSAC>(initialOSAC);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);


  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (u) {
        setUser(u);
        setFullName(u.displayName || '');
      } else {
        const anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setAnonymousUserId(anonymousId);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAddSymptom = () => {
    if (symptomInput.trim() && !symptoms.includes(symptomInput.trim())) {
      setSymptoms([...symptoms, symptomInput.trim()]);
      setSymptomInput('');
    }
  };

  const handleRemoveSymptom = (symptom: string) => {
    setSymptoms(symptoms.filter(s => s !== symptom));
  };

  const validateStep = () => {
    if (step === 1 && !user?.uid && !anonymousUserId) return 'User ID is required.';
    if (step === 2 && symptoms.length === 0) return 'Please add at least one symptom.';
    if (step === 3 && (!osac.onset || !osac.course)) return 'Please fill in all required fields.';
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep(step + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    setSubmitError('');
    setSubmitSuccess(false);
    setIsSubmitting(true);
    
    try {
      const reportData = {
        userId: user?.uid || anonymousUserId,
        fullName,
        age,
        symptoms,
        severity: osac.severity,
        osac,
        submittedAt: new Date().toISOString(),
        consent: true
      };
      
      const isDevelopment = shouldUseEmulator();
      const functionUrl = isDevelopment
        ? 'http://127.0.0.1:5001/mv-pollution-tracking-system/us-central1/submitSymptomReport'
        : 'https://us-central1-mv-pollution-tracking-system.cloudfunctions.net/submitSymptomReport';
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit report');
      }
      
      const result = await response.json();
      
      setSuccessMsg('Report submitted successfully! Your data has been securely recorded.');
      setSubmitSuccess(true);
      onSuccess(result.reportId);
      
      setTimeout(() => {
        setFullName('');
        setAge('');
        setSymptoms([]);
        setOSAC(initialOSAC);
        setStep(1);
        setSubmitSuccess(false);
        setSuccessMsg(null);
      }, 3000);
      
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit report. Please try again.');
      setSubmitError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const progress = (step / 4) * 100;

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto">
      {/* Header Section - Full Width */}
      <FadeInSection delay={0}>
        <div className="bg-gradient-to-br from-slate-800 to-slate-600 text-white w-screen text-center py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-8" style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)' }}>
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 tracking-tight">
              Submit Symptom Report
        </h2>
            <p className="text-lg sm:text-xl lg:text-2xl opacity-90 font-light max-w-3xl mx-auto">
              Help us track health impacts and advocate for cleaner air in the Mon Valley
            </p>
          </div>
        </div>
      </FadeInSection>

      {/* Content Section with Container */}
      <div className="py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8 min-h-screen">
        <div className="max-w-3xl mx-auto">

        {/* Information Section */}
        <FadeInSection delay={0.1}>
          <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-2xl shadow-lg border border-blue-200 p-6 sm:p-8 mb-8">
            <div className="flex items-start gap-4">
              <div className="bg-slate-700 p-3 rounded-xl flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-3">
                  Why Report Your Symptoms?
                </h3>
                <p className="text-gray-700 mb-4 leading-relaxed">
                  Your health reports are crucial for documenting the real-world impacts of air pollution in the Mon Valley. 
                  By sharing your symptoms, you're helping VCAN build evidence to advocate for cleaner air and hold polluters accountable.
                </p>
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">HIPAA Compliant</p>
                      <p className="text-xs text-gray-600">Your data is encrypted and protected</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Anonymous Option</p>
                      <p className="text-xs text-gray-600">Report without sharing personal details</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Evidence Building</p>
                      <p className="text-xs text-gray-600">Help create advocacy reports</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Quick & Easy</p>
                      <p className="text-xs text-gray-600">Takes less than 5 minutes</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeInSection>

        {/* Main Form Card */}
        <FadeInSection delay={0.2}>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 lg:p-10">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-700">Step {step} of 4</span>
                <span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-slate-700 to-slate-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
          </div>
        </div>

        {/* Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-800 text-sm font-medium">{error}</p>
              </div>
            )}
            {submitError && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-800 text-sm font-medium">{submitError}</p>
              </div>
            )}
            {successMsg && (
              <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-green-800 text-sm font-medium">{successMsg}</p>
              </div>
            )}

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
                <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-sm font-semibold">1</span>
                  Personal Information
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      User ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={user?.uid || anonymousUserId}
                onChange={() => {}}
                required
                disabled
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 focus:outline-none focus:border-slate-600 transition-colors"
                    />
                    <p className="mt-2 text-xs text-gray-500">A unique identifier for your session</p>
            </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Enter your full name"
                disabled={!!user}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-slate-600 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                Age
              </label>
              <input
                type="number"
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="Enter your age"
                disabled={!!user}
                min="1"
                max="120"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-slate-600 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
            </div>

                <button 
                  type="submit" 
                  className="w-full mt-8 px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-600 text-white rounded-xl font-semibold text-lg hover:from-slate-600 hover:to-slate-500 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl flex items-center justify-center gap-2"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        )}

        {/* Step 2: Symptoms */}
        {step === 2 && (
          <div>
                <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-sm font-semibold">2</span>
                  Symptoms
                </h3>
                
                <div className="mb-8">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Add Symptoms <span className="text-red-500">*</span>
              </label>
                  <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={symptomInput}
                  onChange={e => setSymptomInput(e.target.value)}
                  placeholder="Enter symptom (e.g., headache, cough)"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSymptom(); } }}
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-slate-600 transition-colors"
                />
                <button 
                  type="button" 
                  onClick={handleAddSymptom}
                      className="px-6 py-3 bg-slate-700 text-white rounded-xl font-semibold hover:bg-slate-600 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                  Add
                </button>
              </div>

              {symptoms.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                  {symptoms.map((symptom, i) => (
                        <div key={i} className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-full text-sm font-medium">
                      <span>{symptom}</span>
                      <button 
                        type="button"
                        onClick={() => handleRemoveSymptom(symptom)}
                            className="hover:bg-slate-200 rounded-full p-1 transition-colors"
                          >
                            <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

                <div className="flex gap-4">
              <button 
                type="button"
                onClick={handleBack}
                    className="flex-1 px-6 py-4 bg-gray-100 text-slate-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back
              </button>
              <button 
                type="button"
                onClick={handleNext}
                disabled={symptoms.length === 0}
                    className={`flex-2 px-6 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                      symptoms.length === 0 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-slate-700 to-slate-600 text-white hover:from-slate-600 hover:to-slate-500 hover:-translate-y-1 hover:shadow-xl'
                    }`}
                  >
                    Continue
                    <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: OSAC */}
        {step === 3 && (
          <div>
                <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-sm font-semibold">3</span>
                  Symptom Details
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Onset <span className="text-red-500">*</span>
              </label>
                    <div className="flex flex-wrap gap-3">
                {onsetOptions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setOSAC({ ...osac, onset: opt })}
                          className={`px-5 py-3 rounded-xl font-medium transition-all ${
                            osac.onset === opt
                              ? 'bg-slate-700 text-white shadow-lg'
                              : 'bg-gray-100 text-slate-700 hover:bg-gray-200 border-2 border-transparent'
                          }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Severity <span className="text-red-500">*</span>
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={osac.severity}
                onChange={e => setOSAC({ ...osac, severity: parseInt(e.target.value) })}
                      className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-slate-700 mb-4"
                    />
                    <div className="flex justify-between text-xs text-gray-600">
                {severityLabels.map((label, i) => (
                        <span key={i} className={osac.severity === i + 1 ? 'font-bold text-slate-700' : ''}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Course <span className="text-red-500">*</span>
              </label>
                    <div className="flex flex-wrap gap-3">
                {courseOptions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setOSAC({ ...osac, course: opt })}
                          className={`px-5 py-3 rounded-xl font-medium transition-all ${
                            osac.course === opt
                              ? 'bg-slate-700 text-white shadow-lg'
                              : 'bg-gray-100 text-slate-700 hover:bg-gray-200 border-2 border-transparent'
                          }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                Aggravating Factors
              </label>
                    <div className="flex flex-wrap gap-3">
                {aggravatingOptions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      const updated = osac.aggravatingFactors.includes(opt)
                        ? osac.aggravatingFactors.filter(f => f !== opt)
                        : [...osac.aggravatingFactors, opt];
                      setOSAC({ ...osac, aggravatingFactors: updated });
                    }}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            osac.aggravatingFactors.includes(opt)
                              ? 'bg-slate-700 text-white shadow-md'
                              : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
                          }`}
                  >
                    {opt}
                  </button>
                ))}
                    </div>
              </div>
            </div>

                <div className="flex gap-4 mt-8">
              <button 
                type="button"
                onClick={handleBack}
                    className="flex-1 px-6 py-4 bg-gray-100 text-slate-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back
              </button>
              <button 
                type="button"
                onClick={handleNext}
                    className="flex-2 px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-600 text-white rounded-xl font-semibold hover:from-slate-600 hover:to-slate-500 transition-all hover:-translate-y-1 hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    Continue
                    <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <form onSubmit={handleSubmit}>
                <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-sm font-semibold">4</span>
                  Review & Submit
                </h3>
                
                <div className="space-y-4 mb-8">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-slate-800 mb-4">Personal Information</h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700"><strong className="text-slate-700">User ID:</strong> {user?.uid || anonymousUserId}</p>
                      {fullName && <p className="text-gray-700"><strong className="text-slate-700">Name:</strong> {fullName}</p>}
                      {age && <p className="text-gray-700"><strong className="text-slate-700">Age:</strong> {age}</p>}
                    </div>
            </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-slate-800 mb-4">Symptoms</h4>
                    <div className="flex flex-wrap gap-2">
                {symptoms.map((s, i) => (
                        <span key={i} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-full text-sm font-medium">
                          {s}
                        </span>
                ))}
              </div>
            </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-slate-800 mb-4">Details</h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700"><strong className="text-slate-700">Onset:</strong> {osac.onset}</p>
                      <p className="text-gray-700"><strong className="text-slate-700">Severity:</strong> {severityLabels[osac.severity - 1]}</p>
                      <p className="text-gray-700"><strong className="text-slate-700">Course:</strong> {osac.course}</p>
              {osac.aggravatingFactors.length > 0 && (
                        <p className="text-gray-700">
                          <strong className="text-slate-700">Aggravating:</strong> {osac.aggravatingFactors.join(', ')}
                </p>
              )}
                    </div>
                  </div>
            </div>

                <div className="flex gap-4">
              <button 
                type="button"
                onClick={handleBack}
                    className="flex-1 px-6 py-4 bg-gray-100 text-slate-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back
              </button>
              <button 
                type="submit"
                disabled={loading || isSubmitting}
                    className={`flex-2 px-6 py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                      loading || isSubmitting
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-500 hover:to-green-400 hover:-translate-y-1 hover:shadow-xl'
                    }`}
                  >
                    {loading || isSubmitting ? (
                      <>Submitting...</>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Submit Report
                      </>
                    )}
              </button>
            </div>
          </form>
        )}
          </div>
        </FadeInSection>
        </div>
      </div>
    </div>
  );
};

export default SymptomReportForm;
