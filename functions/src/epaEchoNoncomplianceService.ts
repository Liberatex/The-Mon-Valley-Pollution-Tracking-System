/**
 * EPA ECHO Noncompliance Report Service
 * Fetches noncompliance data for facilities
 * API Documentation: https://echo.epa.gov/tools/web-services/npdes-noncompliance-report
 * 
 * Note: NPDES is primarily for water permits, but we can use similar structure for air
 * For air compliance, we primarily use the Detailed Facility Report (DFR) API
 */

import axios from 'axios';

export interface NoncomplianceRecord {
  facilityId: string;
  registryId: string;
  permitNumber: string;
  violationType: string;
  violationDate: Date;
  resolvedDate?: Date;
  description: string;
  severity: 'Minor' | 'Moderate' | 'Major' | 'Significant';
}

/**
 * Fetch noncompliance records for a facility
 * @param registryId EPA Registry ID
 * @param permitType 'AIR' for air permits, 'NPDES' for water permits
 */
export async function fetchNoncomplianceRecords(
  registryId: string,
  permitType: 'AIR' | 'NPDES' = 'AIR'
): Promise<NoncomplianceRecord[]> {
  try {
    // EPA ECHO Noncompliance Report API
    // Endpoint: https://echo.epa.gov/tools/web-services/npdes-noncompliance-report
    // Note: This is primarily for NPDES (water), but structure is similar for air
    
    if (permitType === 'AIR') {
      // For air compliance, we use the DFR API which includes violations
      // This service is mainly for reference/water permits
      // Air violations are handled in epaEchoService.ts via DFR
      return [];
    }

    // For NPDES (water) permits
    const noncomplianceUrl = 'https://echo.epa.gov/tools/web-services/npdes-noncompliance-report';
    
    try {
      const response = await axios.get(noncomplianceUrl, {
        params: {
          p_id: registryId,
          output: 'JSON',
        },
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mon-Valley-Pollution-Tracking-System/1.0',
        },
      });

      const responseData = response.data as any;
      if (responseData && responseData.Results) {
        const records: NoncomplianceRecord[] = [];
        
        responseData.Results.forEach((record: any) => {
          records.push({
            facilityId: record.FacilityId || registryId,
            registryId,
            permitNumber: record.PermitNumber || '',
            violationType: record.ViolationType || 'Unknown',
            violationDate: record.ViolationDate ? new Date(record.ViolationDate) : new Date(),
            resolvedDate: record.ResolvedDate ? new Date(record.ResolvedDate) : undefined,
            description: record.Description || record.ViolationDescription || '',
            severity: record.Severity || 'Moderate',
          });
        });

        return records;
      }
    } catch (apiError: any) {
      console.warn(`EPA ECHO Noncompliance API call failed for registry ID ${registryId}:`, 
                   apiError.response?.status || apiError.message);
    }

    return [];
  } catch (error) {
    console.error('Error fetching noncompliance records:', error);
    return [];
  }
}

