import React, { useState, useEffect } from 'react';
import './SymptomReportForm.css';
import { getAuth } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

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
      
      const isDevelopment = process.env.REACT_APP_USE_EMULATOR === 'true';
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
    <div style={{ 
      minHeight: '100vh',
      background: '#f5f7fa',
      padding: '40px 20px'
    }}>
      <div style={{ 
        maxWidth: '700px', 
        margin: '0 auto',
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
      }}>
        <h2 style={{ 
          textAlign: 'center',
          color: '#1976d2',
          marginBottom: '30px',
          fontSize: '2rem',
          fontWeight: 'bold'
        }}>
          📝 Submit Symptom Report
        </h2>
        
        {/* Progress Bar */}
        <div style={{ 
          marginBottom: '30px',
          position: 'relative'
        }}>
          <div style={{ 
            width: '100%', 
            height: '10px', 
            background: '#e0e0e0', 
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              width: `${progress}%`, 
              height: '100%', 
              background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)', 
              borderRadius: '10px', 
              transition: 'width 0.5s ease' 
            }} />
          </div>
          <div style={{ 
            textAlign: 'center', 
            marginTop: '8px',
            color: '#666',
            fontSize: '0.9rem'
          }}>
            Step {step} of 4
          </div>
        </div>

        {/* Messages */}
        {error && <div style={{ 
          background: '#ffebee', 
          color: '#c62828', 
          padding: '12px 16px', 
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #ffcdd2'
        }}>{error}</div>}
        {submitError && <div style={{ 
          background: '#ffebee', 
          color: '#c62828', 
          padding: '12px 16px', 
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #ffcdd2'
        }}>{submitError}</div>}
        {successMsg && <div style={{ 
          background: '#e8f5e9', 
          color: '#2e7d32', 
          padding: '12px 16px', 
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #c8e6c9'
        }}>{successMsg}</div>}

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
            <h3 style={{ 
              color: '#1976d2', 
              marginBottom: '20px',
              fontSize: '1.4rem'
            }}>Personal Information</h3>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                color: '#333',
                fontWeight: '600'
              }}>
                User ID *
              </label>
              <input
                type="text"
                value={user?.uid || anonymousUserId}
                onChange={() => {}}
                required
                disabled
                style={{
                  width: '100%',
                  padding: '14px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  backgroundColor: '#f5f5f5',
                  color: '#666',
                  transition: 'border-color 0.3s'
                }}
              />
              <p style={{ 
                marginTop: '4px',
                color: '#999',
                fontSize: '0.85rem'
              }}>A unique identifier for your session</p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                color: '#333',
                fontWeight: '600'
              }}>
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Enter your full name"
                disabled={!!user}
                style={{
                  width: '100%',
                  padding: '14px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#1976d2'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e0e0e0'; }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                color: '#333',
                fontWeight: '600'
              }}>
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
                style={{
                  width: '100%',
                  padding: '14px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#1976d2'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e0e0e0'; }}
              />
            </div>

            <button type="submit" style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(25, 118, 210, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              Next →
            </button>
          </form>
        )}

        {/* Step 2: Symptoms */}
        {step === 2 && (
          <div>
            <h3 style={{ 
              color: '#1976d2', 
              marginBottom: '20px',
              fontSize: '1.4rem'
            }}>Symptoms</h3>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '12px',
                color: '#333',
                fontWeight: '600'
              }}>
                Add Symptoms *
              </label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <input
                  type="text"
                  value={symptomInput}
                  onChange={e => setSymptomInput(e.target.value)}
                  placeholder="Enter symptom (e.g., headache, cough)"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSymptom(); } }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    transition: 'border-color 0.3s'
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#1976d2'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e0e0e0'; }}
                />
                <button 
                  type="button" 
                  onClick={handleAddSymptom}
                  style={{
                    padding: '12px 24px',
                    background: '#f5f5f5',
                    border: '2px solid #e0e0e0',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    color: '#333',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e0e0e0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f5f5f5';
                  }}
                >
                  Add
                </button>
              </div>

              {symptoms.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  {symptoms.map((symptom, i) => (
                    <div key={i} style={{
                      background: '#e3f2fd',
                      color: '#1976d2',
                      padding: '8px 12px',
                      borderRadius: '20px',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>{symptom}</span>
                      <button 
                        type="button"
                        onClick={() => handleRemoveSymptom(symptom)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#1976d2',
                          cursor: 'pointer',
                          fontSize: '1.2rem',
                          padding: '0',
                          margin: '0',
                          lineHeight: '1'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button"
                onClick={handleBack}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#f5f5f5',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  color: '#333'
                }}
              >
                ← Back
              </button>
              <button 
                type="button"
                onClick={handleNext}
                disabled={symptoms.length === 0}
                style={{
                  flex: 2,
                  padding: '14px',
                  background: symptoms.length === 0 ? '#ccc' : 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: symptoms.length === 0 ? 'not-allowed' : 'pointer',
                  color: 'white',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (symptoms.length > 0) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: OSAC */}
        {step === 3 && (
          <div>
            <h3 style={{ 
              color: '#1976d2', 
              marginBottom: '20px',
              fontSize: '1.4rem'
            }}>Symptom Details</h3>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '12px',
                color: '#333',
                fontWeight: '600'
              }}>
                Onset *
              </label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {onsetOptions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setOSAC({ ...osac, onset: opt })}
                    style={{
                      padding: '12px 20px',
                      background: osac.onset === opt ? '#e3f2fd' : '#f5f5f5',
                      border: `2px solid ${osac.onset === opt ? '#1976d2' : '#e0e0e0'}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      color: osac.onset === opt ? '#1976d2' : '#333',
                      fontWeight: osac.onset === opt ? '600' : '400',
                      transition: 'all 0.2s'
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '12px',
                color: '#333',
                fontWeight: '600'
              }}>
                Severity *
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={osac.severity}
                onChange={e => setOSAC({ ...osac, severity: parseInt(e.target.value) })}
                style={{
                  width: '100%',
                  marginBottom: '10px'
                }}
              />
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                color: '#666',
                fontSize: '0.9rem'
              }}>
                {severityLabels.map((label, i) => (
                  <span key={i} style={{
                    color: osac.severity === i + 1 ? '#1976d2' : '#999',
                    fontWeight: osac.severity === i + 1 ? '600' : '400'
                  }}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '12px',
                color: '#333',
                fontWeight: '600'
              }}>
                Course *
              </label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {courseOptions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setOSAC({ ...osac, course: opt })}
                    style={{
                      padding: '12px 20px',
                      background: osac.course === opt ? '#e3f2fd' : '#f5f5f5',
                      border: `2px solid ${osac.course === opt ? '#1976d2' : '#e0e0e0'}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      color: osac.course === opt ? '#1976d2' : '#333',
                      fontWeight: osac.course === opt ? '600' : '400'
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '12px',
                color: '#333',
                fontWeight: '600'
              }}>
                Aggravating Factors
              </label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
                    style={{
                      padding: '12px 16px',
                      background: osac.aggravatingFactors.includes(opt) ? '#c8e6c9' : '#f5f5f5',
                      border: `2px solid ${osac.aggravatingFactors.includes(opt) ? '#4caf50' : '#e0e0e0'}`,
                      borderRadius: '20px',
                      cursor: 'pointer',
                      color: osac.aggravatingFactors.includes(opt) ? '#2e7d32' : '#333',
                      fontWeight: osac.aggravatingFactors.includes(opt) ? '600' : '400',
                      fontSize: '0.9rem'
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button"
                onClick={handleBack}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#f5f5f5',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  color: '#333'
                }}
              >
                ← Back
              </button>
              <button 
                type="button"
                onClick={handleNext}
                style={{
                  flex: 2,
                  padding: '14px',
                  background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  color: 'white',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <form onSubmit={handleSubmit}>
            <h3 style={{ 
              color: '#1976d2', 
              marginBottom: '20px',
              fontSize: '1.4rem'
            }}>Review & Submit</h3>
            
            <div style={{
              background: '#f8f9fa',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <h4 style={{ color: '#333', marginBottom: '12px' }}>Personal Information</h4>
              <p style={{ color: '#666', margin: '4px 0' }}><strong>User ID:</strong> {user?.uid || anonymousUserId}</p>
              {fullName && <p style={{ color: '#666', margin: '4px 0' }}><strong>Name:</strong> {fullName}</p>}
              {age && <p style={{ color: '#666', margin: '4px 0' }}><strong>Age:</strong> {age}</p>}
            </div>

            <div style={{
              background: '#f8f9fa',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <h4 style={{ color: '#333', marginBottom: '12px' }}>Symptoms</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {symptoms.map((s, i) => (
                  <span key={i} style={{
                    background: '#e3f2fd',
                    color: '#1976d2',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.9rem'
                  }}>{s}</span>
                ))}
              </div>
            </div>

            <div style={{
              background: '#f8f9fa',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <h4 style={{ color: '#333', marginBottom: '12px' }}>Details</h4>
              <p style={{ color: '#666', margin: '4px 0' }}><strong>Onset:</strong> {osac.onset}</p>
              <p style={{ color: '#666', margin: '4px 0' }}><strong>Severity:</strong> {severityLabels[osac.severity - 1]}</p>
              <p style={{ color: '#666', margin: '4px 0' }}><strong>Course:</strong> {osac.course}</p>
              {osac.aggravatingFactors.length > 0 && (
                <p style={{ color: '#666', margin: '4px 0' }}>
                  <strong>Aggravating:</strong> {osac.aggravatingFactors.join(', ')}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button"
                onClick={handleBack}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#f5f5f5',
                  border: '2px solid #e0e0e0',
                  borderRadius: '10px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  color: '#333'
                }}
              >
                ← Back
              </button>
              <button 
                type="submit"
                disabled={loading || isSubmitting}
                style={{
                  flex: 2,
                  padding: '14px',
                  background: loading || isSubmitting ? '#ccc' : 'linear-gradient(90deg, #4caf50 0%, #66bb6a 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: loading || isSubmitting ? 'not-allowed' : 'pointer',
                  color: 'white',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!loading && !isSubmitting) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {loading || isSubmitting ? 'Submitting...' : '✓ Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SymptomReportForm;
