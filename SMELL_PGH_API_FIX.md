# Smell PGH API Integration Fix

## Issue Identified
The Smell PGH API integration was not displaying data on the map, even though the API was returning data. The root causes were:

1. **Incorrect field mapping**: The code was looking for `zip_code_id` which doesn't exist in the API response
2. **Missing bounding box parameter**: The API supports `latlng_bbox` parameter for server-side filtering, which is more efficient than client-side filtering
3. **Incorrect default smell value threshold**: Was set too high (3-5), missing reports with value 2

## Fixes Applied

### 1. Corrected API Response Mapping
**Before:**
```typescript
id: `smell-${report.zip_code_id}-${report.observed_at}-${index}`
```

**After:**
```typescript
id: `smell-${report.zipcode || 'unknown'}-${report.observed_at}-${index}`
```

The API actually returns:
- `zipcode` (not `zip_code_id`)
- `latitude`, `longitude`
- `smell_value`
- `observed_at` (Unix timestamp)
- `smell_description`
- `feelings_symptoms`
- `additional_comments`

### 2. Implemented `latlng_bbox` Parameter
According to the [Smell PGH API documentation](https://github.com/CMU-CREATE-Lab/smell-pittsburgh-rails/wiki/Smell-PGH-API), the API supports a `latlng_bbox` parameter for bounding box filtering:

**Format:** `"top-left lat, top-left lng, bottom-right lat, bottom-right lng"`

**Implementation:**
```typescript
if (north && south && east && west) {
  const topLeftLat = parseFloat(north as string);   // Top = north
  const topLeftLng = parseFloat(west as string);     // Left = west
  const bottomRightLat = parseFloat(south as string); // Bottom = south
  const bottomRightLng = parseFloat(east as string);  // Right = east
  params.latlng_bbox = `${topLeftLat},${topLeftLng},${bottomRightLat},${bottomRightLng}`;
}
```

This allows the API to filter reports server-side, reducing data transfer and improving performance.

### 3. Lowered Default Smell Value Threshold
**Before:** `smell_value: '3,4,5'` (only noticeable or worse)
**After:** `smell_value: '2,3,4,5'` (includes "barely noticeable")

This captures more reports, which is important for the Mon Valley area where even "barely noticeable" odors can indicate pollution events.

### 4. Enhanced Error Handling and Logging
Added comprehensive logging to help debug issues:
- Log API parameters being sent
- Log number of reports returned
- Log sample reports for verification
- Better error messages

## API Endpoint Details

**Endpoint:** `https://api.smellpittsburgh.org/api/v2/smell_reports`

**Parameters Used:**
- `smell_value`: Comma-separated list (e.g., "2,3,4,5")
- `start_time`: Unix timestamp (epoch time)
- `end_time`: Unix timestamp (epoch time)
- `region_ids`: Comma-separated list (e.g., "1" for Allegheny County)
- `latlng_bbox`: Bounding box format "top-left lat, top-left lng, bottom-right lat, bottom-right lng"

**Response Format:**
```json
[
  {
    "latitude": 40.4851772,
    "longitude": -80.0484522,
    "smell_value": 4,
    "smell_description": null,
    "feelings_symptoms": null,
    "additional_comments": null,
    "observed_at": 1764108312,
    "zipcode": "15212"
  }
]
```

## Testing

Tested the API directly:
```bash
curl "https://api.smellpittsburgh.org/api/v2/smell_reports?smell_value=2,3,4,5&start_time=...&end_time=...&region_ids=1&latlng_bbox=40.6,-80.2,40.2,-79.5"
```

✅ API returns data correctly
✅ Bounding box filtering works
✅ Field mapping is correct

## Files Modified

1. **`functions/src/index.ts`**
   - Updated `fetchSmellPGHReports` Cloud Function
   - Added `latlng_bbox` parameter support
   - Fixed field mapping (removed `zip_code_id`, use `zipcode`)
   - Lowered default smell value threshold
   - Enhanced logging

2. **`frontend/src/services/smellPGHService.ts`**
   - Updated to handle new response format
   - Improved error handling
   - Added better logging

3. **`frontend/src/components/SensorMapMapbox.tsx`**
   - Expanded bounding box to capture more area
   - Lowered clustering thresholds to show more clusters
   - Enhanced logging for debugging

## Next Steps

1. ✅ API integration fixed
2. ✅ Field mapping corrected
3. ✅ Bounding box parameter implemented
4. ⏳ Test on local server to verify data appears on map
5. ⏳ Verify clustering and visualization work correctly

## References

- [Smell PGH API Documentation](https://github.com/CMU-CREATE-Lab/smell-pittsburgh-rails/wiki/Smell-PGH-API)
- [How to Use the API](https://github.com/CMU-CREATE-Lab/smell-pittsburgh-rails/wiki/How-to-use-the-API)


