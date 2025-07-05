import { buildOntologySyncPayload } from '../content-processing.service';
import { OntologyService } from '@platform/ontology/ontology.service';

jest.mock('@platform/ontology/ontology.service');

const mockOntology = {
  name: 'mock',
  entities: {
    Item: { description: 'An item' },
    Email: { description: 'Email address', isProperty: true },
  },
  relationships: {
    RELATED_TO: { description: 'Related', domain: 'Item', range: 'Item' },
  },
};

describe('buildOntologySyncPayload', () => {
  it('includes descriptions and property types', () => {
    const fakeService = {
      getAllOntologies: () => [mockOntology],
    } as unknown as OntologyService;

    const payload = buildOntologySyncPayload(fakeService);

    expect(payload.entity_types).toEqual(expect.arrayContaining(['Item', 'Email']));
    expect(payload.property_types).toEqual(expect.arrayContaining(['Email']));
    expect(payload.entity_descriptions?.Item).toBe('An item');
    expect(payload.relationship_descriptions?.RELATED_TO).toBe('Related');
  });
}); 