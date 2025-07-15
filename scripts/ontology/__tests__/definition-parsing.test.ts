import { OntologyProcessor } from '../cli';
import { OwlSource } from '../sources/owl-source';
import { Config } from '../config';
import * as fs from 'fs';
import * as path from 'path';

describe('Definition text parsing for relationships', () => {
  const testOutputDir = path.join(__dirname, '../../test-output');

  beforeAll(() => {
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it('should extract relationships from definition text when domain/range are missing', async () => {
    // Create a test config with entities that have clear names in definitions
    const testConfig: Config = {
      name: 'test-ontology',
      source: {
        url: 'file://test.owl',
        type: 'owl',
        version: '1.0',
        description: 'Test ontology for definition parsing'
      },
      extraction: {
        entities: {
          path: '//owl:Class',
          name: 'substring-after(@rdf:about, "#")',
          description: '//rdfs:label/text()'
        },
        relationships: {
          path: '//owl:ObjectProperty',
          name: 'substring-after(@rdf:about, "#")',
          description: '//skos:definition/text()'
        }
      },
      overrides: {
        entities: {},
        relationships: {}
      },
      metadata: {
        lastExtraction: new Date().toISOString(),
        sourceVersion: '1.0',
        localVersion: '1.0.0'
      }
    };

    // Create a mock OWL file with relationships that have definitions but no explicit domain/range
    const mockOwlContent = `<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF xmlns:owl="http://www.w3.org/2002/07/owl#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#" xmlns:skos="http://www.w3.org/2004/02/skos/core#">
  <!-- Test entities -->
  <owl:Class rdf:about="http://test.org/ontology#Tenderer">
    <rdfs:label>Tenderer</rdfs:label>
    <skos:definition>An entity that submits a tender</skos:definition>
  </owl:Class>
  
  <owl:Class rdf:about="http://test.org/ontology#Lot">
    <rdfs:label>Lot</rdfs:label>
    <skos:definition>A distinct part of a procurement</skos:definition>
  </owl:Class>
  
  <owl:Class rdf:about="http://test.org/ontology#Contract">
    <rdfs:label>Contract</rdfs:label>
    <skos:definition>A legal agreement between parties</skos:definition>
  </owl:Class>
  
  <!-- Test relationships with definitions but no explicit domain/range -->
  <owl:ObjectProperty rdf:about="http://test.org/ontology#hasFinancialOfferValue">
    <skos:prefLabel>has Financial Offer Value</skos:prefLabel>
    <skos:definition>The value offered by the Tenderer for a Lot. This value is normally the one awarded for a winning Tender Lot.</skos:definition>
  </owl:ObjectProperty>
  
  <owl:ObjectProperty rdf:about="http://test.org/ontology#awardsContract">
    <skos:prefLabel>awards Contract</skos:prefLabel>
    <skos:definition>The process where a Tenderer is awarded a Contract for a specific Lot.</skos:definition>
  </owl:ObjectProperty>
  
  <owl:ObjectProperty rdf:about="http://test.org/ontology#submitsTender">
    <skos:prefLabel>submits Tender</skos:prefLabel>
    <skos:definition>When a Tenderer submits a tender for a Lot.</skos:definition>
  </owl:ObjectProperty>
</rdf:RDF>`;

    // Write mock OWL file
    const mockOwlPath = path.join(testOutputDir, 'test.owl');
    fs.writeFileSync(mockOwlPath, mockOwlContent);

    // Update config to point to mock file
    testConfig.source.url = `file://${mockOwlPath}`;

    // Initialize processor
    const owlSource = new OwlSource({ ontologyKey: 'test', includeExternalImports: false });
    const processor = new OntologyProcessor([owlSource]);
    
    // Process ontology
    const result = await processor.processOntology(testConfig);

    if (!result.success) {
      console.error('Processing failed:', result.error);
    }

    console.log('Processing result:', {
      success: result.success,
      entitiesCount: result.sourceOntology?.entities.length || 0,
      relationshipsCount: result.sourceOntology?.relationships.length || 0,
      entities: result.sourceOntology?.entities.map(e => e.name) || [],
      relationships: result.sourceOntology?.relationships.map(r => r.name) || []
    });

    expect(result.success).toBe(true);
    expect(result.sourceOntology).toBeDefined();
    expect(result.sourceOntology!.entities.length).toBeGreaterThan(0);
    expect(result.sourceOntology!.relationships.length).toBeGreaterThan(0);

    // Verify that relationships were extracted from definitions
    const relationships = result.sourceOntology!.relationships;
    const entities = result.sourceOntology!.entities.map(e => e.name);

    console.log('Extracted entities:', entities);
    console.log('Extracted relationships:', relationships.map(r => ({
      name: r.name,
      source: r.source,
      target: r.target,
      description: r.description
    })));

    // Check that relationships have valid source and target from entity list
    relationships.forEach(rel => {
      expect(entities).toContain(rel.source);
      expect(entities).toContain(rel.target);
      expect(rel.source).not.toBe('Entity'); // Should not be default fallback
      expect(rel.target).not.toBe('Entity'); // Should not be default fallback
    });

    // Verify specific relationships were correctly parsed
    const hasFinancialOfferValue = relationships.find(r => r.name === 'hasFinancialOfferValue');
    expect(hasFinancialOfferValue).toBeDefined();
    expect(hasFinancialOfferValue!.source).toBe('Tenderer');
    expect(hasFinancialOfferValue!.target).toBe('Lot');

    const awardsContract = relationships.find(r => r.name === 'awardsContract');
    expect(awardsContract).toBeDefined();
    expect(awardsContract!.source).toBe('Tenderer');
    expect(awardsContract!.target).toBe('Contract');

    const submitsTender = relationships.find(r => r.name === 'submitsTender');
    expect(submitsTender).toBeDefined();
    expect(submitsTender!.source).toBe('Tenderer');
    expect(submitsTender!.target).toBe('Lot');
  });

  it('should handle definitions with multiple entity mentions', async () => {
    // Test case for definitions that mention multiple entities
    const testConfig: Config = {
      name: 'test-ontology',
      source: {
        url: 'file://test2.owl',
        type: 'owl',
        version: '1.0',
        description: 'Test ontology for complex definition parsing'
      },
      extraction: {
        entities: {
          path: '//owl:Class',
          name: 'substring-after(@rdf:about, "#")',
          description: '//rdfs:label/text()'
        },
        relationships: {
          path: '//owl:ObjectProperty',
          name: 'substring-after(@rdf:about, "#")',
          description: '//skos:definition/text()'
        }
      },
      overrides: {
        entities: {},
        relationships: {}
      },
      metadata: {
        lastExtraction: new Date().toISOString(),
        sourceVersion: '1.0',
        localVersion: '1.0.0'
      }
    };

    const mockOwlContent = `<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF xmlns:owl="http://www.w3.org/2002/07/owl#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#" xmlns:skos="http://www.w3.org/2004/02/skos/core#">
  <owl:Class rdf:about="http://test.org/ontology#Buyer">
    <rdfs:label>Buyer</rdfs:label>
  </owl:Class>
  
  <owl:Class rdf:about="http://test.org/ontology#Supplier">
    <rdfs:label>Supplier</rdfs:label>
  </owl:Class>
  
  <owl:Class rdf:about="http://test.org/ontology#Contract">
    <rdfs:label>Contract</rdfs:label>
  </owl:Class>
  
  <owl:ObjectProperty rdf:about="http://test.org/ontology#negotiatesContract">
    <skos:prefLabel>negotiates Contract</skos:prefLabel>
    <skos:definition>The Buyer and Supplier negotiate the terms of a Contract.</skos:definition>
  </owl:ObjectProperty>
</rdf:RDF>`;

    const mockOwlPath = path.join(testOutputDir, 'test2.owl');
    fs.writeFileSync(mockOwlPath, mockOwlContent);
    testConfig.source.url = `file://${mockOwlPath}`;

    const owlSource = new OwlSource({ ontologyKey: 'test', includeExternalImports: false });
    const processor = new OntologyProcessor([owlSource]);
    
    const result = await processor.processOntology(testConfig);

    expect(result.success).toBe(true);
    
    const negotiatesContract = result.sourceOntology!.relationships.find(r => r.name === 'negotiatesContract');
    expect(negotiatesContract).toBeDefined();
    
    // Should pick the first two entities mentioned in the definition
    expect(negotiatesContract!.source).toBe('Buyer');
    expect(negotiatesContract!.target).toBe('Supplier');
  });

  it('should fallback to default when no entities found in definition', async () => {
    // Test case for definitions that don't mention any known entities
    const testConfig: Config = {
      name: 'test-ontology',
      source: {
        url: 'file://test3.owl',
        type: 'owl',
        version: '1.0',
        description: 'Test ontology for fallback handling'
      },
      extraction: {
        entities: {
          path: '//owl:Class',
          name: 'substring-after(@rdf:about, "#")',
          description: '//rdfs:label/text()'
        },
        relationships: {
          path: '//owl:ObjectProperty',
          name: 'substring-after(@rdf:about, "#")',
          description: '//skos:definition/text()'
        }
      },
      overrides: {
        entities: {},
        relationships: {}
      },
      metadata: {
        lastExtraction: new Date().toISOString(),
        sourceVersion: '1.0',
        localVersion: '1.0.0'
      }
    };

    const mockOwlContent = `<?xml version="1.0" encoding="utf-8"?>
<rdf:RDF xmlns:owl="http://www.w3.org/2002/07/owl#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#" xmlns:skos="http://www.w3.org/2004/02/skos/core#">
  <owl:Class rdf:about="http://test.org/ontology#Entity">
    <rdfs:label>Entity</rdfs:label>
  </owl:Class>
  
  <owl:ObjectProperty rdf:about="http://test.org/ontology#genericProperty">
    <skos:prefLabel>generic Property</skos:prefLabel>
    <skos:definition>A generic property that doesn't mention specific entities.</skos:definition>
  </owl:ObjectProperty>
</rdf:RDF>`;

    const mockOwlPath = path.join(testOutputDir, 'test3.owl');
    fs.writeFileSync(mockOwlPath, mockOwlContent);
    testConfig.source.url = `file://${mockOwlPath}`;

    const owlSource = new OwlSource({ ontologyKey: 'test', includeExternalImports: false });
    const processor = new OntologyProcessor([owlSource]);
    
    const result = await processor.processOntology(testConfig);

    expect(result.success).toBe(true);
    
    const genericProperty = result.sourceOntology!.relationships.find(r => r.name === 'genericProperty');
    expect(genericProperty).toBeDefined();
    
    // Should fallback to default values
    expect(genericProperty!.source).toBe('Entity');
    expect(genericProperty!.target).toBe('Entity');
  });
}); 