import os
import requests
import csv
from datetime import datetime, timedelta

# Set your AirNow API key as an environment variable: AIRNOW_API_KEY
API_KEY = os.getenv('AIRNOW_API_KEY')
if not API_KEY:
    raise ValueError('Set AIRNOW_API_KEY environment variable.')

# Clairton, PA coordinates
LAT, LON = 40.2923, -79.8817
RADIUS = 25  # miles

# Get yesterday's date
DATE = (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%dT00-00-00')

URL = f'https://www.airnowapi.org/aq/observation/latLong/historical/'
PARAMS = {
    'format': 'application/json',
    'latitude': LAT,
    'longitude': LON,
    'date': DATE,
    'distance': RADIUS,
    'API_KEY': API_KEY
}

resp = requests.get(URL, params=PARAMS)
resp.raise_for_status()
data = resp.json()

# Save as CSV
out_path = '../rag_data/epa_airnow.csv'
with open(out_path, 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=['DateObserved','HourObserved','LocalTimeZone','ReportingArea','StateCode','Latitude','Longitude','ParameterName','AQI','Category'])
    writer.writeheader()
    for row in data:
        writer.writerow({
            'DateObserved': row.get('DateObserved'),
            'HourObserved': row.get('HourObserved'),
            'LocalTimeZone': row.get('LocalTimeZone'),
            'ReportingArea': row.get('ReportingArea'),
            'StateCode': row.get('StateCode'),
            'Latitude': row.get('Latitude'),
            'Longitude': row.get('Longitude'),
            'ParameterName': row.get('ParameterName'),
            'AQI': row.get('AQI'),
            'Category': row.get('Category', {}).get('Name')
        })
print(f"EPA AirNow data saved to {out_path}")
