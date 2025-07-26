<<<<<<< HEAD
Mon Valley Pollution Tracking System

A comprehensive, data-driven platform for monitoring air quality and health impacts in the Mon Valley region of Pennsylvania. Built with world-class attention to detail and modern web technologies.

Features

Interactive Sensor Map
- Real-time PurpleAir sensor data integration
- Interactive map with clickable sensors
- PM2.5 readings and detailed sensor information
- Mon Valley area focus (Clairton steel mills region)

Community Health Dashboard
- Real-time AQI data from OpenWeatherMap
- PM2.5 forecast visualization (5-day)
- Sensor statistics and symptom report tracking
- Health advisories based on current air quality

BreatheAI Virtual Assistant
- Powered by Ollama/Llama 3 LLM
- Retrieval-Augmented Generation (RAG) with custom knowledge base
- Mon Valley-specific air quality expertise
- Health recommendations and pollution education

Symptom Reporting System
- Multi-step form with OSAC methodology
- Auto-populated user identification
- Comprehensive symptom tracking
- Real-time data collection and analysis

User Testing & Feedback
- Comprehensive testing scenarios
- Usability feedback collection
- Performance monitoring
- Continuous improvement tracking

Architecture

Frontend
- **React 18** with TypeScript
- **Chart.js** for data visualization
- **Leaflet** for interactive maps
- **Firebase** for authentication and hosting
- **Axios** for API communication

Backend
- **Node.js** with Express
- **Ollama** integration for LLM capabilities
- **RAG** system with custom knowledge base
- **CORS** enabled for cross-origin requests

Data Sources
- **EPA** - Air quality standards and monitoring
- **PurpleAir** - Community sensor network
- **NASA** - Satellite-based monitoring
- **OpenWeatherMap** - Weather and air quality data
- **ACHD** - Allegheny County Health Department
- **PA DEP** - Pennsylvania Department of Environmental Protection

Quick Start

Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase CLI
- Ollama (for AI features)

Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "MV Pollution Tracking System"
   ```

2. **Install dependencies**
   ```bash
   # Frontend dependencies
   cd frontend
   npm install
   
   # Backend dependencies
   cd ../backend
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Create frontend environment file
   cd ../frontend
   cp .env.example .env
   # Edit .env with your Firebase and API keys
   ```

4. **Start Ollama**
   ```bash
   # Install and start Ollama (if not already running)
   ollama pull llama3:latest
   ollama serve
   ```

5. **Start the backend**
   ```bash
   cd ../backend
   node server.js
   ```

6. **Start the frontend**
   ```bash
   cd ../frontend
   npm start
   ```

7. **Deploy to Firebase**
   ```bash
   cd ../frontend
   npm run build
   firebase deploy --only hosting
   ```

Configuration

Environment Variables

Frontend (.env)
```env
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=mv-pollution-tracking-system.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=mv-pollution-tracking-system
REACT_APP_FIREBASE_STORAGE_BUCKET=mv-pollution-tracking-system.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_OWM_API_KEY=your_openweathermap_api_key
REACT_APP_PURPLEAIR_API_KEY=your_purpleair_api_key
```

Firebase Configuration

1. Create a Firebase project
2. Enable Firestore Database
3. Set up Firestore security rules
4. Configure hosting
5. Add your Firebase config to .env

Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /processedSensorReadings/{docId} {
      allow read: if true;
      allow write: if false;
    }
    match /symptomReports/{docId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

API Documentation

Backend Endpoints

Health Check
```http
GET /api/health
```
Returns system health status.

#### Ollama Test
```http
GET /api/ollama-test
```
Tests Ollama LLM connection.

#### AI Chat
```http
POST /api/llama3-chat
Content-Type: application/json

{
  "message": "Your question about air quality"
}
```

Response:
```json
{
  "response": "AI response text",
  "context_used": true,
  "sources": ["epa", "purpleair", "nasa"]
}
```

Frontend API Integration

The frontend communicates with:
- **Firebase Firestore** - Data storage
- **OpenWeatherMap API** - Air quality data
- **PurpleAir API** - Sensor data
- **Backend Server** - AI chat and data processing

Testing

System Test
```bash
node test-system.js
```

This comprehensive test checks:
- Backend health
- Ollama connection
- RAG knowledge base
- Frontend deployment

### Manual Testing Scenarios

1. **Dashboard Testing**
   - Verify AQI data loading
   - Check PM2.5 graph functionality
   - Test responsive design

2. **Sensor Map Testing**
   - Verify sensor data loading
   - Test map interactions
   - Check sensor details popup

3. **BreatheAI Testing**
   - Test chat functionality
   - Verify knowledge base integration
   - Check error handling

4. **Symptom Report Testing**
   - Test form validation
   - Verify data submission
   - Check user ID auto-population

Monitoring & Analytics

Health Monitoring
- Backend health checks
- Ollama connection monitoring
- API response time tracking

Error Logging
- Frontend error boundaries
- Backend error logging
- User feedback collection

Usage Analytics
- Page view tracking
- Feature usage monitoring
- User interaction analysis

Security

- Environment variable protection
- Firestore security rules
- CORS configuration
- Input validation and sanitization

Deployment

### Production Deployment
1. Build frontend: `npm run build`
2. Deploy to Firebase: `firebase deploy --only hosting`
3. Start backend server
4. Verify all endpoints

Environment Management
- Development: Local development server
- Staging: Firebase hosting preview
- Production: Firebase hosting

Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

License

This project is licensed under the MIT License - see the LICENSE file for details.

Support

For support and questions:
- Check the documentation
- Review the test scenarios
- Contact the development team

Updates & Maintenance

Regular Maintenance Tasks
- Update dependencies
- Monitor API rate limits
- Review and update security rules
- Backup Firestore data
- Monitor system performance

Future Enhancements
- Advanced RAG with document retrieval
- Real-time notifications
- Mobile app development
- Advanced analytics dashboard
- Integration with additional data sources

---

**Built with ❤️ By The Liberate X Team for VAlley Clean Air Now(VCAN) to serve the Mon Valley community** 
=======
# The-Mon-Valley-Pollution-Tracking-System
 Pollution Tracking System for The Mon Valley Area 
>>>>>>> 682b90e0319de37a8f55f9ca3fdf80890771b63b
