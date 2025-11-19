# Dashboard Setup Guide
## Data Studio (Firebase) & Power BI (Azure) Configuration

---

## 📊 **DATA STUDIO SETUP (Firebase)**

### **Prerequisites:**
- ✅ BigQuery dataset created (`health_data_warehouse`)
- ✅ Aggregates exported to BigQuery
- ✅ Google account with Data Studio access

### **Step 1: Create Data Studio Report**
1. Go to: https://datastudio.google.com
2. Click **Create** → **Data Source**
3. Select **BigQuery**
4. Choose project: `mv-pollution-tracking-system`
5. Select dataset: `health_data_warehouse`
6. Select table: `symptom_report_aggregates`
7. Click **Connect**

### **Step 2: Configure Data Source**
1. **Fields**: Verify all fields are available
2. **Aggregation**: Set default aggregation (SUM for counts, AVG for averages)
3. **Date Fields**: Mark `date` as Date dimension
4. Click **Create Report**

### **Step 3: Build Dashboard**
1. **Add Charts**:
   - Line chart: Reports over time (date vs. total_reports)
   - Pie chart: Symptom distribution (symptoms)
   - Bar chart: Severity distribution (severity fields)
   - Map: Geographic distribution (geographic)
   - Scorecard: Total reports, avg PM2.5, correlation score

2. **Add Filters**:
   - Date range filter
   - Aggregate type filter (daily/weekly/monthly)
   - Geographic filter (zip code)

3. **Styling**:
   - Use Mon Valley branding colors
   - Add title: "Mon Valley Health Data Dashboard"
   - Add logo if available

### **Step 4: Share Dashboard**
1. Click **Share** button
2. Add VCAN team members (Google accounts)
3. Set permissions:
   - **Viewer**: Can view dashboard
   - **Editor**: Can modify dashboard
4. Copy shareable link

### **Step 5: Schedule Refresh**
1. Go to **Data Source** settings
2. Set refresh schedule: **Daily at 2 AM**
3. Enable automatic refresh

---

## 📊 **POWER BI SETUP (Azure)**

### **Prerequisites:**
- ✅ Azure Synapse workspace created
- ✅ Aggregates exported to Synapse
- ✅ Power BI Pro license ($10/user/month)

### **Step 1: Create Power BI Workspace**
1. Go to: https://app.powerbi.com
2. Click **Workspaces** → **Create workspace**
3. Name: "Mon Valley Health Analytics"
4. Set as **Premium** (if available) or **Pro**
5. Click **Create**

### **Step 2: Connect to Synapse**
1. Click **Get Data**
2. Select **Azure** → **Azure Synapse Analytics**
3. Enter connection details:
   - Server: `mv-pollution-synapse.sql.azuresynapse.net`
   - Database: `health_data_warehouse`
   - Authentication: **Azure Active Directory**
4. Click **Connect**

### **Step 3: Import Data**
1. Select table: `symptom_report_aggregates`
2. Click **Load**
3. Wait for data import

### **Step 4: Build Dashboard**
1. **Create Visualizations**:
   - **Line Chart**: Reports over time
   - **Pie Chart**: Symptom types
   - **Stacked Bar**: Severity distribution
   - **Map**: Geographic heat map
   - **KPI Cards**: Total reports, avg PM2.5, correlation

2. **Add Filters**:
   - Date slicer
   - Aggregate type slicer
   - Geographic slicer

3. **Styling**:
   - Apply Mon Valley theme
   - Add title and branding

### **Step 5: Publish and Share**
1. Click **Publish** → **Publish to Power BI**
2. Select workspace: "Mon Valley Health Analytics"
3. Click **Publish**
4. Go to workspace → **Access**
5. Add VCAN team members
6. Set permissions: **Viewer** or **Member**

### **Step 6: Schedule Refresh**
1. Go to **Datasets** → Your dataset
2. Click **Schedule Refresh**
3. Set frequency: **Daily**
4. Set time: **2:00 AM**
5. Enable refresh

---

## 🔐 **ACCESS CONTROL**

### **Data Studio:**
- Share with specific Google accounts
- Set viewer/editor permissions
- Can revoke access anytime

### **Power BI:**
- Add users to workspace
- Set viewer/member/admin roles
- Can revoke access anytime

---

## 📋 **DASHBOARD FEATURES**

### **Both Dashboards Should Include:**

1. **Overview Metrics**:
   - Total symptom reports
   - Average daily reports
   - Peak PM2.5 levels
   - Correlation score

2. **Trends**:
   - Reports over time (line chart)
   - Symptom trends (area chart)
   - Severity trends (stacked bar)

3. **Geographic**:
   - Reports by zip code (map)
   - Geographic distribution (bar chart)

4. **Correlations**:
   - Health events vs. air quality
   - Facility proximity analysis
   - Temporal patterns

5. **Export**:
   - Export to PDF
   - Export to CSV
   - Export to Excel

---

## ✅ **VERIFICATION CHECKLIST**

### **Data Studio:**
- [ ] Dashboard created
- [ ] Connected to BigQuery
- [ ] Charts displaying correctly
- [ ] Filters working
- [ ] Shared with VCAN team
- [ ] Refresh scheduled

### **Power BI:**
- [ ] Workspace created
- [ ] Connected to Synapse
- [ ] Visualizations created
- [ ] Filters working
- [ ] Published to workspace
- [ ] Shared with VCAN team
- [ ] Refresh scheduled

---

## 🎯 **NEXT STEPS**

After dashboards are set up:

1. **Train VCAN Team**: Show how to use dashboards
2. **Create Reports**: Generate sample reports
3. **Set Alerts**: Configure alerts for high report counts
4. **Documentation**: Create user guide for VCAN

**Dashboards are ready for VCAN to use!** ✅

