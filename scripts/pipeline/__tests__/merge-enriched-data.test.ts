import { mergeEnrichedData } from '../enrichment.utils';
import { v4 as uuidv4 } from 'uuid';

describe('mergeEnrichedData (update path)', () => {
  it('should flatten EDGAR block and merge into existing primitive props', () => {
    const existingNodeProps = {
      id: uuidv4(),
      name: 'Morgan Stanley',
      category: 'Organization',
    };

    const enrichedData = {
      EDGAR: {
        legalName: 'MORGAN STANLEY',
        cik: '0000895421',
        sic: '6211',
        sicDescription: 'Security Brokers, Dealers & Flotation Companies',
        address: {
          street1: '1585 BROADWAY',
          city: 'NEW YORK',
          stateOrCountry: 'NY',
          zipCode: '10036',
        },
      },
    };

    const result = mergeEnrichedData(existingNodeProps, enrichedData);

    expect(result).toEqual({
      ...existingNodeProps,
      legalName: 'MORGAN STANLEY',
      cik: '0000895421',
      sic: '6211',
      sicDescription: 'Security Brokers, Dealers & Flotation Companies',
      address: '1585 BROADWAY, NEW YORK, NY 10036',
    });
  });
}); 