import { flattenEnrichmentData, mergeEnrichedData } from '../enrichment.utils';

describe('enrichment.utils', () => {
  describe('flattenEnrichmentData', () => {
    it('should handle null and undefined values', () => {
      const input = {
        name: 'Test',
        nullValue: null,
        undefinedValue: undefined,
        emptyObject: {}
      };

      const result = flattenEnrichmentData(input);

      expect(result).toEqual({
        name: 'Test'
      });
    });

    it('should preserve primitive values', () => {
      const input = {
        string: 'test',
        number: 123,
        boolean: true,
        array: [1, 2, 3]
      };

      const result = flattenEnrichmentData(input);

      expect(result).toEqual(input);
    });

    it('should flatten address objects with various field names', () => {
      const input = {
        address: {
          street1: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        location: {
          street: '456 Oak Ave',
          municipality: 'Los Angeles',
          stateOrCountry: 'CA',
          zip: '90210'
        },
        addr: {
          streetAddress: '789 Pine Rd',
          province: 'TX',
          postalCode: '75001'
        }
      };

      const result = flattenEnrichmentData(input);

      expect(result).toEqual({
        address: '123 Main St, New York, NY 10001, USA',
        location: '456 Oak Ave, Los Angeles, CA 90210',
        addr: '789 Pine Rd, TX 75001'
      });
    });

    it('should flatten location objects with coordinates', () => {
      const input = {
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          name: 'New York City'
        },
        geo: {
          lat: 34.0522,
          lng: -118.2437,
          description: 'Los Angeles'
        }
      };

      const result = flattenEnrichmentData(input);

      expect(result).toEqual({
        location: '40.7128, -74.0060 - New York City',
        geo: '34.0522, -118.2437 - Los Angeles'
      });
    });

    it('should flatten contact objects', () => {
      const input = {
        contact: {
          phone: '+1-555-123-4567',
          email: 'test@example.com',
          website: 'https://example.com'
        },
        contactInfo: {
          telephone: '+1-555-987-6543',
          emailAddress: 'contact@test.com',
          url: 'https://test.com'
        }
      };

      const result = flattenEnrichmentData(input);

      expect(result).toEqual({
        contact: 'Phone: +1-555-123-4567 | Email: test@example.com | Web: https://example.com',
        contactInfo: 'Phone: +1-555-987-6543 | Email: contact@test.com | Web: https://test.com'
      });
    });

    it('should flatten date objects', () => {
      const input = {
        created: {
          date: '2023-01-15T10:30:00Z'
        },
        updated: {
          timestamp: 1673778600000
        },
        timeInfo: {
          time: new Date('2023-01-15T10:30:00Z')
        }
      };

      const result = flattenEnrichmentData(input);

      expect(result).toEqual({
        created: '2023-01-15T10:30:00Z',
        updated: '2023-01-15T10:30:00.000Z',
        timeInfo: '2023-01-15T10:30:00.000Z'
      });
    });

    it('should handle nested arrays of objects', () => {
      const input = {
        addresses: [
          {
            street: '123 Main St',
            city: 'New York',
            state: 'NY'
          },
          {
            street: '456 Oak Ave',
            city: 'Los Angeles',
            state: 'CA'
          }
        ]
      };

      const result = flattenEnrichmentData(input);

      expect(result).toEqual({
        addresses_0: '123 Main St, New York, NY',
        addresses_1: '456 Oak Ave, Los Angeles, CA'
      });
    });

    it('should handle complex nested structures', () => {
      const input = {
        organization: {
          name: 'Test Corp',
          address: {
            street: '123 Business Ave',
            city: 'Business City',
            state: 'BC',
            zip: '12345'
          },
          contact: {
            phone: '+1-555-123-4567',
            email: 'info@testcorp.com'
          },
          locations: [
            {
              latitude: 40.7128,
              longitude: -74.0060,
              name: 'HQ'
            }
          ]
        }
      };

      console.log('DEBUG - Input:', JSON.stringify(input, null, 2));
      const result = flattenEnrichmentData(input);
      console.log('DEBUG - Result:', JSON.stringify(result, null, 2));

      expect(result).toEqual({
        organization_name: 'Test Corp',
        organization_address: '123 Business Ave, Business City, BC 12345',
        organization_contact: 'Phone: +1-555-123-4567 | Email: info@testcorp.com',
        organization_locations_0: '40.7128, -74.0060 - HQ'
      });
    });

    it('should debug simple nested object', () => {
      const input = {
        organization: {
          name: 'Test Corp'
        }
      };

      const result = flattenEnrichmentData(input);
      console.log('DEBUG - Simple test result:', JSON.stringify(result, null, 2));

      expect(result).toEqual({
        organization_name: 'Test Corp'
      });
    });

    it('should debug locations array', () => {
      const input = {
        organization: {
          locations: [
            {
              latitude: 40.7128,
              longitude: -74.0060,
              name: 'HQ'
            }
          ]
        }
      };

      const result = flattenEnrichmentData(input);
      console.log('DEBUG - Locations array test result:', JSON.stringify(result, null, 2));

      expect(result).toEqual({
        organization_locations_0: '40.7128, -74.0060 - HQ'
      });
    });

    it('should handle EDGAR-like enrichment data', () => {
      const input = {
        legalName: 'Test Corporation',
        address: {
          street1: '123 Corporate Blvd',
          city: 'Corporate City',
          stateOrCountry: 'CC',
          zipCode: '54321'
        },
        phone: '+1-555-987-6543',
        website: 'https://testcorp.com',
        sic: '1234',
        industry: 'Technology'
      };

      const result = flattenEnrichmentData(input);

      expect(result).toEqual({
        legalName: 'Test Corporation',
        address: '123 Corporate Blvd, Corporate City, CC 54321',
        phone: '+1-555-987-6543',
        website: 'https://testcorp.com',
        sic: '1234',
        industry: 'Technology'
      });
    });
  });

  describe('mergeEnrichedData', () => {
    it('should merge existing properties with flattened enriched data', () => {
      const existingProps = {
        name: 'Original Name',
        type: 'Organization'
      };

      const enrichedData = {
        legalName: 'Enriched Legal Name',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY'
        },
        contact: {
          phone: '+1-555-123-4567',
          email: 'test@example.com'
        }
      };

      const result = mergeEnrichedData(existingProps, enrichedData);

      expect(result).toEqual({
        name: 'Original Name',
        type: 'Organization',
        legalName: 'Enriched Legal Name',
        address: '123 Main St, New York, NY',
        contact: 'Phone: +1-555-123-4567 | Email: test@example.com'
      });
    });

    it('should overwrite existing properties with enriched data', () => {
      const existingProps = {
        name: 'Original Name',
        address: 'Old Address'
      };

      const enrichedData = {
        name: 'New Name',
        address: {
          street: '123 New St',
          city: 'New City',
          state: 'NC'
        }
      };

      const result = mergeEnrichedData(existingProps, enrichedData);

      expect(result).toEqual({
        name: 'New Name',
        address: '123 New St, New City, NC'
      });
    });
  });
}); 