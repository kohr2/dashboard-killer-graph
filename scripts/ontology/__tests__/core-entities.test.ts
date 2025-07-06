import 'reflect-metadata';
import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';

/**
 * Failing test – ensure that core entities like Buyer and Organization are not pruned.
 */

describe('buildOntology core entity retention', () => {
  const BUILD_SCRIPT = path.join(process.cwd(), 'scripts', 'ontology', 'build-ontology.ts');

  it('keeps Buyer and Organization in FIBO slice', async () => {
    // Spy on fs.writeFileSync to capture source.ontology.json output
    const spy = jest.spyOn(fs, 'writeFileSync').mockImplementation((filePath, data) => {
      // If it's the source ontology, capture contents
      if (typeof filePath === 'string' && filePath.endsWith('source.ontology.json')) {
        // Save to variable for assertion later
        capturedPath = filePath;
        capturedData = data.toString();
      }
      return undefined as any;
    });

    let capturedPath = '';
    let capturedData = '';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { buildOntology } = require(BUILD_SCRIPT);

    await buildOntology({ ontologyName: 'fibo', topEntities: 250, topRelationships: 250 });

    // Parse captured ontology JSON
    expect(capturedData).not.toEqual('');
    const ontology = JSON.parse(capturedData);

    const entityNames = ontology.entities.map((e: any) => e.name);
    expect(entityNames).toContain('Buyer');
    expect(entityNames).toContain('Organization');

    // Also ensure they are NOT in ignoredEntities
    const ignored = ontology.ignoredEntities || [];
    expect(ignored).not.toContain('Buyer');
    expect(ignored).not.toContain('Organization');

    spy.mockRestore();
  }, 180000);
}); 