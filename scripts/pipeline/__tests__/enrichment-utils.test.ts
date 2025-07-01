import { flattenEnrichmentData } from '../enrichment.utils';

describe('flattenEnrichmentData', () => {
  it('should flatten EDGAR address and merge properties at root level', () => {
    const enrichedData = {
      EDGAR: {
        legalName: 'MORGAN STANLEY',
        cik: 12345,
        sic: 6021,
        sicDescription: 'National Commercial Banks',
        address: {
          street1: '1585 Broadway',
          city: 'New York',
          stateOrCountry: 'NY',
          zipCode: '10036',
        },
      },
    };

    const result = flattenEnrichmentData(enrichedData);

    expect(result).toEqual({
      legalName: 'MORGAN STANLEY',
      cik: 12345,
      sic: 6021,
      sicDescription: 'National Commercial Banks',
      address: '1585 Broadway, New York, NY 10036',
    });
  });

  it('should return empty object when enrichedData is null or undefined', () => {
    expect(flattenEnrichmentData(null as any)).toEqual({});
    expect(flattenEnrichmentData(undefined as any)).toEqual({});
  });

  it('should flatten EDGAR object even when enrichedData contains mixed values', () => {
    const enrichedData = {
      source: 'internal',
      EDGAR: {
        legalName: 'GOLDMAN SACHS GROUP INC',
        cik: '0000886982',
        address: {
          street1: '200 WEST STREET',
          city: 'NEW YORK',
          stateOrCountry: 'NY',
          zipCode: '10282',
        },
      },
    };

    const result = flattenEnrichmentData(enrichedData);

    expect(result).toEqual({
      legalName: 'GOLDMAN SACHS GROUP INC',
      cik: '0000886982',
      address: '200 WEST STREET, NEW YORK, NY 10282',
    });
  });

  it('should flatten EDGAR metadata block and extract address', () => {
    const enrichedData = {
      EDGAR: {
        metadata: {
          legalName: 'MORGAN STANLEY',
          cik: '0000895421',
          address: {
            street1: '1585 BROADWAY',
            city: 'NEW YORK',
            stateOrCountry: 'NY',
            zipCode: '10036',
          },
        },
      },
    };

    const result = flattenEnrichmentData(enrichedData);

    expect(result).toEqual({
      legalName: 'MORGAN STANLEY',
      cik: '0000895421',
      address: '1585 BROADWAY, NEW YORK, NY 10036',
    });
  });
}); 