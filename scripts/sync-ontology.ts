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