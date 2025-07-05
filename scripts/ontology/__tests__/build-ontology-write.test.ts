import 'reflect-metadata';
import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';

/**
 * Failing test – current behaviour writes both source.ontology.json and ontology.json.
 * After refactor we expect ONLY source.ontology.json to be written.
 */

describe('buildOntology file outputs', () => {
  const BUILD_SCRIPT = path.join(process.cwd(), 'scripts', 'ontology', 'build-ontology.ts');

  it('writes only source.ontology.json', async () => {
    // Spy on fs.writeFileSync
    const spy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {} as any);

    // Dynamically import the builder (commonjs require to avoid ts-node ts-path complications)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { buildOntology } = require(BUILD_SCRIPT);

    await buildOntology({ ontologyName: 'procurement', includeExternal: false });

    const calls = spy.mock.calls.map(c => c[0] as string);
    const wroteSource = calls.some(p => p.endsWith('source.ontology.json'));
    const wroteFinal = calls.some(p => p.endsWith('ontology.json') && !p.endsWith('source.ontology.json'));

    expect(wroteSource).toBe(true);
    // Expected to be false after refactor; currently true so test fails (RED)
    expect(wroteFinal).toBe(false);

    spy.mockRestore();
  });
}); 