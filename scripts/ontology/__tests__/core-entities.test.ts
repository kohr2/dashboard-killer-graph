import 'reflect-metadata';
import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';
import { buildOntology } from '../build-ontology';

/**
 * Test to ensure that core entities like Buyer and Organization are not pruned.
 */

describe('buildOntology core entity retention', () => {
  it('keeps Buyer and Organization in FIBO slice', async () => {

    // Build the FIBO ontology
    await buildOntology({ ontologyName: 'fibo', topEntities: 250, topRelationships: 250 });

    // Check the source ontology file for core entities
    const sourceOntologyPath = 'ontologies/fibo/source.ontology.json';
    expect(fs.existsSync(sourceOntologyPath)).toBe(true);
    
    const sourceData = fs.readFileSync(sourceOntologyPath, 'utf8');
    const sourceOntology = JSON.parse(sourceData);
    
    const entityNames = sourceOntology.entities.map((e: any) => e.name);
    
    // Verify core entities are present
    expect(entityNames).toContain('Buyer');
    expect(entityNames).toContain('Organization');

    // Also ensure they are NOT in ignoredEntities
    const ignored = sourceOntology.ignoredEntities || [];
    expect(ignored).not.toContain('Buyer');
    expect(ignored).not.toContain('Organization');
  }, 300000); // 5 minutes timeout
}); 