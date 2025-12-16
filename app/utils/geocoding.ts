/**
 * Reverse geocoding utility to convert GPS coordinates to address components
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 * Optimized for Philippines addresses
 */

export interface GeocodeResult {
  city: string | null;
  barangay: string | null;
  region: string | null;
  fullAddress: string | null;
}

/**
 * Reverse geocode coordinates to get city and barangay
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @param retries - Number of retry attempts (default: 2)
 * @returns GeocodeResult with city, barangay, region, and full address
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  retries: number = 2
): Promise<GeocodeResult> {
  // Validate coordinates
  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    console.error('Invalid coordinates:', latitude, longitude);
    return { city: null, barangay: null, region: null, fullAddress: null };
  }

  // Ensure coordinates are within valid range
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    console.error('Coordinates out of range:', latitude, longitude);
    return { city: null, barangay: null, region: null, fullAddress: null };
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Use OpenStreetMap Nominatim API for reverse geocoding
      // Added accept-language for better Philippines results
      // Using zoom=16 for better administrative level details (barangay level)
      // Added namedetails=1 for more address component names
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1&namedetails=1&accept-language=en,fil&extratags=1&addressdetails=1`;
      
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      let response: Response;
      try {
        response = await fetch(url, {
          headers: {
            'User-Agent': 'AccessPoint-Mobile-App/1.0', // Required by Nominatim
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        // Network errors are expected in offline mode - don't log them
        const errorMsg = fetchError?.message || String(fetchError) || '';
        const isNetworkError = errorMsg.toLowerCase().includes('network') || 
                               errorMsg.toLowerCase().includes('failed to fetch') ||
                               fetchError?.name === 'TypeError' ||
                               fetchError?.name === 'AbortError';
        
        if (attempt < retries && isNetworkError) {
          // Retry silently for network errors
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        
        // If all retries failed, return null without logging (network errors are expected offline)
        if (attempt === retries) {
          return { city: null, barangay: null, region: null, fullAddress: null };
        }
        continue;
      }

      if (!response.ok) {
        if (attempt < retries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        // Don't log API errors - they're expected in offline mode
        return { city: null, barangay: null, region: null, fullAddress: null };
      }

      const data = await response.json();
      
      if (!data || !data.address) {
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        return { city: null, barangay: null, region: null, fullAddress: null };
      }

      const address = data.address;
      
      // Philippines-specific address parsing
      // Try multiple strategies to extract city and barangay
      
      
      // Common subdivision/neighborhood/district names that are NOT barangays (filter these out)
      const subdivisionKeywords = [
        'village', 'subdivision', 'subd', 'estate', 'heights', 'hills', 
        'park', 'garden', 'residence', 'residential', 'compound', 'phase',
        'hillside', 'valley', 'ridge', 'manor', 'plaza', 'center', 'centre',
        'district', 'dist', 'district', 'zone', 'area', 'sector', 'block',
        'addition', 'homes', 'villas', 'townhouse', 'condo', 'condominium',
        'apartments', 'apartment', 'towers', 'tower', 'complex', 'precinct'
      ];
      
      // Function to check if a name is likely a subdivision/neighborhood/district (not barangay)
      // MUST be declared before use
      const isSubdivision = (name: string): boolean => {
        const lowerName = name.toLowerCase();
        // Check for subdivision keywords (must match whole word or be part of common patterns)
        if (subdivisionKeywords.some(keyword => {
          // Match whole word or at start/end of name
          const regex = new RegExp(`\\b${keyword}\\b|^${keyword}|${keyword}$`, 'i');
          return regex.test(lowerName);
        })) {
          return true;
        }
        // Check if it ends with "District", "Dist", "Hills", "Heights", etc.
        if (lowerName.match(/\s*(district|dist|zone|area|sector|hills|heights|park|garden|village|subdivision|subd)\s*$/i)) {
          return true;
        }
        // Check for common subdivision patterns like "Addition Hills", "Green Valley", etc.
        if (lowerName.match(/^(addition|green|blue|white|golden|royal|premier|grand|mega|super)\s+/i)) {
          return true;
        }
        // Check if name contains multiple subdivision indicators
        const subdivisionCount = subdivisionKeywords.filter(kw => lowerName.includes(kw)).length;
        if (subdivisionCount >= 2) {
          return true;
        }
        return false;
      };
      
      // Strategy 1: Direct address fields (most common)
      let city = 
        address.city || 
        address.town || 
        address.municipality || 
        null;

      // Clean city name - remove "City of" prefix and "City" suffix
      if (city) {
        city = city.replace(/^city\s+of\s+/i, '').replace(/\s+city$/i, '').trim();
      }

      // If no city found, try county (sometimes used for cities in PH)
      if (!city) {
        const county = address.county || null;
        if (county) {
          // Only use county if it doesn't look like a subdivision
          const cleanedCounty = county.replace(/^city\s+of\s+/i, '').replace(/\s+city$/i, '').trim();
          if (!isSubdivision(cleanedCounty) && cleanedCounty.length > 3) {
            city = cleanedCounty;
          }
        }
      }

      // Strategy 2: Check display_name for city if address fields don't have it
      if (!city && data.display_name) {
        const displayParts = data.display_name.split(',').map((p: string) => p.trim());
        // In Philippines: "Barangay, City, Province" or "Street, Barangay, City"
        // City is usually after barangay
        for (let i = 1; i < Math.min(5, displayParts.length); i++) {
          const part = displayParts[i];
          if (part) {
            // Clean the part
            let cleanedPart = part.replace(/^city\s+of\s+/i, '').replace(/\s+city$/i, '').trim();
            
            // Skip if it's a subdivision
            if (isSubdivision(cleanedPart)) {
              continue;
            }
            
            // Check if it contains city indicators
            const hasCityIndicator = part.toLowerCase().includes('city') || 
                                    part.toLowerCase().includes('municipality');
            // Or if it's a substantial name (likely city)
            const isValidCity = cleanedPart.length > 4 && cleanedPart.length < 50;
            
            // Skip common subdivision patterns
            const isCommonSubdivision = cleanedPart.match(/^(addition|green|blue|white|golden|royal|premier|grand|mega|super)\s+/i);
            
            if (!isCommonSubdivision && (hasCityIndicator || isValidCity)) {
              city = cleanedPart;
              break;
            }
          }
        }
      }
      
      // Validate city - ensure it's not a subdivision name
      if (city && isSubdivision(city)) {
        city = null;
      }

      // Extract barangay (Philippines specific)
      // Barangay can be in various fields - try all possible locations
      let barangay = null;
      
      // Strategy 1: Check common barangay fields (in order of likelihood)
      // But prioritize fields that are more likely to be actual barangays
      // NOTE: city_district is often a district, NOT a barangay - skip it
      const barangayFields = [
        'suburb',           // Common for barangay, but can be subdivision
        'neighbourhood',    // Often used for barangay
        'village',          // Sometimes barangay, but often subdivision
        'hamlet',           // Small settlements
        'quarter',          // Urban divisions
        // Skip 'city_district' - it's usually a district, not barangay
        // Skip 'residential' - less reliable
      ];
      
      for (const field of barangayFields) {
        if (address[field]) {
          const value = address[field].trim();
          // Validate it looks like a barangay name
          if (value && value.length > 2 && value.length < 100) {
            // Skip if it's a subdivision/neighborhood name
            if (isSubdivision(value)) {
              continue;
            }
            
            // Skip if it looks like a city name
            const cityIndicators = ['city', 'municipality', 'town', 'metro'];
            if (!cityIndicators.some(indicator => value.toLowerCase().includes(indicator))) {
              barangay = value;
              break;
            }
          }
        }
      }

      // Strategy 2: Parse from display_name (more reliable for Philippines)
      if (!barangay && data.display_name) {
        const displayParts = data.display_name.split(',').map((p: string) => p.trim());
        
        // In Philippines, address format is often: "Barangay Name, City, Province, Country"
        // Or: "Street, Barangay, City, Province"
        // Try to find barangay by looking for patterns
        
        // Check if any part contains "Barangay" or "Brgy" or "Bgy" (most reliable)
        for (let i = 0; i < Math.min(5, displayParts.length); i++) {
          const part = displayParts[i];
          if (part) {
            // Check if part explicitly mentions barangay
            if (part.match(/barangay|brgy|bgy|brg\./i)) {
              // Extract barangay name (remove "Barangay" prefix)
              const extracted = part.replace(/^(barangay|brgy|bgy|brg\.)\s*/i, '').trim();
              // Filter out subdivisions
              if (extracted && !isSubdivision(extracted)) {
                barangay = extracted;
                break;
              }
            }
          }
        }
        
        // Strategy 3: If no explicit barangay, try to identify it by position
        // Usually barangay is before city in Philippines addresses
        if (!barangay && displayParts.length >= 2) {
          // Barangay is often the first or second part (before city)
          // Skip street addresses (usually have numbers or "Street", "Avenue", etc.)
          for (let i = 0; i < Math.min(4, displayParts.length); i++) {
            const part = displayParts[i];
            if (part) {
              // Skip if it looks like a street (has numbers, "St", "Ave", etc.)
              const isStreet = part.match(/\d+|street|st\.|avenue|ave\.|road|rd\.|drive|dr\.|boulevard|blvd\./i);
              // Skip if it's too short or too long
              const isValidLength = part.length > 3 && part.length < 60;
              // Skip if it's a known city indicator
              const isCity = part.toLowerCase().includes('city') || 
                            part.toLowerCase().includes('municipality');
              // Skip if it's a subdivision/neighborhood
              const isSubdiv = isSubdivision(part);
              
              if (!isStreet && isValidLength && !isCity && !isSubdiv) {
                // This might be barangay - check if next part is city
                const nextPart = displayParts[i + 1];
                if (nextPart && (nextPart.toLowerCase().includes('city') || 
                                 nextPart.toLowerCase().includes('municipality') ||
                                 address.city === nextPart ||
                                 address.town === nextPart)) {
                  barangay = part;
                  break;
                }
              }
            }
          }
        }
      }

      // Strategy 4: Skip state_district and city_district - these are districts, not barangays
      // In Philippines, districts are administrative divisions larger than barangays
      // We want the actual barangay, not the district
      
      // Strategy 5: Check address object for barangay-specific tags
      if (!barangay && data.extratags) {
        // Sometimes barangay is in extratags
        const extraTags = data.extratags;
        if (extraTags.place && extraTags.place.toLowerCase().includes('barangay')) {
          const extracted = extraTags.name || extraTags.place;
          if (extracted && !isSubdivision(extracted)) {
            barangay = extracted;
          }
        }
      }
      
      // Strategy 6: If we still don't have barangay, try looking for it after filtering subdivisions and districts
      // Sometimes the API returns multiple address components and we need to find the right one
      if (!barangay) {
        // Fields to explicitly skip (these are districts or administrative divisions, not barangays)
        const skipFields = ['city_district', 'state_district', 'district', 'county', 'state', 'province', 'region'];
        
        // Check all address fields that might contain barangay
        const allPossibleFields = Object.keys(address);
        for (const field of allPossibleFields) {
          // Skip district and administrative fields
          if (skipFields.some(skipField => field.toLowerCase().includes(skipField))) {
            continue;
          }
          
          const value = address[field];
          if (value && typeof value === 'string') {
            const trimmed = value.trim();
            // Check if it's a valid barangay candidate
            if (trimmed.length > 3 && trimmed.length < 60 && 
                !isSubdivision(trimmed) &&
                !trimmed.toLowerCase().includes('city') &&
                !trimmed.toLowerCase().includes('municipality') &&
                !trimmed.toLowerCase().includes('province') &&
                !trimmed.toLowerCase().includes('region') &&
                !trimmed.toLowerCase().includes('district') &&
                !trimmed.toLowerCase().includes('dist')) {
              // This might be barangay - use it as last resort
              barangay = trimmed;
              break;
            }
          }
        }
      }

      // Extract region/province
      const region = 
        address.state || 
        address.province || 
        address.region ||
        address.state_district ||
        null;

      // Clean up extracted values
      const cleanedCity = city ? city.trim() : null;
      const cleanedBarangay = barangay ? barangay.trim() : null;
      const cleanedRegion = region ? region.trim() : null;

      // Build full address string
      const addressParts = [];
      if (cleanedBarangay) addressParts.push(cleanedBarangay);
      if (cleanedCity) addressParts.push(cleanedCity);
      if (cleanedRegion) addressParts.push(cleanedRegion);
      const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null;


      return {
        city: cleanedCity,
        barangay: cleanedBarangay,
        region: cleanedRegion,
        fullAddress: fullAddress || null,
      };
    } catch (error: any) {
      // If it's a timeout or network error, retry silently
      if (attempt < retries && (error.name === 'AbortError' || error.message?.includes('network'))) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      
      // If all retries failed, check if it's a network error (expected in offline mode)
      if (attempt === retries) {
        const errorMsg = error?.message || String(error) || '';
        const isNetworkError = errorMsg.toLowerCase().includes('network') || 
                               errorMsg.toLowerCase().includes('failed to fetch') ||
                               error.name === 'TypeError' ||
                               error.name === 'AbortError';
        
        // Only log non-network errors (network errors are expected in offline mode)
        if (__DEV__ && !isNetworkError) {
          console.error('Geocoding failed:', error.message || error);
        }
        return { city: null, barangay: null, region: null, fullAddress: null };
      }
    }
  }

  return { city: null, barangay: null, region: null, fullAddress: null };
}

