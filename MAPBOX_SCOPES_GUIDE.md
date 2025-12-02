# Mapbox Token Scopes Guide

## ✅ Recommended Scopes for Mon Valley Pollution Tracking System

### **Public Scopes** (Keep all checked - these are fine):
- ✅ `STYLES:TILES` - Load map tiles
- ✅ `VISION:READ` - Read vision data
- ✅ `STYLES:READ` - Read map styles
- ✅ `FONTS:READ` - Read fonts
- ✅ `DATASETS:READ` - Read datasets

### **Secret Scopes** (Only select what you need):

#### **Minimum Required** (Recommended):
- ✅ **`MAP:READ`** - Required to read map data and display maps
  - **Why**: Essential for displaying the Mapbox map with sensor overlays

#### **Optional** (Only if you plan to use these features):
- ⚠️ `STYLES:WRITE` - Only if you want to create/edit custom map styles in Mapbox Studio
- ⚠️ `STYLES:LIST` - Only if you want to list all your custom styles
- ⚠️ `DATASETS:WRITE` - Only if you want to upload custom datasets to Mapbox
- ⚠️ `TILESETS:WRITE` - Only if you want to create custom tilesets

#### **Not Needed** (Don't select):
- ❌ `MAP:WRITE` - We're not modifying maps
- ❌ `USER:WRITE` - We're not modifying user settings
- ❌ `TOKENS:READ/WRITE` - We're not managing tokens programmatically
- ❌ `UPLOADS:WRITE` - We're not uploading data
- ❌ `OFFLINE:READ/WRITE` - We're not using offline maps
- ❌ `NAVIGATION:DOWNLOAD` - We're not using navigation
- ❌ All other scopes - Not needed for our use case

---

## 🎯 **Recommended Configuration**

For the Mon Valley Pollution Tracking System, select:

**Public Scopes**: ✅ All (keep as is)

**Secret Scopes**: 
- ✅ **`MAP:READ`** (Required)

That's it! Just one secret scope is needed.

---

## 📝 **What We're Using Mapbox For**

1. **Displaying maps** - Using Mapbox GL JS with dark-v11 style
2. **Showing sensor data** - Adding GeoJSON sources for PurpleAir sensors
3. **Interactive features** - Click handlers, popups, clustering
4. **Zoom-dependent layering** - Clusters at low zoom, individual sensors at high zoom

All of this only requires **`MAP:READ`** from the secret scopes.

---

## 🔒 **Security Best Practice**

**Principle of Least Privilege**: Only grant the minimum permissions needed. Since we're only reading and displaying maps (not creating or modifying them), we only need `MAP:READ`.

---

## ✅ **Final Recommendation**

**Select only**: `MAP:READ` from Secret Scopes

This gives you everything you need for the pollution tracking system while keeping your token secure.

