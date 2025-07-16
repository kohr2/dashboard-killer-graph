import { OntologyProcessor } from '../cli';
import { OwlSource } from '../sources/owl-source';
import { Config } from '../config';
import * as fs from 'fs';
import * as path from 'path';

describe('Procurement ontology relationships analysis', () => {
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

  it('should have no relationships between non-external entities when built without external imports', async () => {
    // Load procurement config
    const configPath = path.join(__dirname, '../../../ontologies/procurement/config.json');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config: Config = JSON.parse(configContent);

    // Add required metadata field
    config.metadata = config.metadata || {};
    config.metadata.lastExtraction = new Date().toISOString();

    // Initialize processor without external imports
    const owlSource = new OwlSource({ ontologyKey: 'procurement', includeExternalImports: false });
    const processor = new OntologyProcessor([owlSource]);
    
    // Process ontology
    const result = await processor.processOntology(config);

    if (!result.success) {
      console.error('Processing failed:', result.error);
    }

    expect(result.success).toBe(true);
    expect(result.sourceOntology).toBeDefined();
    expect(result.sourceOntology!.relationships).toHaveLength(0);
    expect(result.sourceOntology!.entities.length).toBeGreaterThan(0);
    
    console.log(`Entities kept: ${result.sourceOntology!.entities.length}`);
    console.log(`Relationships kept: ${result.sourceOntology!.relationships.length}`);
    
    // This confirms that there are no relationships between procurement-native entities
    expect(result.sourceOntology!.relationships).toEqual([]);
  });

  it('should have relationships when built with external imports', async () => {
    // Load procurement config
    const configPath = path.join(__dirname, '../../../ontologies/procurement/config.json');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config: Config = JSON.parse(configContent);

    // Add required metadata field
    config.metadata = config.metadata || {};
    config.metadata.lastExtraction = new Date().toISOString();

    // Initialize processor with external imports
    const owlSource = new OwlSource({ ontologyKey: 'procurement', includeExternalImports: true });
    const processor = new OntologyProcessor([owlSource]);
    
    // Process ontology
    const result = await processor.processOntology(config);

    if (!result.success) {
      console.error('Processing failed:', result.error);
    }

    expect(result.success).toBe(true);
    expect(result.sourceOntology).toBeDefined();
    expect(result.sourceOntology!.relationships.length).toBeGreaterThan(0);
    expect(result.sourceOntology!.entities.length).toBeGreaterThan(0);
    
    console.log(`Entities kept (with external): ${result.sourceOntology!.entities.length}`);
    console.log(`Relationships kept (with external): ${result.sourceOntology!.relationships.length}`);
    
    // Verify that relationships exist when external entities are included
    expect(result.sourceOntology!.relationships.length).toBeGreaterThan(0);
  });

  it('should identify which entity types are missing for relationships', async () => {
    // Load procurement config
    const configPath = path.join(__dirname, '../../../ontologies/procurement/config.json');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config: Config = JSON.parse(configContent);

    // Add required metadata field
    config.metadata = config.metadata || {};
    config.metadata.lastExtraction = new Date().toISOString();

    // Process without external imports
    const owlSourceWithoutExternal = new OwlSource({ ontologyKey: 'procurement', includeExternalImports: false });
    const processorWithoutExternal = new OntologyProcessor([owlSourceWithoutExternal]);
    const resultWithoutExternal = await processorWithoutExternal.processOntology(config);

    if (!resultWithoutExternal.success) {
      console.error('Processing without external failed:', resultWithoutExternal.error);
    }

    // Process with external imports
    const owlSourceWithExternal = new OwlSource({ ontologyKey: 'procurement', includeExternalImports: true });
    const processorWithExternal = new OntologyProcessor([owlSourceWithExternal]);
    const resultWithExternal = await processorWithExternal.processOntology(config);

    if (!resultWithExternal.success) {
      console.error('Processing with external failed:', resultWithExternal.error);
    }

    expect(resultWithoutExternal.success).toBe(true);
    expect(resultWithExternal.success).toBe(true);

    const entitiesWithoutExternal = new Set(
      resultWithoutExternal.sourceOntology!.entities.map(e => e.name)
    );
    
    const missingEntities = new Set<string>();
    
    // Check which entities are referenced in relationships but not present without external imports
    resultWithExternal.sourceOntology!.relationships.forEach(rel => {
      if (!entitiesWithoutExternal.has(rel.source)) {
        missingEntities.add(rel.source);
      }
      if (!entitiesWithoutExternal.has(rel.target)) {
        missingEntities.add(rel.target);
      }
    });

    console.log('Missing entities (external entities needed for relationships):');
    console.log(Array.from(missingEntities).sort());
    
    // This test documents which external entities are needed for relationships
    expect(missingEntities.size).toBeGreaterThan(0);
  });
}); 