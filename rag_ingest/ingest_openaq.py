import requests
import csv

# Clairton, PA coordinates
LAT, LON = 40.2923, -79.8817
RADIUS = 25000  # meters (25km)

URL = f'https://api.openaq.org/v2/measurements'
PARAMS = {
    'coordinates': f'{LAT},{LON}',
    'radius': RADIUS,
    'limit': 1000,
    'order_by': 'datetime',
    'sort': 'desc',
}

resp = requests.get(URL, params=PARAMS)
resp.raise_for_status()
data = resp.json()['results']

out_path = '../rag_data/openaq.csv'
with open(out_path, 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=['datetime','location','parameter','value','unit','latitude','longitude','country'])
    writer.writeheader()
    for row in data:
        writer.writerow({
            'datetime': row.get('date', {}).get('utc'),
            'location': row.get('location'),
            'parameter': row.get('parameter'),
            'value': row.get('value'),
            'unit': row.get('unit'),
            'latitude': row.get('coordinates', {}).get('latitude'),
            'longitude': row.get('coordinates', {}).get('longitude'),
            'country': row.get('country')
        })
print(f"OpenAQ data saved to {out_path}")
