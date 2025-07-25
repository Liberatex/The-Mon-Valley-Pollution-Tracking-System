import os
import requests
import json

# Set your EPA AQS credentials as environment variables:
#   export AQS_EMAIL=your_email
#   export AQS_KEY=your_key
AQS_EMAIL = os.getenv('AQS_EMAIL')
AQS_KEY = os.getenv('AQS_KEY')
if not AQS_EMAIL or not AQS_KEY:
    raise ValueError('Set AQS_EMAIL and AQS_KEY environment variables.')

# Example: Get daily summary data for PM2.5 in Allegheny County, PA for 2023
url = 'https://aqs.epa.gov/data/api/dailyData/byCounty'
params = {
    'email': AQS_EMAIL,
    'key': AQS_KEY,
    'param': '88101',  # PM2.5
    'bdate': '20230101',
    'edate': '20231231',
    'state': '42',     # PA
    'county': '003',  # Allegheny
}

try:
    resp = requests.get(url, params=params)
    resp.raise_for_status()
    data = resp.json()
    out_path = '../rag_data/epa_aqs.json'
    with open(out_path, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"EPA AQS data saved to {out_path}")
except Exception as e:
    print(f"Error fetching EPA AQS data: {e}") 