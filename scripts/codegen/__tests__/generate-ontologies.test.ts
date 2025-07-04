import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Smoke-test the ontology code-generation CLI.
// Ensures that running `npm run ontologies:generate <name>` creates
//   ontologies/<name>/source.ontology.json when it doesn't already exist.
// The underlying implementation lives in `scripts/codegen/generate-ontologies.ts`.

describe('Ontology codegen service', () => {
  const testOntologyDir = path.join(process.cwd(), 'ontologies', 'testont');
  const sourcePath = path.join(testOntologyDir, 'source.ontology.json');

  beforeAll(() => {
    fs.mkdirSync(testOntologyDir, { recursive: true });
    if (fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);
  });

  afterAll(() => {
    if (fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);
    try { fs.rmdirSync(testOntologyDir); } catch {}
  });

  it('creates source.ontology.json if missing', () => {
    expect(fs.existsSync(sourcePath)).toBe(false);
    try {
      execSync('npm run ontologies:generate testont', { stdio: 'ignore' });
    } catch { /* CLI exits non-zero when ontology already exists – ignore */ }
    expect(fs.existsSync(sourcePath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    expect(content).toHaveProperty('name', 'testont');
    expect(content).toHaveProperty('entities');
    expect(content).toHaveProperty('relationships');
    expect(content).toHaveProperty('metadata');
  });
}); 