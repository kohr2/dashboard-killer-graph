import { OntologyExtractor } from '../extractor';
import { Config } from '../config';
import { OntologySource, ParsedOntology, Entity, Relationship } from '../ontology-source';

describe('OntologyExtractor', () => {
  it('should extract entities and relationships from an OWL source', async () => {
    const mockSource: OntologySource = {
      name: 'Mock OWL',
      canHandle: () => true,
      fetch: async () => '<rdf:RDF><owl:Class rdf:about="http://example.com#LegalEntity"><rdfs:comment>A legal entity</rdfs:comment></owl:Class><owl:ObjectProperty rdf:about="http://example.com#hasAddress"><rdfs:comment>Has an address</rdfs:comment></owl:ObjectProperty></rdf:RDF>',
      parse: async (content: string) => ({
        entities: [
          { name: 'LegalEntity', description: 'A legal entity', properties: {}, keyProperties: ['name'], vectorIndex: true }
        ],
        relationships: [
          { name: 'hasAddress', description: 'Has an address', source: 'LegalEntity', target: 'Address' }
        ]
      }),
      extractEntities: async (rule, parsed) => parsed.entities,
      extractRelationships: async (rule, parsed) => parsed.relationships
    };

    const config: Config = {
      name: 'test',
      source: {
        url: 'https://example.com/ontology.owl',
        type: 'owl',
        version: '1.0.0',
        description: 'Test ontology'
      },
      extraction: {
        entities: {
          path: '//owl:Class',
          name: '@rdf:about',
          description: '//rdfs:comment/text()'
        },
        relationships: {
          path: '//owl:ObjectProperty',
          name: '@rdf:about',
          description: '//rdfs:comment/text()'
        }
      },
      overrides: {
        entities: {},
        relationships: {}
      },
      metadata: {
        lastExtraction: new Date().toISOString(),
        sourceVersion: '1.0.0',
        localVersion: '1.0.0'
      }
    };

    const extractor = new OntologyExtractor(mockSource);
    const result = await extractor.extract(config);

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].name).toBe('LegalEntity');
    expect(result.relationships).toHaveLength(1);
    expect(result.relationships[0].name).toBe('hasAddress');
    expect(result.metadata.sourceUrl).toBe('https://example.com/ontology.owl');
    expect(result.metadata.entityCount).toBe(1);
    expect(result.metadata.relationshipCount).toBe(1);
    expect(typeof result.metadata.extractionDate).toBe('string');
    expect(result.metadata.sourceVersion).toBe('1.0.0');
  });

  it('should extract from a JSON source', async () => {
    const mockSource: OntologySource = {
      name: 'Mock JSON',
      canHandle: () => true,
      fetch: async () => '{"entities":{"LegalEntity":{"description":"A legal entity","properties":{}}},"relationships":{"hasAddress":{"description":"Has an address","source":"LegalEntity","target":"Address"}}}',
      parse: async (content: string) => ({
        entities: [
          { name: 'LegalEntity', description: 'A legal entity', properties: {}, keyProperties: ['name'], vectorIndex: true }
        ],
        relationships: [
          { name: 'hasAddress', description: 'Has an address', source: 'LegalEntity', target: 'Address' }
        ]
      }),
      extractEntities: async (rule, parsed) => parsed.entities,
      extractRelationships: async (rule, parsed) => parsed.relationships
    };

    const config: Config = {
      name: 'test',
      source: {
        url: 'https://example.com/ontology.json',
        type: 'json',
        version: '1.0.0',
        description: 'Test ontology'
      },
      extraction: {
        entities: {
          path: '$.entities',
          name: '$.name',
          description: '$.description'
        },
        relationships: {
          path: '$.relationships',
          name: '$.name',
          description: '$.description'
        }
      },
      overrides: {
        entities: {},
        relationships: {}
      },
      metadata: {
        lastExtraction: new Date().toISOString(),
        sourceVersion: '1.0.0',
        localVersion: '1.0.0'
      }
    };

    const extractor = new OntologyExtractor(mockSource);
    const result = await extractor.extract(config);

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].name).toBe('LegalEntity');
    expect(result.relationships).toHaveLength(1);
    expect(result.relationships[0].name).toBe('hasAddress');
    expect(result.metadata.sourceUrl).toBe('https://example.com/ontology.json');
    expect(result.metadata.entityCount).toBe(1);
    expect(result.metadata.relationshipCount).toBe(1);
    expect(typeof result.metadata.extractionDate).toBe('string');
    expect(result.metadata.sourceVersion).toBe('1.0.0');
  });
}); 