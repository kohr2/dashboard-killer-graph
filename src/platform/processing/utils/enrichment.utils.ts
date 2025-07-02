export function flattenEnrichmentData(enrichedData: any): Record<string, any> {
  if (!enrichedData || typeof enrichedData !== 'object') {
    return {};
  }

  const flattened: Record<string, any> = {};

  /**
   * Recursively walks through an object tree, extracting primitive values (string, number, boolean)
   * and specially handling complex nested structures by flattening them into primitive values.
   */
  const walk = (node: Record<string, any>, prefix: string = '') => {
    for (const [key, value] of Object.entries(node)) {
      const fullKey = prefix ? `${prefix}_${key}` : key;

      // Handle null/undefined values
      if (value === null || value === undefined) {
        continue;
      }

      // Handle primitive values
      if (typeof value !== 'object') {
        flattened[fullKey] = value;
        continue;
      }

      // Explicitly skip empty objects
      if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
        continue;
      }

      // Handle arrays
      if (Array.isArray(value)) {
        if (value.every(item => typeof item !== 'object' || item === null)) {
          flattened[fullKey] = value;
        } else {
          const isAddressArray = value.every(item => item && typeof item === 'object' && isAddressLikeObject(key, item));
          const isLocationArray = value.every(item => item && typeof item === 'object' && isLocationLikeObject(key, item));
          if (isAddressArray) {
            value.forEach((item, index) => {
              if (item && typeof item === 'object') {
                flattened[`${fullKey}_${index}`] = flattenAddressObject(item);
              }
            });
          } else if (isLocationArray) {
            value.forEach((item, index) => {
              if (item && typeof item === 'object') {
                flattened[`${fullKey}_${index}`] = flattenLocationObject(item);
              }
            });
          } else {
            value.forEach((item, index) => {
              if (item && typeof item === 'object') {
                walk(item, `${fullKey}_${index}`);
              }
            });
          }
        }
        continue;
      }

      // Handle address-like objects specially
      if (isAddressLikeObject(key, value)) {
        flattened[fullKey] = flattenAddressObject(value);
        continue;
      }

      // Handle location-like objects
      if (isLocationLikeObject(key, value)) {
        flattened[fullKey] = flattenLocationObject(value);
        continue;
      }

      // Handle contact-like objects
      if (isContactLikeObject(key, value)) {
        flattened[fullKey] = flattenContactObject(value);
        continue;
      }

      // Handle date-like objects
      if (isDateLikeObject(key, value)) {
        flattened[fullKey] = flattenDateObject(value);
        continue;
      }

      // For all other nested objects, recurse into their properties only if not empty
      if (Object.keys(value).length > 0) {
        walk(value, fullKey);
        // Defensive: remove parent key if it was set to empty string
        if (flattened[fullKey] === '') {
          delete flattened[fullKey];
        }
      }
      // Do not assign the parent key for complex nested structures (no assignment here)
    }
  };

  // Process the root object
  walk(enrichedData);

  return flattened;
}

/**
 * Check if an object looks like an address
 */
function isAddressLikeObject(key: string, value: any): boolean {
  if (!value || typeof value !== 'object') return false;

  // Quick accept if the key itself suggests an address and the value is a primitive string
  if (['address', 'addr'].includes(key.toLowerCase()) && typeof value === 'string') {
    return true;
  }

  const addressFieldKeys = [
    'street',
    'street1',
    'streetaddress',
    'addressline1',
    'city',
    'municipality',
    'zip',
    'zipcode',
    'postalcode',
    'postcode',
    'state',
    'province',
    'region',
    'stateorcountry',
    'country',
    'nation',
  ];

  const objectKeys = Object.keys(value).map(k => k.toLowerCase());

  // Consider it an address object only if it directly contains at least one address field
  const hasDirectAddressField = objectKeys.some(k => addressFieldKeys.includes(k));

  return (
    (['address', 'addr'].includes(key.toLowerCase()) && hasDirectAddressField) ||
    (
      hasDirectAddressField &&
      (objectKeys.includes('street') ||
        objectKeys.includes('street1') ||
        (objectKeys.includes('city') &&
          (objectKeys.includes('state') || objectKeys.includes('province') || objectKeys.includes('region'))))
  );
}

/**
 * Check if an object looks like a location
 */
function isLocationLikeObject(key: string, value: any): boolean {
  if (!value || typeof value !== 'object') return false;
  // Accept 'location' key if object has lat/lng or latitude/longitude
  if (key.toLowerCase() === 'location' && ((value.latitude !== undefined && value.longitude !== undefined) || (value.lat !== undefined && value.lng !== undefined))) {
    return true;
  }
  const locationKeys = ['location', 'geo', 'coordinates', 'lat', 'lng', 'latitude', 'longitude'];
  const objectKeys = Object.keys(value);
  return (
    locationKeys.includes(key.toLowerCase()) ||
    objectKeys.some(k => locationKeys.includes(k.toLowerCase())) ||
    (objectKeys.includes('latitude') && objectKeys.includes('longitude'))
  );
}

/**
 * Flatten an address object into a string
 */
function flattenAddressObject(addr: Record<string, any>): string {
  const parts = [];
  
  // Street address
  const street = addr.street1 || addr.street || addr.streetAddress || addr.addressLine1 || '';
  if (street) parts.push(street);
  
  // City
  const city = addr.city || addr.municipality || '';
  if (city) parts.push(city);
  
  // State/Province
  const state = addr.stateOrCountry || addr.state || addr.province || addr.region || '';
  
  // ZIP/Postal code
  const zip = addr.zipCode || addr.zip || addr.postalCode || addr.postCode || '';
  
  // Combine state and zip
  const stateZip = state && zip ? `${state} ${zip}` : state || zip;
  if (stateZip) parts.push(stateZip);
  
  // Country
  const country = addr.country || addr.nation || '';
  if (country) parts.push(country);
  
  return parts.join(', ').trim();
}

/**
 * Flatten a location object into a string, formatting lat/lng to 4 decimal places
 */
function flattenLocationObject(loc: Record<string, any>): string {
  const parts = [];
  // Coordinates
  let lat = loc.latitude || loc.lat || '';
  let lng = loc.longitude || loc.lng || '';
  if (typeof lat === 'number') lat = lat.toFixed(4);
  if (typeof lng === 'number') lng = lng.toFixed(4);
  if (lat && lng) {
    parts.push(`${lat}, ${lng}`);
  }
  // Name/Description
  const name = loc.name || loc.description || loc.title || '';
  if (name) parts.push(name);
  return parts.join(' - ').trim();
}

/**
 * Check if an object looks like contact information
 */
function isContactLikeObject(key: string, value: any): boolean {
  if (!value || typeof value !== 'object') return false;
  
  const contactKeys = ['contact', 'phone', 'email', 'fax', 'website', 'url'];
  const objectKeys = Object.keys(value);
  
  return (
    contactKeys.includes(key.toLowerCase()) ||
    objectKeys.some(k => contactKeys.includes(k.toLowerCase())) ||
    (objectKeys.includes('phone') || objectKeys.includes('email'))
  );
}

/**
 * Flatten a contact object into a string
 */
function flattenContactObject(contact: Record<string, any>): string {
  const parts = [];
  
  // Phone
  const phone = contact.phone || contact.telephone || contact.mobile || '';
  if (phone) parts.push(`Phone: ${phone}`);
  
  // Email
  const email = contact.email || contact.emailAddress || '';
  if (email) parts.push(`Email: ${email}`);
  
  // Website
  const website = contact.website || contact.url || contact.web || '';
  if (website) parts.push(`Web: ${website}`);
  
  return parts.join(' | ').trim();
}

/**
 * Check if an object looks like a date
 */
function isDateLikeObject(key: string, value: any): boolean {
  if (!value || typeof value !== 'object') return false;
  
  const dateKeys = ['date', 'time', 'created', 'updated', 'timestamp'];
  const objectKeys = Object.keys(value);
  
  return (
    dateKeys.includes(key.toLowerCase()) ||
    objectKeys.some(k => dateKeys.includes(k.toLowerCase()))
  );
}

/**
 * Flatten a date object into a string
 */
function flattenDateObject(dateObj: Record<string, any>): string {
  // Try to extract a date string from various possible formats
  const dateStr = dateObj.date || dateObj.time || dateObj.timestamp || dateObj.created || dateObj.updated || '';
  
  if (typeof dateStr === 'string') {
    return dateStr;
  }
  
  // If it's a Date object or timestamp
  if (dateStr instanceof Date) {
    return dateStr.toISOString();
  }
  
  // If it's a number (timestamp)
  if (typeof dateStr === 'number') {
    return new Date(dateStr).toISOString();
  }
  
  return '';
}

export function mergeEnrichedData(
  existingProps: Record<string, any>,
  enrichedData: any,
): Record<string, any> {
  const flattened = flattenEnrichmentData(enrichedData);
  return {
    ...existingProps,
    ...flattened,
  };
} 