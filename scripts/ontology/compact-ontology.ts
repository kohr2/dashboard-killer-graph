import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface OntologyEntity {
  name: string;
  description?: string;
  properties?: string[];
}

interface OntologyRelationship {
  source: string;
  target: string;
  type: string;
  description?: string;
}

interface Ontology {
  entities: OntologyEntity[];
  relationships: OntologyRelationship[];
}

interface CompactOntology {
  e: string[];
  r: [string, string, string][];
}

/**
 * Compacts an ontology by removing generic entities and relationships,
 * using short keys, and formatting relationships as tuples.
 */
export function compactOntology(ontology: Ontology): CompactOntology {
  // Filter out generic entities
  const genericEntities = ['Thing', 'Entity', 'UnrecognizedEntity'];
  const compactEntities = ontology.entities
    .map(entity => entity.name)
    .filter(name => !genericEntities.includes(name));

  // Filter out generic relationships and format as tuples
  const compactRelationships: [string, string, string][] = ontology.relationships
    .filter(rel => {
      // Skip relationships with null or empty type
      if (!rel.type || rel.type === 'null' || rel.type === '') {
        return false;
      }
      
      // Skip generic relationships
      const genericEntities = ['Thing', 'Entity', 'UnrecognizedEntity'];
      if (genericEntities.includes(rel.source) || genericEntities.includes(rel.target)) {
        return false;
      }
      
      // Skip Entity->Entity patterns
      if (rel.source === 'Entity' && rel.target === 'Entity') {
        return false;
      }
      
      // Skip very generic relationship types
      const genericTypes = ['hasProperty', 'hasAttribute', 'hasValue', 'hasType', 'hasName', 'hasId'];
      if (genericTypes.includes(rel.type)) {
        return false;
      }
      
      // Skip relationships where source and target are the same (self-referential)
      if (rel.source === rel.target) {
        return false;
      }
      
      return true;
    })
    .map(rel => [rel.source, rel.type, rel.target] as [string, string, string]);

  return {
    e: compactEntities,
    r: compactRelationships
  };
}

/**
 * Loads an ontology from a JSON file and compacts it.
 */
export function compactOntologyFromFile(inputPath: string): CompactOntology {
  const ontologyData = JSON.parse(readFileSync(inputPath, 'utf-8'));
  return compactOntology(ontologyData);
}

/**
 * Saves a compact ontology to a JSON file.
 */
export function saveCompactOntology(compactOntology: CompactOntology, outputPath: string, minify: boolean = true): void {
  const jsonString = minify 
    ? JSON.stringify(compactOntology)
    : JSON.stringify(compactOntology, null, 2);
  
  writeFileSync(outputPath, jsonString, 'utf-8');
}

// --------------- CLI runner ---------------
if (require.main === module) {
  const argv = process.argv.slice(2);
  const getFlag = (name: string): string | undefined => {
    const raw = argv.find((f) => f.startsWith(`--${name}=`));
    return raw ? raw.split('=')[1] : undefined;
  };

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`compact-ontology.ts
      --input=<path>          Input ontology JSON file
      --output=<path>         Output compact ontology JSON file (default: ontology.compact.json)
      --pretty                Output pretty-printed JSON (default: minified)
      --stats                 Show size reduction statistics`);
    process.exit(0);
  }

  const inputPath = getFlag('input');
  const outputPath = getFlag('output') || 'ontology.compact.json';
  const pretty = argv.includes('--pretty');
  const stats = argv.includes('--stats');

  if (!inputPath) {
    console.error('❌ Missing --input=<path> flag');
    process.exit(1);
  }

  try {
    // Load and compact ontology
    const compact = compactOntologyFromFile(inputPath);
    
    // Save compact ontology
    saveCompactOntology(compact, outputPath, !pretty);
    
    console.log(`✅ Compact ontology generated successfully!`);
    console.log(`📄 Output file: ${outputPath}`);
    console.log(`📊 Entities: ${compact.e.length}`);
    console.log(`🔗 Relationships: ${compact.r.length}`);
    
    if (stats) {
      const originalSize = readFileSync(inputPath, 'utf-8').length;
      const compactSize = JSON.stringify(compact).length;
      const reduction = ((originalSize - compactSize) / originalSize * 100).toFixed(1);
      
      console.log(`📈 Size reduction: ${reduction}% (${originalSize} → ${compactSize} chars)`);
    }
    
  } catch (err) {
    console.error(`❌ Error: ${(err as Error).message}`);
    process.exit(1);
  }
} 