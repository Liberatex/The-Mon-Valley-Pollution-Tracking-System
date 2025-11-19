# Quick Test Guide - Verify Everything Works

## 🧪 **Test Evidence Report** (Works Now!)

1. **Start Frontend**
   ```bash
   cd frontend
   npm start
   ```

2. **Navigate to Evidence Report**
   - Go to: http://localhost:3000
   - Click: "Evidence Report" in navigation

3. **Generate Report**
   - Set date range (default: last 30 days)
   - Set radius (default: 5 miles)
   - Click: "Generate Evidence Report"

4. **Verify**
   - ✅ Report generates
   - ✅ Shows real symptom report counts
   - ✅ Shows real facility distances
   - ✅ Shows real PM2.5 data (or fallback)

5. **Export PDF**
   - Click: "Export to PDF"
   - ✅ PDF downloads
   - ✅ Contains all report data
   - ✅ Professional formatting

---

## 🧪 **Test Exposure Model** (Works Now!)

1. **Navigate to Exposure Risk**
   - Click: "Exposure Risk" in navigation

2. **Enter Location**
   - Option 1: Click "Use My Location"
   - Option 2: Enter address (e.g., "Clairton, PA")
   - Option 3: Enter coordinates (e.g., "40.292,-79.881")

3. **Verify**
   - ✅ Location accepted
   - ✅ Facilities load
   - ✅ Distances calculated
   - ✅ Risk scores shown
   - ✅ Risk levels color-coded

---

## 🧪 **Test Azure (After Deployment)**

1. **Update .env**
   ```env
   REACT_APP_PROVIDER=azure
   ```

2. **Restart Frontend**
   ```bash
   npm start
   ```

3. **Check Console**
   - Should see: "✅ Azure providers initialized"

4. **Test Features**
   - ✅ Dashboard loads from Azure Functions
   - ✅ Sensor Map shows facilities from Cosmos DB
   - ✅ Evidence Report uses Azure data
   - ✅ All features work

---

## ✅ **Success Criteria**

### **Evidence Report**
- ✅ Generates without errors
- ✅ Shows real data (not just placeholders)
- ✅ PDF exports successfully
- ✅ Contains all sections

### **Exposure Model**
- ✅ Accepts location input
- ✅ Calculates distances
- ✅ Shows risk scores
- ✅ Displays facilities

### **Azure (After Deployment)**
- ✅ Functions respond
- ✅ Cosmos DB accessible
- ✅ Data syncs correctly
- ✅ Provider switching works

---

**All tests passing = 100% Complete!** 🎉

