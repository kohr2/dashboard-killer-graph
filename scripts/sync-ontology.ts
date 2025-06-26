import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import { ontologyService } from '../src/platform/ontology/ontology.service';
import { StructuredOntology } from '../src/platform/ontology/ontology.service';

console.log('Starting structured ontology synchronization task...');

function toKebabCase(str: string): string {
    return str.replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
              .replace(/([a-z\d])([A-Z])/g, '$1-$2')
              .toLowerCase();
}

const ontologySources = ontologyService.getStructuredOntologySources();
const projectRoot = process.cwd();
const templatesDir = path.join(projectRoot, 'scripts/templates');

console.log(`Found ${ontologySources.length} structured ontology files.`);

handlebars.registerHelper('kebabCase', toKebabCase);
handlebars.registerHelper('eq', (a, b) => a === b);

const entityTemplate = handlebars.compile(fs.readFileSync(path.join(templatesDir, 'entity.hbs'), 'utf-8'));
const repoInterfaceTemplate = handlebars.compile(fs.readFileSync(path.join(templatesDir, 'repository.interface.hbs'), 'utf-8'));

for (const source of ontologySources) {
    const { sourcePath, ontology } = source;
    const outputBasePath = path.dirname(sourcePath);
    
    const entitiesPath = path.join(outputBasePath, 'domain', 'entities');
    const reposPath = path.join(outputBasePath, 'domain', 'repositories');

    // --- Cleanup Phase ---
    console.log(`Cleaning up target directories for ${path.basename(outputBasePath)}...`);
    [entitiesPath, reposPath].forEach(dirPath => {
        if (fs.existsSync(dirPath)) {
            fs.readdirSync(dirPath).forEach(file => {
                if (file.endsWith('.ts')) {
                    fs.unlinkSync(path.join(dirPath, file));
                }
            });
            console.log(`   ✓ Cleaned ${dirPath}`);
        }
    });
    // --- End Cleanup Phase ---
    
    fs.mkdirSync(entitiesPath, { recursive: true });
    fs.mkdirSync(reposPath, { recursive: true });

    const allEntityNames = Object.keys(ontology.entities);

    for (const entityName of allEntityNames) {
        console.log(`-> Processing entity: ${entityName}`);
        
        // Handle enum-like entities
        if (ontology.entities[entityName].values) {
            console.log(`   - Skipping enum-like entity ${entityName} for now.`);
            continue;
        }

        const properties = [];
        const imports = new Set<string>();

        // Find relationships where this entity is the domain
        for (const relName in ontology.relationships) {
            const relationship = ontology.relationships[relName];
            if (relationship.domain === entityName) {
                const propName = relName.toLowerCase();
                let propType = '';
                
                if (Array.isArray(relationship.range)) {
                    propType = `(${relationship.range.join(' | ')})[]`;
                    relationship.range.forEach(r => allEntityNames.includes(r) && imports.add(r));
                } else {
                    propType = allEntityNames.includes(relationship.range) ? `${relationship.range}[]` : `${relationship.range}[]`;
                    if (allEntityNames.includes(relationship.range)) imports.add(relationship.range);
                }

                properties.push({ name: propName, type: propType });
            }
        }
        
        const fileName = toKebabCase(entityName);
        const entityFilePath = path.join(entitiesPath, `${fileName}.ts`);
        const repoFilePath = path.join(reposPath, `i-${fileName}-repository.ts`);

        const templateData = { name: entityName, fileName, properties, imports: Array.from(imports) };
        
        const entityCode = entityTemplate(templateData);
        if (!fs.existsSync(entityFilePath)) {
            fs.writeFileSync(entityFilePath, entityCode);
            console.log(`   ✓ Created entity: ${entityFilePath}`);
        } else {
            console.log(`   - Skipped existing entity: ${entityFilePath}`);
        }

        const repoCode = repoInterfaceTemplate({ name: entityName, fileName });
        if (!fs.existsSync(repoFilePath)) {
            fs.writeFileSync(repoFilePath, repoCode);
            console.log(`   ✓ Created repository interface: ${repoFilePath}`);
        } else {
            console.log(`   - Skipped existing repository: ${repoFilePath}`);
        }
    }
}

console.log('Ontology synchronization task finished.');

// --- Configuration ---
const ONTOLOGY_SOURCE_PATH = path.join(projectRoot, 'config/ontology/core.ontology.json');
const ONTOLOGY_OUTPUT_PATH = path.join(projectRoot, 'src/ontologies/crm/domain/ontology/o-cream-v2.ts');
const EXTENSION_ONTOLOGY_PATH = path.join(projectRoot, 'src/ontologies/financial/ontology.json');
const ENTITY_TEMPLATE_PATH = path.join(projectRoot, 'scripts/templates/entity.hbs');
const REPO_INTERFACE_TEMPLATE_PATH = path.join(projectRoot, 'scripts/templates/repository.interface.hbs');
// --- End Configuration ---

console.log('Starting ontology synchronization task...');

function toPascalCase(str: string): string {
    return str.replace(/(?:^|[-_])(\w)/g, (_, c) => c.toUpperCase());
}

function generateEnum(name: string, values: string[]): string {
  let content = `export enum ${name} {\n`;
  for (const value of values) {
    // Make the key an exact match of the value for compatibility with tests
    const key = value.replace(/-/g, '_').toUpperCase();
    content += `  ${key} = '${value}',\n`;
  }
  content += '}\n';
  return content;
}

try {
  const ontologyJson = fs.readFileSync(ONTOLOGY_SOURCE_PATH, 'utf-8');
  const ontology = JSON.parse(ontologyJson);

  let outputContent = `// This file is auto-generated by scripts/sync-ontology.ts. Do not edit manually.\n`;
  outputContent += `// Based on DOLCE foundational ontology\n\n`;
  
  for (const enumName in ontology) {
    if (Array.isArray(ontology[enumName])) {
        outputContent += generateEnum(enumName, ontology[enumName]);
        outputContent += '\n';
    }
  }
  
  // Keep the manually crafted interfaces and classes from the original file
  const manualContent = fs.readFileSync(ONTOLOGY_OUTPUT_PATH, 'utf-8');
  const manualPartIndex = manualContent.indexOf('export interface DOLCEEntity');
  if (manualPartIndex !== -1) {
    const manualPart = manualContent.substring(manualPartIndex);
    outputContent += manualPart;
  } else {
    console.warn("Could not find 'export interface DOLCEEntity' in the target file. Manual parts will not be appended.");
  }


  fs.writeFileSync(ONTOLOGY_OUTPUT_PATH, outputContent);
  console.log(`✅ Ontology enums successfully synchronized to ${ONTOLOGY_OUTPUT_PATH}`);

} catch (error) {
  console.error('❌ Failed to synchronize ontology:', error);
  process.exit(1);
}

console.log('Ontology synchronization task finished.');

function getOutputBasePath(sourcePath: string): string {
    const dir = path.dirname(sourcePath);
    return path.join(dir, '..');
}

class OntologySynchronizer {
    // ... existing code ...
} 