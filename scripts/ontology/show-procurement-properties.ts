#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

interface Entity {
  name: string;
  description: any;
  properties: Record<string, any>;
  documentation: string;
}

interface SourceOntology {
  name: string;
  entities: Entity[];
  relationships: any[];
}

function showProcurementProperties() {
  try {
    console.log('📋 Procurement Ontology - Rich Property Information\n');
    
    // Load the source ontology
    const sourcePath = path.join(__dirname, '../../ontologies/procurement/source.ontology.json');
    const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
    const sourceOntology: SourceOntology = JSON.parse(sourceContent);
    
    console.log(`📊 Total Entities: ${sourceOntology.entities.length}`);
    console.log(`🔗 Total Relationships: ${sourceOntology.relationships.length}\n`);
    
    // Show sample entities with rich properties
    const sampleEntities = sourceOntology.entities.slice(0, 10);
    
    sampleEntities.forEach((entity, index) => {
      console.log(`${index + 1}. 🏷️  ${entity.name}`);
      
      // Extract description text
      const description = typeof entity.description === 'string' 
        ? entity.description 
        : entity.description?._ || 'No description available';
      
      console.log(`   📝 Description: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`);
      
      // Show properties
      if (Object.keys(entity.properties).length > 0) {
        console.log(`   🔧 Properties:`);
        Object.entries(entity.properties).forEach(([propName, propDef]) => {
          console.log(`      - ${propName}: ${propDef.description}`);
        });
      }
      
      // Show documentation link
      console.log(`   📚 Documentation: ${entity.documentation}`);
      console.log('');
    });
    
    // Show property statistics
    const propertyStats = new Map<string, number>();
    sourceOntology.entities.forEach(entity => {
      Object.keys(entity.properties).forEach(prop => {
        propertyStats.set(prop, (propertyStats.get(prop) || 0) + 1);
      });
    });
    
    console.log('📈 Property Statistics:');
    Array.from(propertyStats.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([prop, count]) => {
        console.log(`   - ${prop}: ${count} entities`);
      });
    
    console.log('\n🎉 Rich property extraction completed successfully!');
    
  } catch (error) {
    console.error('❌ Error showing procurement properties:', error);
  }
}

// Run if called directly
if (require.main === module) {
  showProcurementProperties();
}

export { showProcurementProperties }; 