/**
 * Health Profile Component
 * Allows users to input health information for personalized risk assessment (V_user)
 * VCAN Requirement: Vulnerability Multiplier for personalized risk
 */

import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { storeHealthProfile, getHealthProfile, HealthProfile } from '../services/vulnerabilityStorage';
import { calculateVulnerabilityScore } from '../services/weightedRiskAlgorithm';
import { FadeInSection } from './ui/FadeInSection';
import { Heart, CheckCircle, AlertCircle, User, Calendar, Activity } from 'lucide-react';

interface HealthProfileProps {
  onComplete?: () => void;
}

const HealthProfile: React.FC<HealthProfileProps> = ({ onComplete }) => {
  const [hasAsthma, setHasAsthma] = useState<boolean>(false);
  const [hasCOPD, setHasCOPD] = useState<boolean>(false);
  const [ageGroup, setAgeGroup] = useState<'child' | 'adult' | 'senior'>('adult');
  const [previousHighExposure, setPreviousHighExposure] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingProfile, setExistingProfile] = useState<HealthProfile | null>(null);

  // Load existing profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        const profile = await getHealthProfile(user.uid);
        if (profile) {
          setExistingProfile(profile);
          setHasAsthma(profile.hasAsthma);
          setHasCOPD(profile.hasCOPD);
          setAgeGroup(profile.ageGroup);
          setPreviousHighExposure(profile.previousHighExposure);
          setSaved(true);
        }
      } catch (err: any) {
        console.error('Error loading health profile:', err);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    loadProfile();
  }, []);

  // Calculate vulnerability score preview
  const vulnerabilityScore = calculateVulnerabilityScore(
    hasAsthma,
    hasCOPD,
    ageGroup,
    previousHighExposure
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('You must be logged in to save your health profile');
      }

      await storeHealthProfile({
        userId: user.uid,
        hasAsthma,
        hasCOPD,
        ageGroup,
        previousHighExposure,
      });

      setSaved(true);
      if (onComplete) {
        onComplete();
      }
    } catch (err: any) {
      console.error('Error saving health profile:', err);
      setError(err.message || 'Failed to save health profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading health profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <FadeInSection>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Heart className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                  Health Profile
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Personalize your air quality risk assessment
                </p>
              </div>
            </div>

            {saved && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Health profile saved successfully!
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Your personalized risk assessment is now active. Your vulnerability score (V_user) is {vulnerabilityScore.toFixed(2)}.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Age Group */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <Calendar className="w-4 h-4" />
                  Age Group
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setAgeGroup('child')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      ageGroup === 'child'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">Child</div>
                    <div className="text-xs text-gray-500 mt-1">Under 18</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgeGroup('adult')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      ageGroup === 'adult'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">Adult</div>
                    <div className="text-xs text-gray-500 mt-1">18-64</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgeGroup('senior')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      ageGroup === 'senior'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">Senior</div>
                    <div className="text-xs text-gray-500 mt-1">65+</div>
                  </button>
                </div>
              </div>

              {/* Health Conditions */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <Activity className="w-4 h-4" />
                  Respiratory Conditions
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={hasAsthma}
                      onChange={(e) => setHasAsthma(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">Asthma</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Increases vulnerability score by +0.5
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={hasCOPD}
                      onChange={(e) => setHasCOPD(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">COPD (Chronic Obstructive Pulmonary Disease)</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Increases vulnerability score by +0.5
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Previous Exposure */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <AlertCircle className="w-4 h-4" />
                  Exposure History
                </label>
                <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={previousHighExposure}
                    onChange={(e) => setPreviousHighExposure(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">Previous High Exposure Events</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Have you experienced severe air quality events in the past? Increases vulnerability score by +0.2
                    </div>
                  </div>
                </label>
              </div>

              {/* Vulnerability Score Preview */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-blue-900">Your Vulnerability Score (V_user):</span>
                  <span className="text-lg font-bold text-blue-700">{vulnerabilityScore.toFixed(2)}</span>
                </div>
                <div className="text-xs text-blue-700 mt-2">
                  This multiplier will be applied to your personalized risk assessment. Higher scores mean you're more vulnerable to air pollution.
                </div>
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="text-xs text-blue-600 space-y-1">
                    <div>Base: 1.0</div>
                    {hasAsthma && <div>+ Asthma: 0.5</div>}
                    {hasCOPD && <div>+ COPD: 0.5</div>}
                    {ageGroup === 'senior' && <div>+ Senior: 0.3</div>}
                    {ageGroup === 'child' && <div>+ Child: 0.2</div>}
                    {previousHighExposure && <div>+ Previous Exposure: 0.2</div>}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    {existingProfile ? 'Update Health Profile' : 'Save Health Profile'}
                  </>
                )}
              </button>
            </form>

            {/* Information Box */}
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">How This Works</h3>
              <p className="text-xs text-gray-600 mb-2">
                Your health profile is used to calculate a personalized vulnerability score (V_user) that multiplies your environmental risk assessment.
              </p>
              <p className="text-xs text-gray-600">
                <strong>Formula:</strong> Risk Index = [(PM_cal × W_tox × W_wind) + (Odor_score × W_odor)] × V_user
              </p>
              <p className="text-xs text-gray-600 mt-2">
                Your data is stored securely and encrypted. This information helps provide more accurate, personalized air quality recommendations.
              </p>
            </div>
          </div>
        </div>
      </FadeInSection>
    </div>
  );
};

export default HealthProfile;

