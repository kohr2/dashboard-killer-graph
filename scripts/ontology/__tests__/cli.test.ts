import { OntologyProcessor } from '../cli';
import { Config } from '../config';
import { OntologySource, Entity, Relationship } from '../ontology-source';

describe('OntologyProcessor CLI', () => {
  it('should process a complete ontology extraction and merge pipeline', async () => {
    const mockSource: OntologySource = {
      name: 'Mock Source',
      canHandle: () => true,
      fetch: async () => '<rdf:RDF><owl:Class rdf:about="http://example.com#LegalEntity"><rdfs:comment>A legal entity</rdfs:comment></owl:Class></rdf:RDF>',
      parse: async () => ({
        entities: [
          { name: 'LegalEntity', description: 'A legal entity', properties: {}, keyProperties: ['name'], vectorIndex: true }
        ],
        relationships: []
      }),
      extractEntities: async (rule, parsed) => parsed.entities,
      extractRelationships: async (rule, parsed) => parsed.relationships
    };

    const config: Config = {
      name: 'financial',
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
        entities: {
          LegalEntity: {
            properties: {
              customField: { type: 'string', description: 'Custom field' }
            },
            keyProperties: ['name', 'customField']
          }
        },
        relationships: {}
      },
      metadata: {
        lastExtraction: new Date().toISOString(),
        sourceVersion: '1.0.0',
        localVersion: '1.0.0'
      }
    };

    const processor = new OntologyProcessor([mockSource]);
    const result = await processor.processOntology(config);

    expect(result.success).toBe(true);
    expect(result.sourceOntology?.entities).toHaveLength(1);
    expect(result.sourceOntology?.entities[0].name).toBe('LegalEntity');
    expect(result.finalOntology?.entities.LegalEntity.properties).toHaveProperty('customField');
    expect(result.finalOntology?.entities.LegalEntity.keyProperties).toEqual(['name', 'customField']);
    expect(result.metadata?.entityCount).toBe(1);
    expect(result.metadata?.relationshipCount).toBe(0);
  });

  it('should handle extraction failures gracefully', async () => {
    const mockSource: OntologySource = {
      name: 'Mock Source',
      canHandle: () => true,
      fetch: async () => { throw new Error('Network error'); },
      parse: async () => ({ entities: [], relationships: [] }),
      extractEntities: async () => [],
      extractRelationships: async () => []
    };

    const config: Config = {
      name: 'financial',
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

    const processor = new OntologyProcessor([mockSource]);
    const result = await processor.processOntology(config);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });

  it('should select the correct source handler based on URL', async () => {
    const owlSource: OntologySource = {
      name: 'OWL Source',
      canHandle: (url: string) => url.includes('owl'),
      fetch: async () => '<rdf:RDF></rdf:RDF>',
      parse: async () => ({ entities: [], relationships: [] }),
      extractEntities: async () => [],
      extractRelationships: async () => []
    };

    const jsonSource: OntologySource = {
      name: 'JSON Source',
      canHandle: (url: string) => url.includes('json'),
      fetch: async () => '{}',
      parse: async () => ({ entities: [], relationships: [] }),
      extractEntities: async () => [],
      extractRelationships: async () => []
    };

    const processor = new OntologyProcessor([owlSource, jsonSource]);
    
    const owlConfig: Config = {
      name: 'owl-test',
      source: {
        url: 'https://example.com/ontology.owl',
        type: 'owl',
        version: '1.0.0',
        description: 'OWL ontology'
      },
      extraction: {
        entities: { path: '//test', name: '@id', description: '//desc' },
        relationships: { path: '//test', name: '@id', description: '//desc' }
      },
      overrides: { entities: {}, relationships: {} },
      metadata: {
        lastExtraction: new Date().toISOString(),
        sourceVersion: '1.0.0',
        localVersion: '1.0.0'
      }
    };

    const jsonConfig: Config = {
      name: 'json-test',
      source: {
        url: 'https://example.com/ontology.json',
        type: 'json',
        version: '1.0.0',
        description: 'JSON ontology'
      },
      extraction: {
        entities: { path: '$.test', name: '$.id', description: '$.desc' },
        relationships: { path: '$.test', name: '$.id', description: '$.desc' }
      },
      overrides: { entities: {}, relationships: {} },
      metadata: {
        lastExtraction: new Date().toISOString(),
        sourceVersion: '1.0.0',
        localVersion: '1.0.0'
      }
    };

    const owlResult = await processor.processOntology(owlConfig);
    const jsonResult = await processor.processOntology(jsonConfig);

    expect(owlResult.success).toBe(true);
    expect(jsonResult.success).toBe(true);
  });
}); 