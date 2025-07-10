import { parseGeonamesLine, transformGeonamesData } from '../transform-geonames-data';

describe('GeoNames Data Transformation', () => {
  describe('parseGeonamesLine', () => {
    it('should parse a valid GeoNames line correctly', () => {
      const sampleLine = '5128581\tNew York\tNew York\tNYC,New York,Big Apple\t40.71427\t-74.00597\tP\tPPL\tUS\t\t\t\t\t\t\t\t\t\t8175133\tAmerica/New_York\t2023-01-01';
      
      const result = parseGeonamesLine(sampleLine);
      
      expect(result).toEqual({
        geonameid: '5128581',
        name: 'New York',
        asciiname: 'New York',
        alternatenames: 'NYC,New York,Big Apple',
        latitude: 40.71427,
        longitude: -74.00597,
        featureClass: 'P',
        featureCode: 'PPL',
        countryCode: 'US',
        admin1Code: '',
        population: 8175133,
        timezone: 'America/New_York',
        modificationDate: '2023-01-01'
      });
    });

    it('should return null for invalid lines', () => {
      const invalidLine = 'incomplete,line';
      const result = parseGeonamesLine(invalidLine);
      expect(result).toBeNull();
    });

    it('should handle empty lines', () => {
      const emptyLine = '';
      const result = parseGeonamesLine(emptyLine);
      expect(result).toBeNull();
    });
  });

  describe('transformGeonamesData', () => {
    it('should filter and transform populated places correctly', () => {
      const sampleRecords = [
        {
          geonameid: '5128581',
          name: 'New York',
          asciiname: 'New York',
          alternatenames: 'NYC,New York,Big Apple',
          latitude: 40.71427,
          longitude: -74.00597,
          featureClass: 'P',
          featureCode: 'PPL',
          countryCode: 'US',
          admin1Code: '',
          population: 8175133,
          timezone: 'America/New_York',
          modificationDate: '2023-01-01'
        },
        {
          geonameid: '1234567',
          name: 'Mount Everest',
          asciiname: 'Mount Everest',
          alternatenames: 'Sagarmatha,Chomolungma',
          latitude: 27.9881,
          longitude: 86.9253,
          featureClass: 'T',
          featureCode: 'MT',
          countryCode: 'NP',
          admin1Code: '',
          population: 0,
          timezone: 'Asia/Kathmandu',
          modificationDate: '2023-01-01'
        },
        {
          geonameid: '2988507',
          name: 'Paris',
          asciiname: 'Paris',
          alternatenames: 'Lutetia,Parigi',
          latitude: 48.8566,
          longitude: 2.3522,
          featureClass: 'P',
          featureCode: 'PPLC',
          countryCode: 'FR',
          admin1Code: '',
          population: 2161000,
          timezone: 'Europe/Paris',
          modificationDate: '2023-01-01'
        }
      ];

      const result = transformGeonamesData(sampleRecords);

      expect(result).toHaveLength(2); // Only populated places (P class)
      expect(result[0].name).toBe('New York'); // Sorted by population descending
      expect(result[1].name).toBe('Paris');
      expect(result[0].entityType).toBe('City');
      expect(result[1].entityType).toBe('City');
    });

    it('should sort by population in descending order', () => {
      const sampleRecords = [
        {
          geonameid: '1',
          name: 'Small City',
          asciiname: 'Small City',
          alternatenames: '',
          latitude: 0,
          longitude: 0,
          featureClass: 'P',
          featureCode: 'PPL',
          countryCode: 'US',
          admin1Code: '',
          population: 1000,
          timezone: 'UTC',
          modificationDate: '2023-01-01'
        },
        {
          geonameid: '2',
          name: 'Big City',
          asciiname: 'Big City',
          alternatenames: '',
          latitude: 0,
          longitude: 0,
          featureClass: 'P',
          featureCode: 'PPL',
          countryCode: 'US',
          admin1Code: '',
          population: 1000000,
          timezone: 'UTC',
          modificationDate: '2023-01-01'
        }
      ];

      const result = transformGeonamesData(sampleRecords);

      expect(result[0].name).toBe('Big City');
      expect(result[1].name).toBe('Small City');
    });

    it('should filter out non-populated places', () => {
      const sampleRecords = [
        {
          geonameid: '1',
          name: 'Mountain',
          asciiname: 'Mountain',
          alternatenames: '',
          latitude: 0,
          longitude: 0,
          featureClass: 'T', // Terrain, not populated
          featureCode: 'MT',
          countryCode: 'US',
          admin1Code: '',
          population: 0,
          timezone: 'UTC',
          modificationDate: '2023-01-01'
        }
      ];

      const result = transformGeonamesData(sampleRecords);

      expect(result).toHaveLength(0);
    });
  });
}); 