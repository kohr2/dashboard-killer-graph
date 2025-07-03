#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

interface OntologyEntity {
  description?: string;
  parent?: string;
  isProperty?: boolean;
  vectorIndex?: boolean;
  properties?: Record<string, any>;
  keyProperties?: string[];
  enrichment?: {
    service: string;
    properties?: string[];
  };
}

interface OntologyRelationship {
  domain: string | string[];
  range: string | string[];
  description?: string;
}

interface Ontology {
  name: string;
  source?: string;
  dependencies?: string[];
  entities: Record<string, OntologyEntity>;
  relationships?: Record<string, OntologyRelationship>;
  reasoning?: {
    algorithms?: Record<string, any>;
  };
  advancedRelationships?: Record<string, any>;
}

interface ValidationResult {
  ontology: string;
  missingEntities: {
    entity: string;
    referencedIn: string[];
    suggestedAction: 'add' | 'remove' | 'document';
  }[];
  orphanedEntities: {
    entity: string;
    action: 'remove' | 'document';
  }[];
  parentIssues: {
    entity: string;
    parent: string;
    issue: 'missing_parent' | 'circular_reference';
  }[];
}

class OntologyValidator {
  private ontologies: Map<string, Ontology> = new Map();
  private allEntities: Set<string> = new Set();
  private allRelationships: Map<string, Set<string>> = new Map();

  constructor() {
    this.loadAllOntologies();
  }

  private loadAllOntologies(): void {
    const ontologyDirs = ['ontologies', 'config/ontology'];
    
    for (const dir of ontologyDirs) {
      const fullPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullPath)) continue;

      if (dir === 'config/ontology') {
        // Load individual ontology files
        const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.ontology.json'));
        for (const file of files) {
          const ontologyPath = path.join(fullPath, file);
          const ontologyData = fs.readFileSync(ontologyPath, 'utf8');
          const ontology: Ontology = JSON.parse(ontologyData);
          this.ontologies.set(ontology.name, ontology);
          this.collectEntities(ontology);
        }
      } else {
        // Load ontology directories
        const subdirs = fs.readdirSync(fullPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);

        for (const subdir of subdirs) {
          const ontologyPath = path.join(fullPath, subdir, 'ontology.json');
          if (fs.existsSync(ontologyPath)) {
            const ontologyData = fs.readFileSync(ontologyPath, 'utf8');
            const ontology: Ontology = JSON.parse(ontologyData);
            this.ontologies.set(ontology.name, ontology);
            this.collectEntities(ontology);
          }
        }
      }
    }
  }

  private collectEntities(ontology: Ontology): void {
    // Add all entities from this ontology
    for (const entityName of Object.keys(ontology.entities)) {
      this.allEntities.add(entityName);
    }

    // Collect relationship references
    if (ontology.relationships) {
      for (const [relName, rel] of Object.entries(ontology.relationships)) {
        const domains = Array.isArray(rel.domain) ? rel.domain : [rel.domain];
        const ranges = Array.isArray(rel.range) ? rel.range : [rel.range];

        for (const domain of domains) {
          if (!this.allRelationships.has(domain)) {
            this.allRelationships.set(domain, new Set());
          }
          this.allRelationships.get(domain)!.add(relName);
        }

        for (const range of ranges) {
          if (!this.allRelationships.has(range)) {
            this.allRelationships.set(range, new Set());
          }
          this.allRelationships.get(range)!.add(relName);
        }
      }
    }
  }

  public validateAll(): ValidationResult[] {
    const results: ValidationResult[] = [];

    for (const [ontologyName, ontology] of this.ontologies) {
      console.log(`🔍 Validating ontology: ${ontologyName}`);
      results.push(this.validateOntology(ontologyName, ontology));
    }

    return results;
  }

  private validateOntology(ontologyName: string, ontology: Ontology): ValidationResult {
    const result: ValidationResult = {
      ontology: ontologyName,
      missingEntities: [],
      orphanedEntities: [],
      parentIssues: []
    };

    // Check for missing entities in relationships
    if (ontology.relationships) {
      for (const [relName, rel] of Object.entries(ontology.relationships)) {
        const domains = Array.isArray(rel.domain) ? rel.domain : [rel.domain];
        const ranges = Array.isArray(rel.range) ? rel.range : [rel.range];

        for (const domain of domains) {
          if (!this.allEntities.has(domain)) {
            result.missingEntities.push({
              entity: domain,
              referencedIn: [`${relName} (domain)`],
              suggestedAction: this.suggestAction(domain, ontologyName)
            });
          }
        }

        for (const range of ranges) {
          if (!this.allEntities.has(range)) {
            result.missingEntities.push({
              entity: range,
              referencedIn: [`${relName} (range)`],
              suggestedAction: this.suggestAction(range, ontologyName)
            });
          }
        }
      }
    }

    // Check for orphaned entities (not used in any relationships)
    for (const entityName of Object.keys(ontology.entities)) {
      const isUsedInRelationships = this.allRelationships.has(entityName);
      const isUsedInOtherOntologies = this.isEntityUsedInOtherOntologies(entityName, ontologyName);
      const hasSignificantConfiguration = this.hasSignificantConfiguration(entityName, ontology.entities[entityName]);
      
      if (!isUsedInRelationships && !isUsedInOtherOntologies && !hasSignificantConfiguration) {
        result.orphanedEntities.push({
          entity: entityName,
          action: this.suggestOrphanAction(entityName, ontology.entities[entityName])
        });
      }
    }

    // Check parent references
    for (const [entityName, entity] of Object.entries(ontology.entities)) {
      if (entity.parent) {
        if (!this.allEntities.has(entity.parent)) {
          result.parentIssues.push({
            entity: entityName,
            parent: entity.parent,
            issue: 'missing_parent'
          });
        } else if (this.hasCircularReference(entityName, entity.parent, ontologyName)) {
          result.parentIssues.push({
            entity: entityName,
            parent: entity.parent,
            issue: 'circular_reference'
          });
        }
      }
    }

    return result;
  }

  private suggestAction(entityName: string, ontologyName: string): 'add' | 'remove' | 'document' {
    // Check if it's a common entity that should exist
    const commonEntities = ['Thing', 'Organization', 'Person', 'Contact', 'Deal', 'Fund', 'Investor'];
    if (commonEntities.includes(entityName)) {
      return 'add';
    }

    // Check if it's a primitive type
    const primitiveTypes = ['string', 'number', 'boolean', 'date', 'datetime', 'array', 'object'];
    if (primitiveTypes.includes(entityName.toLowerCase())) {
      return 'remove';
    }

    // Check if it's used in multiple ontologies
    const usageCount = this.countEntityUsage(entityName);
    if (usageCount > 1) {
      return 'add';
    }

    return 'document';
  }

  private suggestOrphanAction(entityName: string, entity: OntologyEntity): 'remove' | 'document' {
    // If it's a property entity, it might be intentionally orphaned
    if (entity.isProperty) {
      return 'document';
    }

    // If it has a description, it might be intentionally defined
    if (entity.description && entity.description.length > 10) {
      return 'document';
    }

    // If it has properties, it might be a complex entity worth keeping
    if (entity.properties && Object.keys(entity.properties).length > 0) {
      return 'document';
    }

    // If it has key properties, it's likely an important entity
    if (entity.keyProperties && entity.keyProperties.length > 0) {
      return 'document';
    }

    // If it has vector indexing enabled, it's likely important
    if (entity.vectorIndex) {
      return 'document';
    }

    // If it has enrichment configuration, it's likely important
    if (entity.enrichment) {
      return 'document';
    }

    return 'remove';
  }

  private isEntityUsedInOtherOntologies(entityName: string, currentOntology: string): boolean {
    for (const [ontologyName, ontology] of this.ontologies) {
      if (ontologyName === currentOntology) continue;
      
      if (ontology.relationships) {
        for (const rel of Object.values(ontology.relationships)) {
          const domains = Array.isArray(rel.domain) ? rel.domain : [rel.domain];
          const ranges = Array.isArray(rel.range) ? rel.range : [rel.range];
          
          if (domains.includes(entityName) || ranges.includes(entityName)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private countEntityUsage(entityName: string): number {
    let count = 0;
    for (const ontology of this.ontologies.values()) {
      if (ontology.relationships) {
        for (const rel of Object.values(ontology.relationships)) {
          const domains = Array.isArray(rel.domain) ? rel.domain : [rel.domain];
          const ranges = Array.isArray(rel.range) ? rel.range : [rel.range];
          
          if (domains.includes(entityName) || ranges.includes(entityName)) {
            count++;
          }
        }
      }
    }
    return count;
  }

  private hasCircularReference(entityName: string, parentName: string, ontologyName: string): boolean {
    const visited = new Set<string>();
    return this.checkCircularReference(entityName, parentName, visited, ontologyName);
  }

  private checkCircularReference(entityName: string, parentName: string, visited: Set<string>, ontologyName: string): boolean {
    if (visited.has(parentName)) {
      return parentName === entityName;
    }

    visited.add(parentName);
    const ontology = this.ontologies.get(ontologyName);
    if (!ontology || !ontology.entities[parentName]) {
      return false;
    }

    const parent = ontology.entities[parentName];
    if (parent.parent) {
      return this.checkCircularReference(entityName, parent.parent, visited, ontologyName);
    }

    return false;
  }

  private hasSignificantConfiguration(entityName: string, entity: OntologyEntity): boolean {
    // Check if entity has significant configuration that makes it important
    if (entity.description && entity.description.length > 20) {
      return true;
    }

    if (entity.properties && Object.keys(entity.properties).length > 0) {
      return true;
    }

    if (entity.keyProperties && entity.keyProperties.length > 0) {
      return true;
    }

    if (entity.vectorIndex) {
      return true;
    }

    if (entity.enrichment) {
      return true;
    }

    if (entity.isProperty) {
      return true;
    }

    // Check if it's a parent entity (has children)
    for (const [ontologyName, ontology] of this.ontologies) {
      for (const [childName, childEntity] of Object.entries(ontology.entities)) {
        if (childEntity.parent === entityName) {
          return true;
        }
      }
    }

    return false;
  }

  public generateReport(results: ValidationResult[]): string {
    let report = '# Ontology Entity Validation Report\n\n';
    report += `Generated on: ${new Date().toISOString()}\n\n`;

    let totalIssues = 0;
    let totalMissing = 0;
    let totalOrphaned = 0;
    let totalParentIssues = 0;

    for (const result of results) {
      const issues = result.missingEntities.length + result.orphanedEntities.length + result.parentIssues.length;
      totalIssues += issues;
      totalMissing += result.missingEntities.length;
      totalOrphaned += result.orphanedEntities.length;
      totalParentIssues += result.parentIssues.length;

      report += `## ${result.ontology}\n\n`;
      
      if (issues === 0) {
        report += '✅ No issues found\n\n';
        continue;
      }

      if (result.missingEntities.length > 0) {
        report += '### Missing Entities\n\n';
        for (const missing of result.missingEntities) {
          report += `- **${missing.entity}** (referenced in: ${missing.referencedIn.join(', ')})\n`;
          report += `  - Suggested action: ${missing.suggestedAction}\n`;
          if (missing.suggestedAction === 'add') {
            report += `  - Recommendation: Add entity definition to ontology\n`;
          } else if (missing.suggestedAction === 'remove') {
            report += `  - Recommendation: Remove reference from relationship\n`;
          } else {
            report += `  - Recommendation: Document why this entity is referenced but not defined\n`;
          }
        }
        report += '\n';
      }

      if (result.orphanedEntities.length > 0) {
        report += '### Orphaned Entities\n\n';
        for (const orphaned of result.orphanedEntities) {
          report += `- **${orphaned.entity}**\n`;
          report += `  - Suggested action: ${orphaned.action}\n`;
          if (orphaned.action === 'remove') {
            report += `  - Recommendation: Remove entity if not needed\n`;
          } else {
            report += `  - Recommendation: Add documentation explaining purpose\n`;
          }
        }
        report += '\n';
      }

      if (result.parentIssues.length > 0) {
        report += '### Parent Reference Issues\n\n';
        for (const issue of result.parentIssues) {
          report += `- **${issue.entity}** → **${issue.parent}**\n`;
          if (issue.issue === 'missing_parent') {
            report += `  - Issue: Parent entity does not exist\n`;
            report += `  - Recommendation: Add parent entity or fix reference\n`;
          } else {
            report += `  - Issue: Circular reference detected\n`;
            report += `  - Recommendation: Fix inheritance hierarchy\n`;
          }
        }
        report += '\n';
      }
    }

    report += `## Summary\n\n`;
    report += `- Total ontologies checked: ${results.length}\n`;
    report += `- Total issues found: ${totalIssues}\n`;
    report += `- Missing entities: ${totalMissing}\n`;
    report += `- Orphaned entities: ${totalOrphaned}\n`;
    report += `- Parent reference issues: ${totalParentIssues}\n`;

    return report;
  }

  public applyFixes(results: ValidationResult[]): void {
    console.log('\n🔧 Applying suggested fixes...\n');

    for (const result of results) {
      const ontology = this.ontologies.get(result.ontology);
      if (!ontology) continue;

      let modified = false;

      // Apply missing entity fixes
      for (const missing of result.missingEntities) {
        if (missing.suggestedAction === 'add') {
          console.log(`➕ Adding missing entity: ${missing.entity} to ${result.ontology}`);
          ontology.entities[missing.entity] = {
            description: `Auto-generated entity for ${missing.entity}. Please review and update description.`,
            isProperty: false
          };
          modified = true;
        } else if (missing.suggestedAction === 'remove') {
          console.log(`🗑️ Removing reference to: ${missing.entity} from ${result.ontology}`);
          // Remove relationships that reference this entity
          if (ontology.relationships) {
            const relsToRemove: string[] = [];
            for (const [relName, rel] of Object.entries(ontology.relationships)) {
              const domains = Array.isArray(rel.domain) ? rel.domain : [rel.domain];
              const ranges = Array.isArray(rel.range) ? rel.range : [rel.range];
              
              if (domains.includes(missing.entity) || ranges.includes(missing.entity)) {
                relsToRemove.push(relName);
              }
            }
            
            for (const relName of relsToRemove) {
              delete ontology.relationships[relName];
            }
          }
          modified = true;
        }
      }

      // Apply orphaned entity fixes
      for (const orphaned of result.orphanedEntities) {
        if (orphaned.action === 'remove') {
          console.log(`🗑️ Removing orphaned entity: ${orphaned.entity} from ${result.ontology}`);
          delete ontology.entities[orphaned.entity];
          modified = true;
        } else if (orphaned.action === 'document') {
          console.log(`📝 Adding documentation for orphaned entity: ${orphaned.entity} in ${result.ontology}`);
          if (!ontology.entities[orphaned.entity].description) {
            ontology.entities[orphaned.entity].description = 'Orphaned entity - purpose needs to be documented';
          }
          modified = true;
        }
      }

      // Apply parent reference fixes
      for (const issue of result.parentIssues) {
        if (issue.issue === 'missing_parent') {
          console.log(`➕ Adding missing parent entity: ${issue.parent} to ${result.ontology}`);
          ontology.entities[issue.parent] = {
            description: `Auto-generated parent entity for ${issue.parent}. Please review and update description.`,
            isProperty: false
          };
          modified = true;
        }
      }

      // Save modified ontology
      if (modified) {
        this.saveOntology(result.ontology, ontology);
      }
    }
  }

  private saveOntology(ontologyName: string, ontology: Ontology): void {
    // Determine the correct path to save
    let ontologyPath: string;
    
    // Check if it's in config/ontology
    const configPath = path.join(process.cwd(), 'config', 'ontology', `${ontologyName}.ontology.json`);
    if (fs.existsSync(configPath)) {
      ontologyPath = configPath;
    } else {
      // Check in ontologies directory
      const ontologiesPath = path.join(process.cwd(), 'ontologies', ontologyName.toLowerCase(), 'ontology.json');
      if (fs.existsSync(ontologiesPath)) {
        ontologyPath = ontologiesPath;
      } else {
        console.warn(`⚠️ Could not determine path for ontology: ${ontologyName}`);
        return;
      }
    }

    try {
      fs.writeFileSync(ontologyPath, JSON.stringify(ontology, null, 2));
      console.log(`✅ Saved updated ontology: ${ontologyPath}`);
    } catch (error) {
      console.error(`❌ Failed to save ontology ${ontologyName}:`, error);
    }
  }
}

// Main execution
async function main() {
  console.log('🔍 Starting ontology entity validation...\n');

  const validator = new OntologyValidator();
  const results = validator.validateAll();

  // Generate and save report
  const report = validator.generateReport(results);
  const reportPath = path.join(process.cwd(), 'ONTOLOGY_VALIDATION_REPORT.md');
  fs.writeFileSync(reportPath, report);
  console.log(`📄 Validation report saved to: ${reportPath}`);

  // Print summary to console
  console.log('\n' + report);

  // Ask if user wants to apply fixes
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const totalIssues = results.reduce((sum, r) => 
    sum + r.missingEntities.length + r.orphanedEntities.length + r.parentIssues.length, 0
  );

  if (totalIssues > 0) {
    rl.question('\n❓ Do you want to apply the suggested fixes? (y/N): ', (answer: string) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        validator.applyFixes(results);
        console.log('\n✅ Fixes applied! Please review the changes.');
      } else {
        console.log('\n⏭️ Skipping automatic fixes. Please review the report and apply changes manually.');
      }
      rl.close();
    });
  } else {
    console.log('\n🎉 No issues found! All ontologies are valid.');
    rl.close();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { OntologyValidator, ValidationResult }; 