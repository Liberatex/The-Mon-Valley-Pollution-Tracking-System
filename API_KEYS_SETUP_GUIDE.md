# API Keys Setup Guide

This guide will help you obtain and configure all required API keys for the Mon Valley Pollution Tracking System.

---

## 🔑 Required API Keys

### 1. **Mapbox Access Token** (REQUIRED)
**Purpose**: Interactive maps with advanced visualizations

**How to Get**:
1. Go to https://account.mapbox.com/
2. Sign up for a free account (or log in)
3. Navigate to **Access Tokens** in your account dashboard
4. Copy your **Default Public Token** (starts with `pk.`)
5. Free tier includes: **50,000 map loads/month**

**Where to Add**:
- `frontend/.env`: `VITE_MAPBOX_ACCESS_TOKEN=pk.your_token_here`

---

### 2. **OpenWeatherMap API Key** (REQUIRED)
**Purpose**: Real-time wind data for dispersion modeling

**How to Get**:
1. Go to https://openweathermap.org/api
2. Click **Sign Up** (top right)
3. Fill out the registration form
4. Verify your email
5. Go to **API Keys** in your account dashboard
6. Copy your **API Key**
7. Free tier includes: **60 calls/minute, 1,000,000 calls/month**

**Where to Add**:
- `frontend/.env`: `VITE_OPENWEATHER_API_KEY=your_key_here`
- `functions/.env`: `OPENWEATHER_API_KEY=your_key_here`

---

### 3. **PurpleAir API Key** (Already Configured)
**Purpose**: Community air quality sensor data

**Status**: Already set in `functions/.env` as `658398DE-68A7-11F0-AF66-42010A800028`

**If you need a new one**:
1. Go to https://www2.purpleair.com/community/faq#hc-access-the-json-data-api
2. Follow instructions to get your API key

**Where to Add**:
- `functions/.env`: `PURPLEAIR_API_KEY=your_key_here`

---

## 🔵 Optional API Keys

### 4. **IQAir API Key** (OPTIONAL)
**Purpose**: Indoor/outdoor air quality comparison

**How to Get**:
1. Go to https://www.iqair.com/us/air-pollution-data-api
2. Sign up for an account
3. Navigate to API section
4. Generate an API key

**Where to Add**:
- `frontend/.env`: `VITE_IQAIR_API_KEY=your_key_here`

---

## 📝 Setup Instructions

### Step 1: Create Environment Files

**Frontend**:
```bash
cd frontend
cp .env.example .env
```

**Backend Functions**:
```bash
cd functions
cp .env.example .env
```

### Step 2: Add Your API Keys

Open the `.env` files and add your API keys:

**`frontend/.env`**:
```bash
# Required
VITE_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here
VITE_OPENWEATHER_API_KEY=your_openweather_key_here

# Optional
VITE_IQAIR_API_KEY=your_iqair_key_here
```

**`functions/.env`**:
```bash
# Required
OPENWEATHER_API_KEY=your_openweather_key_here

# Already configured
PURPLEAIR_API_KEY=658398DE-68A7-11F0-AF66-42010A800028
```

### Step 3: Verify Configuration

**Check if keys are loaded**:
```bash
# Frontend
cd frontend
npm run dev
# Check browser console for any API key warnings

# Backend
cd functions
npm run serve
# Check terminal for API key status messages
```

---

## 🔒 Security Notes

1. **Never commit `.env` files to Git**
   - They are already in `.gitignore`
   - Only commit `.env.example` files

2. **Keep API keys secret**
   - Don't share them publicly
   - Rotate keys if exposed

3. **Use different keys for production**
   - Create separate keys for production environment
   - Use Firebase Functions config for production:
     ```bash
     firebase functions:config:set openweather.key="your_production_key"
     ```

---

## ✅ Verification Checklist

- [ ] Mapbox token added to `frontend/.env`
- [ ] OpenWeatherMap key added to `frontend/.env`
- [ ] OpenWeatherMap key added to `functions/.env`
- [ ] PurpleAir key verified in `functions/.env`
- [ ] (Optional) IQAir key added to `frontend/.env`
- [ ] Restarted development server after adding keys
- [ ] No API key errors in console/terminal

---

## 🆘 Troubleshooting

### "Mapbox access token not configured"
- Check that `VITE_MAPBOX_ACCESS_TOKEN` is set in `frontend/.env`
- Restart the dev server: `npm run dev`
- Verify the token starts with `pk.`

### "OpenWeatherMap API key not configured"
- Check that `VITE_OPENWEATHER_API_KEY` is set in `frontend/.env`
- Check that `OPENWEATHER_API_KEY` is set in `functions/.env`
- Restart both frontend and backend servers

### "API key not valid"
- Verify the key is copied correctly (no extra spaces)
- Check that the API key hasn't expired
- Verify you're using the correct key type (public vs. secret)

---

## 📚 Additional Resources

- [Mapbox Documentation](https://docs.mapbox.com/)
- [OpenWeatherMap API Docs](https://openweathermap.org/api)
- [PurpleAir API Docs](https://www2.purpleair.com/community/faq#hc-access-the-json-data-api)
- [IQAir API Docs](https://www.iqair.com/us/air-pollution-data-api)

---

*Last Updated: API Keys Setup Guide*

