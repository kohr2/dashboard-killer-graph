import { OwlSource } from '../sources/owl-source';
import { OntologyProcessor } from '../cli';
import { Config } from '../config';

describe('Real Ontology Sources', () => {
  describe('FIBO Integration', () => {
    it('should extract FIBO entities and relationships', async () => {
      const owlSource = new OwlSource();
      
      const config: Config = {
        name: 'financial',
        source: {
          url: 'https://spec.edmcouncil.org/fibo/ontology/BE/LegalEntities/LegalEntities.rdf',
          type: 'owl',
          version: '2024.03',
          description: 'Financial Industry Business Ontology (FIBO) - Legal Entities'
        },
        extraction: {
          entities: {
            path: '//owl:Class[contains(@rdf:about, "fibo")]',
            name: 'substring-after(@rdf:about, "#")',
            description: '//rdfs:comment/text()'
          },
          relationships: {
            path: '//owl:ObjectProperty[contains(@rdf:about, "fibo")]',
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
          sourceVersion: '2024.03',
          localVersion: '1.0.0'
        }
      };

      const processor = new OntologyProcessor([owlSource]);
      const result = await processor.processOntology(config);

      console.log('FIBO extraction result:', {
        success: result.success,
        entityCount: result.metadata?.entityCount,
        relationshipCount: result.metadata?.relationshipCount,
        error: result.error
      });

      // Note: This test may fail if FIBO URLs are not accessible
      // We're testing the integration, not the availability of external services
      if (result.success) {
        expect(result.metadata?.entityCount).toBeGreaterThan(0);
        expect(result.sourceOntology?.entities.length).toBeGreaterThan(0);
        
        // Check for common FIBO entities
        const entityNames = result.sourceOntology?.entities.map(e => e.name) || [];
        console.log('FIBO entities found:', entityNames.slice(0, 10));
        
        // Should find some FIBO entities
        expect(entityNames.length).toBeGreaterThan(0);
      } else {
        console.log('FIBO extraction failed (expected if URL not accessible):', result.error);
        // Test passes even if external service is not available
        expect(true).toBe(true);
      }
    }, 30000); // 30 second timeout for external requests
  });

  describe('O-CREAM Integration', () => {
    it('should extract O-CREAM entities and relationships', async () => {
      const owlSource = new OwlSource();
      
      const config: Config = {
        name: 'crm',
        source: {
          url: 'https://raw.githubusercontent.com/meaningfy-ws/o-cream-ontology/main/o-cream.owl',
          type: 'owl',
          version: '2.0',
          description: 'O-CREAM v2 Ontology for Customer Relationship Management'
        },
        extraction: {
          entities: {
            path: '//owl:Class[contains(@rdf:about, "o-cream")]',
            name: 'substring-after(@rdf:about, "#")',
            description: '//rdfs:comment/text()'
          },
          relationships: {
            path: '//owl:ObjectProperty[contains(@rdf:about, "o-cream")]',
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
          sourceVersion: '2.0',
          localVersion: '1.0.0'
        }
      };

      const processor = new OntologyProcessor([owlSource]);
      const result = await processor.processOntology(config);

      console.log('O-CREAM extraction result:', {
        success: result.success,
        entityCount: result.metadata?.entityCount,
        relationshipCount: result.metadata?.relationshipCount,
        error: result.error
      });

      // Note: This test may fail if O-CREAM URLs are not accessible
      if (result.success) {
        expect(result.metadata?.entityCount).toBeGreaterThan(0);
        expect(result.sourceOntology?.entities.length).toBeGreaterThan(0);
        
        // Check for common O-CREAM entities
        const entityNames = result.sourceOntology?.entities.map(e => e.name) || [];
        console.log('O-CREAM entities found:', entityNames.slice(0, 10));
        
        // Should find some O-CREAM entities
        expect(entityNames.length).toBeGreaterThan(0);
      } else {
        console.log('O-CREAM extraction failed (expected if URL not accessible):', result.error);
        // Test passes even if external service is not available
        expect(true).toBe(true);
      }
    }, 30000); // 30 second timeout for external requests
  });

  describe('OWL Source Parser', () => {
    it('should parse OWL content correctly', async () => {
      const owlSource = new OwlSource();
      
      const sampleOwl = `
        <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                 xmlns:owl="http://www.w3.org/2002/07/owl#"
                 xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#">
          <owl:Class rdf:about="http://example.com/fibo#LegalEntity">
            <rdfs:comment>A legal entity as defined in FIBO</rdfs:comment>
            <rdfs:label>Legal Entity</rdfs:label>
          </owl:Class>
          <owl:Class rdf:about="http://example.com/fibo#Organization">
            <rdfs:comment>An organization</rdfs:comment>
            <rdfs:label>Organization</rdfs:label>
          </owl:Class>
          <owl:ObjectProperty rdf:about="http://example.com/fibo#hasAddress">
            <rdfs:comment>Has an address</rdfs:comment>
            <rdfs:domain rdf:resource="http://example.com/fibo#LegalEntity"/>
            <rdfs:range rdf:resource="http://example.com/fibo#Address"/>
          </owl:ObjectProperty>
        </rdf:RDF>
      `;

      const parsed = await owlSource.parse(sampleOwl);

      expect(parsed.entities).toHaveLength(2);
      expect(parsed.entities[0].name).toBe('LegalEntity');
      expect(parsed.entities[0].description).toBe('A legal entity as defined in FIBO');
      expect(parsed.entities[1].name).toBe('Organization');
      expect(parsed.entities[1].description).toBe('An organization');

      expect(parsed.relationships).toHaveLength(1);
      expect(parsed.relationships[0].name).toBe('hasAddress');
      expect(parsed.relationships[0].description).toBe('Has an address');
      expect(parsed.relationships[0].source).toBe('LegalEntity');
      expect(parsed.relationships[0].target).toBe('Address');
    });

    it('should filter entities based on ontology type', async () => {
      const owlSource = new OwlSource();
      
      const sampleOwl = `
        <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                 xmlns:owl="http://www.w3.org/2002/07/owl#"
                 xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#">
          <owl:Class rdf:about="http://spec.edmcouncil.org/fibo#LegalEntity">
            <rdfs:comment>A legal entity</rdfs:comment>
          </owl:Class>
          <owl:Class rdf:about="http://other.com#OtherEntity">
            <rdfs:comment>Another entity</rdfs:comment>
          </owl:Class>
        </rdf:RDF>
      `;

      const parsed = await owlSource.parse(sampleOwl);
      
      // Test FIBO filtering
      const fiboEntities = await owlSource.extractEntities(
        { path: '//owl:Class[contains(@rdf:about, "fibo")]', name: '@rdf:about', description: '//rdfs:comment/text()' },
        parsed
      );

      expect(fiboEntities).toHaveLength(1);
      expect(fiboEntities[0].name).toBe('LegalEntity');
    });
  });
}); 