import os
import requests
import csv

# Set your PurpleAir API key as an environment variable: PURPLEAIR_API_KEY
API_KEY = os.getenv('PURPLEAIR_API_KEY')
if not API_KEY:
    raise ValueError('Set PURPLEAIR_API_KEY environment variable.')

# Clairton, PA bounding box (approximate)
NW_LAT, NW_LON = 40.35, -79.95
SE_LAT, SE_LON = 40.25, -79.80

URL = 'https://api.purpleair.com/v1/sensors'
PARAMS = {
    'fields': 'sensor_index,name,latitude,longitude,pm2.5_atm,pm2.5_cf_1,humidity,temperature,location_type',
    'nwlng': NW_LON,
    'nwlat': NW_LAT,
    'selng': SE_LON,
    'selat': SE_LAT,
}
HEADERS = {'X-API-Key': API_KEY}

resp = requests.get(URL, params=PARAMS, headers=HEADERS)
resp.raise_for_status()
data = resp.json()['data']
fields = resp.json()['fields']

out_path = '../rag_data/purpleair.csv'
with open(out_path, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(fields)
    for row in data:
        writer.writerow(row)
print(f"PurpleAir data saved to {out_path}")
