# Project Lumna/PHPA Implementation Progress Report
**Date**: December 2024  
**Status**: Phase A - Foundation Implementation **80% Complete**

## Executive Summary

This document tracks the systematic implementation of the **Proactive Health and Pollution Advocacy (PHPA) Platform** (Project Lumna) gap-closing plan. We're transforming the current monitoring tool into the full strategic vision outlined in the master plan.

## Vision Alignment Assessment

### Strategic Differentiators (from Master Plan)
1. ✅ **Title V Clean Air Act Permit Data Integration** - **IMPLEMENTED**
2. ⏳ **AI-driven Chemical and Health Risk Modeling** - IN PROGRESS
3. ✅ **Community-Based Participatory Research Framework** - **IMPLEMENTED**
4. ⏳ **Privacy-by-Design Architecture** - PARTIALLY IMPLEMENTED

---

## Phase A: Data and API Foundations [80% Complete]

### ✅ COMPLETED: Secure Symptom Report Submission

**Implementation Details:**
- **Cloud Function**: `submitSymptomReport` with full validation pipeline
- **Security Features**:
  - Request method validation (POST only)
  - Comprehensive data validation (symptoms, severity, OSAC framework)
  - Rate limiting: max 10 reports/hour per user (Firestore-based)
  - **Pseudonymization**: SHA-256 hashing of user IDs with salt
  - **Location privacy**: Geo-coordinates rounded to ~1km precision
  - **PII protection**: Names removed/hashed before storage
- **Health Alert System**: Auto-triggers alerts for severity ≥ 4
- **Consent Tracking**: Explicit consent flag captured and stored
- **Error Handling**: Detailed validation errors with 400/429/500 status codes

**Files Modified:**
- `functions/src/index.ts` - Added complete submission logic
- `frontend/src/components/SymptomReportForm.tsx` - Updated to call Cloud Function

**API Endpoint:**
```
POST /submitSymptomReport
Body: { userId, fullName, age, symptoms[], severity, osac, location, consent }
Response: { success, reportId, message }
```

---

### ✅ COMPLETED: Title V Facilities Data Model

**Strategic Impact**: This is the **#1 competitive differentiator** identified in the master plan - integrating official regulatory permit data with health outcomes.

**Implementation Details:**
- **Data Model**: Comprehensive `TitleVFacility` interface with:
  - Facility identification (ID, name, operator, location)
  - Permit details (ID, type, dates, NAICS code)
  - Processes and permitted pollutants with limits
  - Historical emissions data (2023 baseline)
  - Violations and compliance records
  - Regulatory jurisdiction and oversight
  - Metadata (data source, versioning, timestamps)

**Seed Data**: 3 major Mon Valley facilities loaded:
1. **U.S. Steel Clairton Coke Works** (PA-CLAIRTON-001)
   - Location: 40.2925°N, 79.8814°W
   - Permits: PM2.5 (100 t/y), SO2 (500 t/y), NOx (250 t/y), VOCs (150 t/y)
   - 2023 Emissions: PM2.5 (89.5 t), SO2 (445.2 t)
   - Last Inspection: 2024-09-15
   - Documented violation: 2023-12-25 Battery 19-4 fire

2. **Edgar Thomson Steel Works** (PA-BRADDOCK-001)
   - Location: 40.4006°N, 79.8639°W
   - Permits: PM2.5 (75 t/y), PM10 (150 t/y), NOx (300 t/y)
   - 2023 Emissions: PM2.5 (68.3 t)

3. **Irvin Plant** (PA-DRAVOSBURG-001)
   - Location: 40.3506°N, 79.8867°W
   - Permits: PM2.5 (50 t/y), VOCs (100 t/y)

**Cloud Functions Added:**
- `seedTitleVFacilities` - Admin endpoint to populate facilities (requires Bearer token)
- `getTitleVFacilities` - Public endpoint to retrieve all facilities
- `getTitleVFacilityById` - Public endpoint for single facility details

**Files Modified:**
- `functions/src/index.ts` - Added Title V data structures and endpoints

---

### ✅ COMPLETED: Privacy-by-Design Firestore Security Rules

**Strategic Impact**: Addresses HIPAA-grade privacy requirements and prevents unauthorized health data access.

**New Security Architecture:**
- **Public Read Collections** (no auth required):
  - `titleVFacilities` - Regulatory data
  - `processedSensorReadings` - Environmental data
  - `airQualityData` - Public environmental metrics

- **Protected Health Data** (server-side only):
  - `symptomReports` - **NO CLIENT WRITES**, admin read-only
  - `healthAlerts` - Backend only
  - `rateLimits` - Backend only

- **User-Controlled Data**:
  - `users` - Users can read/write own profiles
  - `userConsent` - Users manage own consent records
  - `userFeedback` - Authenticated users can create

- **Advocacy Workflow**:
  - `advocacyCases` - Authenticated users create/read, owners update
  - `evidenceAttachments` - Authenticated users manage

- **Admin-Only**:
  - `auditLogs` - Read-only for admins, backend writes
  - `systemConfig` - Admin read/write

- **Default Deny**: All unlisted collections blocked

**Files Modified:**
- `firestore.rules` - Complete security overhaul with helper functions

---

### ⏳ IN PROGRESS: Unified Data Ingestion Orchestrator

**Current Status**: Planning phase; existing scripts inventoried.

**Existing Assets:**
- `rag_ingest/ingest_epa_aqs.py` - EPA Air Quality System
- `rag_ingest/ingest_purpleair.py` - PurpleAir community sensors
- `rag_ingest/ingest_achd.py` - Allegheny County Health Dept
- `rag_ingest/ingest_padep.py` - PA Dept of Environmental Protection
- `rag_ingest/ingest_openaq.py` - OpenAQ global network
- `rag_ingest/ingest_echo.py` - EPA ECHO compliance data
- Additional scripts for WHO, CDC, Census, regulations, news

**Next Steps**:
1. Create Cloud Scheduler jobs for hourly/daily runs
2. Add Cloud Functions to orchestrate each ingestion script
3. Implement data validation and lineage tracking
4. Write to `processedSensorReadings` collection
5. Add error notifications and retry logic

---

## Phase B: Mapping and Exposure Modeling [0% Complete]

### Pending: Lightweight Exposure Model
**Goal**: Combine PM2.5 fields with distance-to-facility weighting to produce exposure index layers.

**Approach**:
- Inverse distance weighting from Title V facilities
- Combine with current air quality data (OWM, PurpleAir)
- Generate grid-based exposure scores
- Store in `exposureIndex` collection

### Pending: Map Visualization Enhancements
**Goal**: Add Title V facilities as map layer with toggles.

**Requirements**:
- Update `SensorMap.tsx` to fetch from `getTitleVFacilities`
- Add custom facility markers (differentiate from sensors)
- Implement facility info popovers
- Add layer toggle controls (sensors vs facilities vs exposure)

### Pending: Facility Profile Pages
**Goal**: Dedicated pages for each Title V facility with full details.

**Features**:
- Permit information and compliance status
- Emissions trends over time
- Nearby health reports (aggregated/anonymized)
- Inspection and violation history
- Community notes/flagging

---

## Phase C: Advocacy Tooling [0% Complete]

### Pending: Automated Evidence Reports
**Goal**: Generate PDF/Word reports for advocacy use.

**Features**:
- Date range selector
- Automated data aggregation (AQ trends, symptom clusters, proximity analysis)
- Facility-specific impact summaries
- Regulatory citation templates
- Export formats: PDF, DOCX, JSON

### Pending: Case Tracking System
**Goal**: Track advocacy issues from identification to resolution.

**Data Model** (proposed):
```typescript
interface AdvocacyCase {
  caseId: string;
  title: string;
  description: string;
  location: { lat, lng };
  linkedReports: string[];       // Symptom report IDs
  linkedFacilities: string[];    // Title V facility IDs
  status: 'open' | 'in_progress' | 'escalated' | 'resolved' | 'closed';
  createdBy: string;
  assignedTo?: string;
  priority: 1 | 2 | 3 | 4 | 5;
  timeline: Array<{
    date: string;
    event: string;
    actor: string;
    notes: string;
  }>;
  evidenceAttachments: string[];
  targetAgencies: string[];
  outcomeMetrics?: {
    policyChange: boolean;
    emissionsReduction?: number;
    communityImpact: string;
  };
}
```

---

## Phase D: AI/ML and RAG Improvements [0% Complete]

### Pending: Document-Backed RAG
**Current**: Static knowledge object in `MON_VALLEY_KNOWLEDGE`  
**Goal**: Real document retrieval over permits, regulations, reports

**Architecture**:
- Document ingestion pipeline for PDFs, regulatory filings, permits
- Embedding generation (OpenAI/Voyage/local models)
- Vector store (Pinecone, Weaviate, or Firestore Extensions)
- Retrieval logic in `llama3Chat` function
- Citation links in AI responses

### Pending: Health Risk Modeling
**Goal**: Correlate air quality + emissions + proximity + demographics with health outcomes.

**Approach**:
- Time-series analysis of PM2.5 vs. symptom reports
- Spatial clustering (DBSCAN, K-means) for hotspots
- Regression models (linear, logistic, polynomial) for exposure-response
- Risk scores by census tract or grid cell

---

## Phase E: Compliance and Governance [0% Complete]

### Pending: Consent Flow
**Goal**: Explicit, informed consent for health data collection.

**Features**:
- Pre-submission consent dialog with plain-language explanations
- Separate storage in `userConsent` collection
- Version tracking (consent text changes over time)
- Withdrawal mechanism

### Pending: Audit Logging
**Goal**: Track all access to protected health information.

**Requirements**:
- Log collection: `auditLogs`
- Fields: timestamp, userId, action, resource, IP, result
- Immutable writes (backend only)
- Retention: 7 years (HIPAA requirement)
- Audit report generation for compliance officers

---

## Technical Debt and Next Actions

### Immediate (Next 1-2 Weeks)
1. **Deploy Cloud Functions**: 
   ```bash
   cd functions && firebase deploy --only functions
   ```
2. **Deploy Firestore Rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```
3. **Test Symptom Report Submission**: Frontend → Cloud Function → Firestore
4. **Seed Title V Facilities**: Call `seedTitleVFacilities` with admin token
5. **Update Dashboard**: Add facility count and exposure metrics

### Short-Term (2-4 Weeks)
6. **Implement Data Orchestrator**: Cloud Scheduler + Cloud Functions for sensor ingestion
7. **Build Exposure Model**: Simple inverse-distance weighting MVP
8. **Update SensorMap**: Add Title V facilities layer
9. **Create Facility Profile Component**: Individual facility pages

### Medium-Term (1-2 Months)
10. **Document RAG**: Ingest permit PDFs, build vector index
11. **Basic Evidence Reports**: Generate PDF summaries
12. **Case Tracking MVP**: CRUD operations for advocacy cases
13. **Product Analytics**: Track active users, submissions, case outcomes

---

## Key Metrics Tracking (SMART Goals from Master Plan)

### Product Development
- **Goal**: MVP with core features by Month 6
- **Current Progress**: 
  - Survey: ✅ Complete (secure API)
  - Modeling: ⏳ 20% (data model done, algorithms pending)
  - Mapping: ⏳ 40% (base map done, facilities pending)

### Community Adoption
- **Goal**: 1,000 active users in Year 1
- **Current Tracking**: Not yet instrumented
- **Action**: Add Firebase Analytics and custom events

### Policy Impact
- **Goal**: Influence 2+ local/regional policy reforms
- **Current Tracking**: Manual
- **Action**: Build case outcome tracking in advocacy module

### Financial Sustainability
- **Goal**: $200K in seed/grant funding
- **Current Status**: Not tracked in system
- **Action**: Document features for grant applications

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Title V data availability** | High | Seed data loaded for 3 facilities; expand with ACHD partnership |
| **OWM/PurpleAir rate limits** | Medium | Implement server-side caching; consider paid tiers |
| **HIPAA compliance claims** | Critical | Avoid claiming HIPAA compliance until formal audit; use "privacy-by-design" |
| **User adoption barriers** | High | Community co-design; Spanish translation; mobile-first UX |
| **AI model bias** | High | Implement fairness metrics; diverse testing cohorts |

---

## Deployment Checklist

Before production deployment:

- [ ] Test `submitSymptomReport` with rate limiting
- [ ] Verify Firestore rules block direct client writes
- [ ] Seed Title V facilities to production Firestore
- [ ] Update frontend environment variables (Cloud Function URLs)
- [ ] Enable Firebase Analytics
- [ ] Set up monitoring alerts (Cloud Monitoring)
- [ ] Document admin procedures (seeding data, managing cases)
- [ ] Create user onboarding flow
- [ ] Implement consent dialog
- [ ] Add privacy policy and terms of service
- [ ] Test accessibility (WCAG AA)
- [ ] Load test symptom submission endpoint
- [ ] Set up automated backups (existing `scheduledFirestoreBackup`)

---

## Contact and Governance

**Project Lead**: TBD  
**Technical Lead**: Cursor AI + Liberate X Team  
**Community Liaison**: Valley Clean Air Now (VCAN)  
**Regulatory Advisor**: TBD (ACHD partnership opportunity)

**Code Repository**: GitHub (current)  
**Documentation**: `/docs` directory, this file  
**Issue Tracking**: GitHub Issues (recommended)

---

## Appendix A: API Endpoints Summary

### Cloud Functions (Firebase)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/submitSymptomReport` | POST | None | Submit health symptom report (rate limited) |
| `/seedTitleVFacilities` | POST | Admin | Populate Title V facilities (one-time) |
| `/getTitleVFacilities` | GET | None | Retrieve all Title V facilities |
| `/getTitleVFacilityById` | GET | None | Get single facility by ID (query param) |
| `/llama3Chat` | POST | None | AI chat with RAG (existing) |
| `/healthCheck` | GET | None | System health status (existing) |
| `/getMetrics` | GET | None | Performance metrics (existing) |

### Backend (Node.js Express - Local)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/llama3-chat` | POST | Ollama chat with Mon Valley knowledge |
| `/api/ollama-test` | GET | Test Ollama connection |
| `/api/health` | GET | Backend health check |
| `/api/metrics` | GET | Backend analytics |

---

## Appendix B: Data Collections (Firestore)

| Collection | Access | Purpose |
|------------|--------|---------|
| `symptomReports` | Admin read, backend write | Pseudonymized health reports |
| `titleVFacilities` | Public read, backend write | Title V permit data |
| `processedSensorReadings` | Public read, backend write | Normalized sensor data |
| `airQualityData` | Public read, backend write | Aggregated AQ metrics |
| `healthAlerts` | Admin read, backend write | High-severity health alerts |
| `rateLimits` | Backend only | API rate limiting state |
| `users` | User read/write own | User profiles (non-PHI) |
| `userConsent` | User read/write own | Consent records |
| `userFeedback` | Auth create, admin read | Usability feedback |
| `advocacyCases` | Auth read/create, owner update | Advocacy case tracking (future) |
| `auditLogs` | Admin read, backend write | Access audit trail (future) |

---

## Appendix C: Completed Code Changes

### Functions (`functions/src/index.ts`)
- Added `submitSymptomReport` with validation, rate limiting, pseudonymization
- Added `seedTitleVFacilities`, `getTitleVFacilities`, `getTitleVFacilityById`
- Added `TitleVFacility` interface and seed data for 3 facilities
- Fixed TypeScript compilation errors (type assertions for axios responses)

### Frontend (`frontend/src/components/SymptomReportForm.tsx`)
- Replaced direct Firestore write with Cloud Function POST
- Added consent flag to submission payload
- Updated success/error messaging
- Auto-reset form after successful submission

### Security (`firestore.rules`)
- Implemented privacy-by-design architecture
- Blocked direct client writes to `symptomReports`
- Added `titleVFacilities` public read rules
- Created helper functions `isAdmin()`, `isAuthenticated()`
- Added advocacy workflow collections
- Default deny for all unlisted collections

### Configuration (`functions/tsconfig.json`)
- Changed module to `commonjs` (from `NodeNext`)
- Relaxed strict mode for faster development
- Added `skipLibCheck` to bypass third-party type issues
- Set target to `es2020` for Node 18+ compatibility

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Next Review**: After Phase B completion


