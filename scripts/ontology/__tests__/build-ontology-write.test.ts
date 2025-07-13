import { buildOntology } from '../build-ontology';
import * as fs from 'fs';
import * as path from 'path';

describe('buildOntology', () => {
  const testOutputDir = path.join(__dirname, '../../test-output');

  beforeAll(() => {
    // Create test output directory
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test output directory
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  it('should generate source ontology with entities and relationships', async () => {
    const configPath = path.join(__dirname, '../../../ontologies/procurement/config.json');
    const outputDir = testOutputDir;

    await buildOntology({
      configPath,
      outputDir
    });

    const sourceOntologyPath = path.join(outputDir, 'source.ontology.json');
    expect(fs.existsSync(sourceOntologyPath)).toBe(true);

    const sourceOntology = JSON.parse(fs.readFileSync(sourceOntologyPath, 'utf-8'));
    
    expect(sourceOntology.entities).toBeDefined();
    expect(sourceOntology.relationships).toBeDefined();
    expect(sourceOntology.ignoredEntities).toBeDefined();
    expect(sourceOntology.ignoredRelationships).toBeDefined();
  });

  it('should not prune all relationships - this would indicate a critical problem', async () => {
    const configPath = path.join(__dirname, '../../../ontologies/procurement/config.json');
    const outputDir = testOutputDir;

    await buildOntology({
      configPath,
      outputDir
    });

    const sourceOntologyPath = path.join(outputDir, 'source.ontology.json');
    const sourceOntology = JSON.parse(fs.readFileSync(sourceOntologyPath, 'utf-8'));
    
    // CRITICAL: If all relationships are pruned, this indicates a serious problem
    // with entity extraction or relationship processing
    if (sourceOntology.relationships.length === 0 && sourceOntology.ignoredRelationships.length > 0) {
      console.error('🚨 CRITICAL ERROR: All relationships were pruned!');
      console.error(`Total relationships processed: ${sourceOntology.ignoredRelationships.length}`);
      console.error(`Relationships kept: ${sourceOntology.relationships.length}`);
      console.error(`Entities available: ${sourceOntology.entities.length}`);
      console.error('This indicates a serious problem with entity extraction or relationship processing.');
      
      // Log some sample ignored relationships for debugging
      const sampleIgnored = sourceOntology.ignoredRelationships.slice(0, 10);
      console.error(`Sample ignored relationships: ${sampleIgnored.join(', ')}`);
      
      // This should fail the test
      throw new Error('All relationships were pruned - this indicates a critical problem with the ontology build process');
    }

    // If we have relationships, ensure they reference valid entities
    if (sourceOntology.relationships.length > 0) {
      const entityNames = new Set(sourceOntology.entities.map((e: any) => e.name));
      
      for (const rel of sourceOntology.relationships) {
        expect(entityNames.has(rel.source)).toBe(true);
        expect(entityNames.has(rel.target)).toBe(true);
      }
    }

    // Log statistics for monitoring
    console.log(`📊 Ontology build statistics:`);
    console.log(`  - Entities: ${sourceOntology.entities.length}`);
    console.log(`  - Relationships: ${sourceOntology.relationships.length}`);
    console.log(`  - Ignored entities: ${sourceOntology.ignoredEntities.length}`);
    console.log(`  - Ignored relationships: ${sourceOntology.ignoredRelationships.length}`);
    
    // Warn if more than 50% of relationships are ignored
    const totalRelationships = sourceOntology.relationships.length + sourceOntology.ignoredRelationships.length;
    if (totalRelationships > 0) {
      const ignorePercentage = (sourceOntology.ignoredRelationships.length / totalRelationships) * 100;
      if (ignorePercentage > 50) {
        console.warn(`⚠️  WARNING: ${ignorePercentage.toFixed(1)}% of relationships were ignored`);
      }
    }
  });

  it('should handle procurement ontology with external imports correctly', async () => {
    const configPath = path.join(__dirname, '../../../ontologies/procurement/config.json');
    const outputDir = testOutputDir;

    await buildOntology({
      configPath,
      outputDir,
      includeExternal: true
    });

    const sourceOntologyPath = path.join(outputDir, 'source.ontology.json');
    const sourceOntology = JSON.parse(fs.readFileSync(sourceOntologyPath, 'utf-8'));
    
    // With external imports, we should have more entities and relationships
    expect(sourceOntology.entities.length).toBeGreaterThan(100);
    expect(sourceOntology.relationships.length).toBeGreaterThan(0);
    
    // Verify that relationships reference valid entities
    const entityNames = new Set(sourceOntology.entities.map((e: any) => e.name));
    const invalidRelationships = sourceOntology.relationships.filter((rel: any) => 
      !entityNames.has(rel.source) || !entityNames.has(rel.target)
    );
    
    expect(invalidRelationships).toHaveLength(0);
  });
}); 