import { promises as fs } from 'fs';
import path from 'path';
import { compile } from 'handlebars';

/**
 * Ontology Code Generator
 *
 * Reads each `ontology.json` under `ontologies/<domain>/` and generates minimal
 * DTO + Repository stubs into `build/ontologies/<domain>/`.
 *
 * This is **proof-of-concept** scaffolding – refine templates as your domain
 * grows.
 */

const ONTOLOGIES_DIR = path.resolve(__dirname, '../../ontologies');
const BUILD_DIR = path.resolve(__dirname, '../../build/ontologies');
const TEMPLATE_DIR = path.resolve(__dirname, '../../codegen/ontology-templates');

interface EntitySchema {
  name: string;
  properties?: string[];
}

async function loadTemplate(name: string) {
  const templatePath = path.join(TEMPLATE_DIR, `${name}.hbs`);
  const contents = await fs.readFile(templatePath, 'utf-8');
  return compile(contents);
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function generateForDomain(domain: string) {
  const schemaPath = path.join(ONTOLOGIES_DIR, domain, 'ontology.json');
  const exists = await fs
    .stat(schemaPath)
    .then(s => s.isFile())
    .catch(() => false);
  if (!exists) {
    console.warn(`⚠️  No ontology.json found for domain '${domain}', skipping.`);
    return;
  }

  const raw = await fs.readFile(schemaPath, 'utf-8');
  const schema = JSON.parse(raw);
  const entities: EntitySchema[] = schema.entities || [];
  if (!entities.length) {
    console.warn(`⚠️  No entities declared in ${schemaPath}`);
    return;
  }

  const dtoTemplate = await loadTemplate('dto');
  const repoTemplate = await loadTemplate('repository');

  for (const entity of entities) {
    const outDir = path.join(BUILD_DIR, domain, 'generated');
    await ensureDir(outDir);

    // DTO file
    const dtoFile = path.join(outDir, `${entity.name}DTO.ts`);
    await fs.writeFile(dtoFile, dtoTemplate(entity));

    // Repository interface
    const repoFile = path.join(outDir, `I${entity.name}Repository.ts`);
    await fs.writeFile(repoFile, repoTemplate(entity));
  }

  console.log(`✅ Generated ${entities.length} entities for domain ${domain}.`);
}

async function main() {
  const domains = await fs.readdir(ONTOLOGIES_DIR);
  for (const d of domains) {
    const domainPath = path.join(ONTOLOGIES_DIR, d);
    const stat = await fs.stat(domainPath);
    if (stat.isDirectory()) {
      await generateForDomain(d);
    }
  }
}

if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
} 