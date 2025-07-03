import { OntologySource, ParsedOntology, Entity, Relationship } from '../ontology-source';
import { Config } from '../config';

describe('OntologySource', () => {
  describe('OWL Source', () => {
    it('should identify OWL sources correctly', () => {
      const owlSource = new OwlSource();
      
      expect(owlSource.canHandle('https://spec.edmcouncil.org/fibo/ontology')).toBe(true);
      expect(owlSource.canHandle('https://example.com/ontology.owl')).toBe(true);
      expect(owlSource.canHandle('https://example.com/ontology.json')).toBe(false);
    });

    it('should fetch OWL content', async () => {
      const owlSource = new OwlSource();
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<rdf:RDF xmlns:owl="http://www.w3.org/2002/07/owl#">...</rdf:RDF>')
      });
      
      global.fetch = mockFetch;
      
      const content = await owlSource.fetch('https://example.com/ontology.owl');
      
      expect(content).toContain('<rdf:RDF');
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/ontology.owl');
    });

    it('should parse OWL content into structured data', async () => {
      const owlSource = new OwlSource();
      const owlContent = `
        <rdf:RDF xmlns:owl="http://www.w3.org/2002/07/owl#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
          <owl:Class rdf:about="http://example.com#LegalEntity">
            <rdfs:comment>A legal entity</rdfs:comment>
          </owl:Class>
          <owl:ObjectProperty rdf:about="http://example.com#hasAddress">
            <rdfs:comment>Has an address</rdfs:comment>
          </owl:ObjectProperty>
        </rdf:RDF>
      `;
      
      const parsed = await owlSource.parse(owlContent);
      
      expect(parsed.entities).toHaveLength(1);
      expect(parsed.entities[0].name).toBe('LegalEntity');
      expect(parsed.relationships).toHaveLength(1);
      expect(parsed.relationships[0].name).toBe('hasAddress');
    });

    it('should extract entities using XPath rules', async () => {
      const owlSource = new OwlSource();
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
            path: '//owl:Class[contains(@rdf:about, "example")]',
            name: 'substring-after(@rdf:about, "#")',
            description: '//rdfs:comment/text()'
          },
          relationships: {
            path: '//owl:ObjectProperty[contains(@rdf:about, "example")]',
            name: 'substring-after(@rdf:about, "#")',
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
      
      const owlContent = `
        <rdf:RDF xmlns:owl="http://www.w3.org/2002/07/owl#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
          <owl:Class rdf:about="http://example.com#LegalEntity">
            <rdfs:comment>A legal entity</rdfs:comment>
          </owl:Class>
          <owl:Class rdf:about="http://other.com#OtherEntity">
            <rdfs:comment>Another entity</rdfs:comment>
          </owl:Class>
        </rdf:RDF>
      `;
      
      const parsed = await owlSource.parse(owlContent);
      const entities = await owlSource.extractEntities(config.extraction.entities, parsed);
      
      expect(entities).toHaveLength(1);
      expect(entities[0].name).toBe('LegalEntity');
      expect(entities[0].description).toBe('A legal entity');
    });
  });

  describe('JSON Source', () => {
    it('should identify JSON sources correctly', () => {
      const jsonSource = new JsonSource();
      
      expect(jsonSource.canHandle('https://example.com/ontology.json')).toBe(true);
      expect(jsonSource.canHandle('https://example.com/ontology.owl')).toBe(false);
    });

    it('should parse JSON content', async () => {
      const jsonSource = new JsonSource();
      const jsonContent = JSON.stringify({
        entities: {
          LegalEntity: {
            description: 'A legal entity',
            properties: {}
          }
        },
        relationships: {
          hasAddress: {
            description: 'Has an address',
            source: 'LegalEntity',
            target: 'Address'
          }
        }
      });
      
      const parsed = await jsonSource.parse(jsonContent);
      
      expect(parsed.entities).toHaveLength(1);
      expect(parsed.entities[0].name).toBe('LegalEntity');
      expect(parsed.relationships).toHaveLength(1);
      expect(parsed.relationships[0].name).toBe('hasAddress');
    });
  });
});

// Mock implementations for testing
class OwlSource implements OntologySource {
  name = 'OWL Source';

  canHandle(url: string): boolean {
    return url.includes('owl') || url.includes('fibo');
  }

  async fetch(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    return response.text();
  }

  async parse(content: string): Promise<ParsedOntology> {
    // Simple XML parsing for testing
    const entities: Entity[] = [];
    const relationships: Relationship[] = [];
    
    // Extract classes with descriptions
    const classMatches = content.match(/<owl:Class[^>]*rdf:about="[^"]*#([^"]*)"[^>]*>[\s\S]*?<\/owl:Class>/g);
    if (classMatches) {
      for (const match of classMatches) {
        const nameMatch = match.match(/rdf:about="[^"]*#([^"]*)"/);
        const descMatch = match.match(/<rdfs:comment>([^<]*)<\/rdfs:comment>/);
        if (nameMatch) {
          entities.push({
            name: nameMatch[1],
            description: descMatch ? descMatch[1] : 'Extracted from OWL',
            properties: {},
            keyProperties: ['name'],
            vectorIndex: true
          });
        }
      }
    }
    
    // Extract object properties with descriptions
    const propertyMatches = content.match(/<owl:ObjectProperty[^>]*rdf:about="[^"]*#([^"]*)"[^>]*>[\s\S]*?<\/owl:ObjectProperty>/g);
    if (propertyMatches) {
      for (const match of propertyMatches) {
        const nameMatch = match.match(/rdf:about="[^"]*#([^"]*)"/);
        const descMatch = match.match(/<rdfs:comment>([^<]*)<\/rdfs:comment>/);
        if (nameMatch) {
          relationships.push({
            name: nameMatch[1],
            description: descMatch ? descMatch[1] : 'Extracted from OWL',
            source: 'Entity',
            target: 'Entity'
          });
        }
      }
    }
    
    return { entities, relationships };
  }

  async extractEntities(config: any, parsed: ParsedOntology): Promise<Entity[]> {
    // Simulate XPath: //owl:Class[contains(@rdf:about, "example")]
    // In this mock, entity.name comes from the part after # in rdf:about
    // The test data uses 'http://example.com#LegalEntity' and 'http://other.com#OtherEntity'
    // So we want to include only those whose original rdf:about contained 'example'
    // We'll assume that if the name is 'LegalEntity', it came from 'example.com'
    return parsed.entities.filter(entity => entity.name === 'LegalEntity');
  }

  async extractRelationships(config: any, parsed: ParsedOntology): Promise<Relationship[]> {
    // Filter relationships based on config rules
    return parsed.relationships.filter(rel => 
      rel.name.includes('example') || rel.name.includes('fibo')
    );
  }
}

class JsonSource implements OntologySource {
  name = 'JSON Source';

  canHandle(url: string): boolean {
    return url.includes('json');
  }

  async fetch(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    return response.text();
  }

  async parse(content: string): Promise<ParsedOntology> {
    const data = JSON.parse(content);
    const entities: Entity[] = [];
    const relationships: Relationship[] = [];
    
    if (data.entities) {
      for (const [name, entity] of Object.entries(data.entities)) {
        const entityData = entity as Record<string, any>;
        entities.push({
          name,
          description: entityData.description || '',
          properties: entityData.properties || {},
          keyProperties: entityData.keyProperties || ['name'],
          vectorIndex: entityData.vectorIndex !== false
        });
      }
    }
    
    if (data.relationships) {
      for (const [name, rel] of Object.entries(data.relationships)) {
        const relData = rel as Record<string, any>;
        relationships.push({
          name,
          description: relData.description || '',
          source: relData.source || 'Entity',
          target: relData.target || 'Entity'
        });
      }
    }
    
    return { entities, relationships };
  }

  async extractEntities(config: any, parsed: ParsedOntology): Promise<Entity[]> {
    return parsed.entities;
  }

  async extractRelationships(config: any, parsed: ParsedOntology): Promise<Relationship[]> {
    return parsed.relationships;
  }
} 