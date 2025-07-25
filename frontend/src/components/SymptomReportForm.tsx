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
        // Optionally, if age is stored in user profile, setAge(u.age || '');
      } else {
        // Generate anonymous user ID for non-authenticated users
        const anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setAnonymousUserId(anonymousId);
      }
    });
    return () => unsubscribe();
  }, []);

  // Add symptom
  const handleAddSymptom = () => {
    if (symptomInput.trim() && !symptoms.includes(symptomInput.trim())) {
      setSymptoms([...symptoms, symptomInput.trim()]);
      setSymptomInput('');
    }
  };

  // Remove symptom
  const handleRemoveSymptom = (symptom: string) => {
    setSymptoms(symptoms.filter(s => s !== symptom));
  };

  // Validate fields for each step
  const validateStep = () => {
    if (step === 1 && !user?.uid && !anonymousUserId) return 'User ID is required.';
    if (step === 2 && symptoms.length === 0) return 'Please add at least one symptom.';
    if (step === 3 && (!osac.onset || !osac.course)) return 'Please fill in all required fields.';
    return null;
  };

  // Handle next step
  const handleNext = () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep(step + 1);
  };

  // Handle previous step
  const handleBack = () => {
    setError(null);
    setStep(step - 1);
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    setSubmitError('');
    setSubmitSuccess(false);
    try {
      const reportData = {
        userId: user?.uid || anonymousUserId,
        fullName,
        age,
        symptoms,
        severity: osac.severity,
        osac,
        submittedAt: new Date().toISOString(),
      };
      
      // Use Firestore directly instead of API endpoint
      const { addDoc, collection } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      const docRef = await addDoc(collection(db, 'symptomReports'), reportData);
      
      setSuccessMsg('Report submitted successfully!');
      onSuccess(docRef.id);
      
      // Reset form
      setUser(null);
      setFullName('');
      setAge('');
      setSymptoms([]);
      setOSAC(initialOSAC);
      setStep(1);
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message);
      setSubmitError('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  // Progress bar
  const progress = (step / 4) * 100;

  return (
    <form className="symptom-report-form" onSubmit={handleSubmit} aria-label="Symptom Report Form">
      <h2>📝 Submit Symptom Report</h2>
      <div className="progress-bar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} style={{ width: '100%', background: '#eee', borderRadius: 8, marginBottom: 16 }}>
        <div style={{ width: `${progress}%`, height: 8, background: '#1976d2', borderRadius: 8, transition: 'width 0.3s' }} />
      </div>
      {error && <div className="error" style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      {submitError && <div className="error" style={{ color: 'red', marginBottom: 8 }}>{submitError}</div>}
      {successMsg && <div className="success" style={{ color: 'green', marginBottom: 8 }}>{successMsg}</div>}
      {submitSuccess && <div className="success" style={{ color: 'green', marginBottom: 8 }}>Report submitted successfully!</div>}
      {step === 1 && (
        <div className="form-step">
          <label htmlFor="userId">
            <span>User ID*</span>
            <span title="A unique identifier for your session. This can be anonymous."> ℹ️</span>
            <input
              id="userId"
              value={user?.uid || anonymousUserId}
              onChange={() => {}}
              required
              autoFocus
              aria-required="true"
              aria-label="User ID"
              disabled
              style={{ backgroundColor: '#f5f5f5', color: '#333' }}
            />
          </label>
          <label>
            <span>Full Name</span>
            <span title="Your full name for record keeping."> ℹ️</span>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Enter your full name"
              aria-label="Full Name"
              disabled={!!user}
            />
          </label>
          <label>
            <span>Age</span>
            <span title="Your age for record keeping."> ℹ️</span>
            <input
              type="number"
              value={age}
              onChange={e => setAge(e.target.value)}
              placeholder="Enter your age"
              aria-label="Age"
              disabled={!!user}
            />
          </label>
          <button type="button" onClick={handleNext} className="next-btn">Next ➡️</button>
        </div>
      )}
      {step === 2 && (
        <div className="form-step">
          <label>
            <span>Symptoms* (add one at a time)</span>
            <span title="List each symptom you are experiencing. E.g., headache, cough, etc."> ℹ️</span>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                value={symptomInput}
                onChange={e => setSymptomInput(e.target.value)}
                placeholder="Enter symptom"
                aria-label="Enter symptom"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSymptom(); } }}
              />
              <button type="button" onClick={handleAddSymptom} className="add-btn">Add</button>
            </div>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {symptoms.map((s, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{s}</span>
                  <button type="button" aria-label={`Remove ${s}`} onClick={() => handleRemoveSymptom(s)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>✖️</button>
                </li>
              ))}
            </ul>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={handleBack} className="back-btn">⬅️ Back</button>
            <button type="button" onClick={handleNext} className="next-btn">Next ➡️</button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="form-step">
          <label>
            <span>Onset*</span>
            <span title="How did the symptoms start?"> ℹ️</span>
            <select value={osac.onset} onChange={e => setOSAC({ ...osac, onset: e.target.value })} required aria-required="true">
              <option value="">Select</option>
              {onsetOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </label>
          <label>
            <span>Severity*</span>
            <span title="How severe are your symptoms?"> ℹ️</span>
            <select value={osac.severity} onChange={e => setOSAC({ ...osac, severity: Number(e.target.value) })} required aria-required="true">
              {severityLabels.map((label, idx) => <option key={label} value={idx + 1}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>Aggravating Factors</span>
            <span title="What makes your symptoms worse? (Select all that apply)"> ℹ️</span>
            <select
              multiple
              value={osac.aggravatingFactors}
              onChange={e => {
                const options = Array.from(e.target.selectedOptions, (o: HTMLOptionElement) => o.value);
                setOSAC({ ...osac, aggravatingFactors: options });
              }}
              aria-label="Aggravating Factors"
            >
              {aggravatingOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </label>
          <label>
            <span>Course*</span>
            <span title="How are your symptoms changing?"> ℹ️</span>
            <select value={osac.course} onChange={e => setOSAC({ ...osac, course: e.target.value })} required aria-required="true">
              <option value="">Select</option>
              {courseOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={handleBack} className="back-btn">⬅️ Back</button>
            <button type="button" onClick={handleNext} className="next-btn">Next ➡️</button>
          </div>
        </div>
      )}
      {step === 4 && (
        <div className="form-step">
          <h3>Review Your Report</h3>
          <div className="review-summary" style={{ 
            background: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '12px', 
            marginBottom: '20px',
            border: '2px solid #e9ecef',
            color: '#333',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            <div style={{ marginBottom: '8px' }}><strong style={{ color: '#1976d2' }}>User ID:</strong> <span style={{ color: '#666' }}>{user?.uid || anonymousUserId}</span></div>
            <div style={{ marginBottom: '8px' }}><strong style={{ color: '#1976d2' }}>Full Name:</strong> <span style={{ color: '#666' }}>{fullName || 'N/A'}</span></div>
            <div style={{ marginBottom: '8px' }}><strong style={{ color: '#1976d2' }}>Age:</strong> <span style={{ color: '#666' }}>{age || 'N/A'}</span></div>
            <div style={{ marginBottom: '8px' }}><strong style={{ color: '#1976d2' }}>Symptoms:</strong> <span style={{ color: '#666' }}>{symptoms.join(', ')}</span></div>
            <div style={{ marginBottom: '8px' }}><strong style={{ color: '#1976d2' }}>Onset:</strong> <span style={{ color: '#666' }}>{osac.onset}</span></div>
            <div style={{ marginBottom: '8px' }}><strong style={{ color: '#1976d2' }}>Severity:</strong> <span style={{ color: '#666' }}>{severityLabels[osac.severity - 1]}</span></div>
            <div style={{ marginBottom: '8px' }}><strong style={{ color: '#1976d2' }}>Aggravating Factors:</strong> <span style={{ color: '#666' }}>{osac.aggravatingFactors.join(', ') || 'None'}</span></div>
            <div style={{ marginBottom: '8px' }}><strong style={{ color: '#1976d2' }}>Course:</strong> <span style={{ color: '#666' }}>{osac.course}</span></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={handleBack} className="back-btn">⬅️ Back</button>
            <button type="submit" className="submit-btn" disabled={loading || isSubmitting}>{loading || isSubmitting ? 'Submitting...' : 'Submit Report'}</button>
          </div>
        </div>
      )}
    </form>
  );
};

export default SymptomReportForm; 