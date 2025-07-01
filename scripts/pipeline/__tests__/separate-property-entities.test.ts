import { separatePropertyEntities } from '../email-ingestion';

interface TestEntity {
  id: string;
  name: string;
  type: string;
  label: string;
}

describe('separatePropertyEntities', () => {
  it('should split entities into property and non-property groups based on dynamic ontology property types', () => {
    const propertyEntityTypes = ['Email', 'MonetaryAmount'];

    const entities = [
      { id: '1', name: 'test@example.com', type: 'Email', label: 'Email' },
      { id: '2', name: '$5M', type: 'MonetaryAmount', label: 'MonetaryAmount' },
      { id: '3', name: 'ACME Corp', type: 'Organization', label: 'Organization' },
    ];

    const { propertyEntities, nonPropertyEntities } = separatePropertyEntities(
      entities as any,
      propertyEntityTypes,
    );

    expect(propertyEntities.map((e: any) => e.type)).toEqual(
      expect.arrayContaining(['Email', 'MonetaryAmount']),
    );
    expect(nonPropertyEntities.map((e: any) => e.type)).toEqual(['Organization']);
  });
}); 