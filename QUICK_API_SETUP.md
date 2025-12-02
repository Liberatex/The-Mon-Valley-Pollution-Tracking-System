# Quick API Keys Setup

## 🚀 Quick Start (5 minutes)

### Step 1: Get Your API Keys

**Mapbox** (Required):
1. Go to https://account.mapbox.com/
2. Sign up/login → Copy your token (starts with `pk.`)

**OpenWeatherMap** (Required):
1. Go to https://openweathermap.org/api
2. Sign up → Verify email → Copy your API key

### Step 2: Add Keys to .env Files

**Frontend** (`frontend/.env`):
```bash
VITE_MAPBOX_ACCESS_TOKEN=pk.your_token_here
VITE_OPENWEATHER_API_KEY=your_openweather_key_here
```

**Backend** (`functions/.env`):
```bash
OPENWEATHER_API_KEY=your_openweather_key_here
```

### Step 3: Restart Servers

```bash
# Frontend
cd frontend
npm run dev

# Backend (in another terminal)
cd functions
npm run serve
```

✅ Done! Your API keys are now configured.

---

## 📋 Full Details

See `API_KEYS_SETUP_GUIDE.md` for complete instructions, troubleshooting, and optional API keys.

