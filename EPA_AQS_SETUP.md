# EPA AQS API Setup - For Real-Time ACHD Data

## The Problem

ACHD does not provide a public API. However, **ACHD reports to EPA's Air Quality System (AQS)**, which DOES provide a free API.

## Solution: Use EPA AQS API

**This is how you get official, real-time ACHD air quality data.**

## Setup Steps

### 1. Register for EPA AQS API

**URL**: https://aqs.epa.gov/aqsweb/documents/registering.html

1. Visit the EPA AQS registration page
2. Fill out the registration form (takes 2-3 minutes)
3. You'll receive an email with:
   - Your email address (used as username)
   - Your API key

### 2. Add Credentials to Environment

Add these to your `.env` file in the functions directory:

```bash
# functions/.env (create if doesn't exist)
EPA_AQS_EMAIL=your-email@example.com
EPA_AQS_KEY=your-api-key-here
```

Or for production deployment:
```bash
firebase functions:config:set epa_aqs.email="your-email@example.com" epa_aqs.key="your-api-key"
```

### 3. What You Get

Once configured, you'll have access to:
- **Real-time PM2.5** from ACHD's Liberty station
- **Historical data** going back years
- **Multiple pollutants**: PM2.5, Ozone, SO2, NO2, etc.
- **Multiple stations**: All ACHD monitoring locations
- **Hourly data**: Latest readings within minutes

## API Details

### Endpoint Used

```
https://aqs.epa.gov/data/api/dailyData/byCounty
```

### Parameters

- **param**: 88101 (PM2.5 corrected)
- **state**: 42 (Pennsylvania)
- **county**: 003 (Allegheny County)
- **bdate/edate**: YYYYMMDD format
- **email**: Your registered email
- **key**: Your API key

### Other Pollutants

To get additional pollutants:
- Ozone: param=44201
- SO2: param=42401
- NO2: param=42602
- PM10: param=81102

## Current Status

Right now, the code returns **mock data** because EPA AQS credentials aren't configured.

Once you register and add credentials, you'll get:
- ✅ Official ACHD data
- ✅ Real-time updates
- ✅ Accurate PM2.5 readings
- ✅ Proper attribution

## Alternative: Direct ACHD Data Scraping

If you prefer not to use EPA AQS, you could scrape ACHD's hourly data page:
- URL: https://www.alleghenycounty.us/Services/Health-Department/Air-Quality
- Look for "Hourly Air Quality Data" link
- Find "Liberty 2" in the document
- Parse PM2.5 column

**However**, EPA AQS API is:
- Easier to maintain
- More reliable
- Official source
- No scraping needed
- Free

## Testing

After adding credentials:

```bash
curl http://localhost:5001/mv-pollution-tracking-system/us-central1/getACHDAirQuality
```

Should return real ACHD data instead of mock data.

## Cost

**FREE** - EPA AQS API is a public service with no cost.

## Rate Limits

EPA AQS has generous rate limits for public health applications. Contact EPA if you need higher limits.

## References

- EPA AQS Registration: https://aqs.epa.gov/aqsweb/documents/registering.html
- EPA AQS API Docs: https://aqs.epa.gov/aqsweb/documents/data_api.html
- ACHD Air Quality: https://www.alleghenycounty.us/Services/Health-Department/Air-Quality
- Example Request: https://aqs.epa.gov/data/api/dailyData/byCounty?email=YOUR_EMAIL&key=YOUR_KEY&param=88101&bdate=20241208&edate=20241208&state=42&county=003

---

**Summary**: Register for EPA AQS API (5 minutes), add credentials, get real-time official ACHD air quality data.

