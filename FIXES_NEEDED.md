# Fixes Needed for Map and BreatheAI

## Issues Identified:
1. Smell Reports showing "No data" - Cloud Function exists but may need debugging
2. Risk Zones showing "No events" - Need to lower thresholds or add fallback data
3. Sensors not showing - Need to check sensor fetching
4. Wind visualization missing on map
5. Elevation visualization missing on map
6. BreatheAI not collecting full OSAC fields (onset, severity, course, aggravating factors)
7. BreatheAI not prompting users to report symptoms proactively

## Solutions:
1. Add debug logging for Smell PGH API calls
2. Lower risk zone detection thresholds and add fallback mock data for testing
3. Add wind arrows/vectors visualization on map
4. Add elevation contours/heatmap on map
5. Enhance BreatheAI OSAC flow to collect all fields like SymptomReportForm
6. Add proactive prompts in BreatheAI to encourage symptom reporting


