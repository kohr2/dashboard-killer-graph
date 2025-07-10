#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

// Spanish to English translation mapping for ISCO Major Groups
const ISCO_MAJOR_GROUPS_TRANSLATION: Record<string, string> = {
  'Directores y gerentes': 'Managers',
  'Profesionales científicos e intelectuales': 'Professionals',
  'Técnicos y profesionales de nivel medio': 'Technicians and associate professionals',
  'Personal de apoyo administrativo': 'Clerical support workers',
  'Trabajadores de los servicios y vendedores de comercios y mercados': 'Service and sales workers',
  'Agricultores y trabajadores calificados agropecuarios, forestales y pesqueros': 'Skilled agricultural, forestry and fishery workers',
  'Oficiales, operarios y artesanos de artes mecánicas y de otros oficios': 'Craft and related trades workers',
  'Operadores de instalaciones y máquinas y ensambladores': 'Plant and machine operators, and assemblers',
  'Ocupaciones elementales': 'Elementary occupations',
  'Ocupaciones militares': 'Armed forces occupations'
};

// Spanish to English translation mapping for ISCO Major Groups (detailed descriptions)
const ISCO_MAJOR_GROUPS_DESCRIPTION_TRANSLATION: Record<string, string> = {
  'Directores y gerentes': 'Managers plan, direct, coordinate and evaluate the overall activities of enterprises, governments and other organizations, or of organizational units within them, and formulate and review their policies, laws, rules and regulations.',
  'Profesionales científicos e intelectuales': 'Professionals increase the existing stock of knowledge, apply scientific or artistic concepts and theories, teach about the foregoing in a systematic manner, or engage in any combination of these activities.',
  'Técnicos y profesionales de nivel medio': 'Technicians and associate professionals perform technical and related tasks connected with research and the application of scientific or artistic concepts and operational methods, and government and business regulations.',
  'Personal de apoyo administrativo': 'Clerical support workers record, organize, store, compute and retrieve information related to transactions, and provide information to members of the public, clients and customers.',
  'Trabajadores de los servicios y vendedores de comercios y mercados': 'Service and sales workers provide personal and protective services related to travel, housekeeping, catering, waiting, personal care, or selling, demonstrate and promoting sales of goods in wholesale or retail shops and similar establishments, or market stalls and door-to-door.',
  'Agricultores y trabajadores calificados agropecuarios, forestales y pesqueros': 'Skilled agricultural, forestry and fishery workers grow and harvest field or tree and shrub crops, vegetables, fruits, nuts, fungi, honey and other bee products; breed, tend, feed or hunt animals; produce a variety of animal husbandry products; cultivate, conserve and exploit forests; breed or catch fish; and cultivate or gather other forms of aquatic life in order to provide food, shelter, income, and employment for themselves and their households.',
  'Oficiales, operarios y artesanos de artes mecánicas y de otros oficios': 'Craft and related trades workers apply specific knowledge and skills to construct and maintain buildings; form metal; erect metal structures; set up and operate machine tools; make, fit, maintain and repair machinery, equipment or tools; carry out printing work; and produce or process foodstuffs, textiles, wooden, metal and other articles including handicrafts.',
  'Operadores de instalaciones y máquinas y ensambladores': 'Plant and machine operators and assemblers monitor and operate industrial and agricultural machinery and equipment on the spot or by remote control; drive and operate trains, motor vehicles and mobile machinery and equipment; or assemble products from component parts according to strict specifications and procedures.',
  'Ocupaciones elementales': 'Elementary occupations involve the performance of simple and routine tasks which may require the use of hand-held tools and in some cases considerable physical effort.',
  'Ocupaciones militares': 'Armed forces occupations involve the application of military tactics, strategy and logistics, and the operation of weapons, equipment and machinery in air, sea and land operations and for the defence and security of the state.'
};

interface ISCOEntity {
  id: string;
  type: string;
  properties: Record<string, any>;
}

interface ISCORelationship {
  id: string;
  type: string;
  source: string;
  target: string;
  properties?: Record<string, any>;
}

interface GenericDataset {
  metadata: {
    source: string;
    ontology: string;
    version: string;
    createdAt: string;
    recordCount: number;
  };
  records: Array<{
    id: string;
    type: string;
    content: string;
    properties: Record<string, any>;
    relationships?: Array<{
      type: string;
      target: string;
    }>;
  }>;
}

function translateISCOData(): void {
  const dataDir = path.join(__dirname, '../data');
  
  // Load original Spanish data
  const entitiesPath = path.join(dataDir, 'isco-entities.json');
  const relationshipsPath = path.join(dataDir, 'isco-relationships.json');
  const genericDatasetPath = path.join(dataDir, 'generic-dataset.json');
  
  if (!fs.existsSync(entitiesPath)) {
    console.error('Original ISCO entities file not found. Please run the transformation script first.');
    return;
  }
  
  console.log('🔄 Translating ISCO data from Spanish to English...');
  
  // Load and translate entities
  const entitiesData = JSON.parse(fs.readFileSync(entitiesPath, 'utf-8'));
  const translatedEntities: Record<string, Record<string, any>> = {};
  
  for (const [entityType, entityGroup] of Object.entries(entitiesData)) {
    translatedEntities[entityType] = {};
    
    if (typeof entityGroup === 'object' && entityGroup !== null) {
      for (const [entityId, entityProps] of Object.entries(entityGroup as Record<string, any>)) {
        const translatedProps = { ...entityProps };
        
        // Translate name if it exists
        if (entityProps.name && ISCO_MAJOR_GROUPS_TRANSLATION[entityProps.name]) {
          translatedProps.name = ISCO_MAJOR_GROUPS_TRANSLATION[entityProps.name];
        }
        
        // Translate description if it exists
        if (entityProps.description && ISCO_MAJOR_GROUPS_DESCRIPTION_TRANSLATION[entityProps.description]) {
          translatedProps.description = ISCO_MAJOR_GROUPS_DESCRIPTION_TRANSLATION[entityProps.description];
        } else if (entityProps.name && ISCO_MAJOR_GROUPS_DESCRIPTION_TRANSLATION[entityProps.name]) {
          // Use the name-based description if available
          translatedProps.description = ISCO_MAJOR_GROUPS_DESCRIPTION_TRANSLATION[entityProps.name];
        }
        
        translatedEntities[entityType][entityId] = translatedProps;
      }
    }
  }
  
  // Save translated entities
  const translatedEntitiesPath = path.join(dataDir, 'isco-entities-english.json');
  fs.writeFileSync(translatedEntitiesPath, JSON.stringify(translatedEntities, null, 2));
  console.log(`✅ Translated entities saved to: ${translatedEntitiesPath}`);
  
  // Load and translate relationships (relationships don't need translation, just copy)
  const relationshipsData = JSON.parse(fs.readFileSync(relationshipsPath, 'utf-8'));
  const translatedRelationshipsPath = path.join(dataDir, 'isco-relationships-english.json');
  fs.writeFileSync(translatedRelationshipsPath, JSON.stringify(relationshipsData, null, 2));
  console.log(`✅ Relationships copied to: ${translatedRelationshipsPath}`);
  
  // Create translated generic dataset
  const genericDataset: GenericDataset = JSON.parse(fs.readFileSync(genericDatasetPath, 'utf-8'));
  
  // Flatten entities from the nested structure
  const entities: ISCOEntity[] = [];
  for (const [entityType, entityGroup] of Object.entries(translatedEntities)) {
    if (typeof entityGroup === 'object' && entityGroup !== null) {
      for (const [entityId, entityProps] of Object.entries(entityGroup as Record<string, any>)) {
        entities.push({
          id: entityId,
          type: entityType,
          properties: entityProps
        });
      }
    }
  }
  
  // Flatten relationships from the nested structure
  const allRelationships: ISCORelationship[] = [];
  for (const [relType, rels] of Object.entries(relationshipsData)) {
    if (Array.isArray(rels)) {
      for (const rel of rels as any[]) {
        allRelationships.push({
          id: `${rel.source}_${rel.target}_${relType}`,
          type: relType,
          source: rel.source,
          target: rel.target,
          properties: { relationshipType: rel.type }
        });
      }
    }
  }
  
  // Create a map of relationships by source
  const relationshipsBySource = new Map<string, ISCORelationship[]>();
  for (const rel of allRelationships) {
    if (!relationshipsBySource.has(rel.source)) {
      relationshipsBySource.set(rel.source, []);
    }
    relationshipsBySource.get(rel.source)!.push(rel);
  }
  
  // Convert entities to generic dataset records
  const records = entities.map(entity => {
    const entityRelationships = relationshipsBySource.get(entity.id) || [];
    
    return {
      id: entity.id,
      type: entity.type,
      content: `${entity.type}: ${entity.properties.name || entity.properties.code || entity.id}`,
      properties: entity.properties,
      relationships: entityRelationships.map(rel => ({
        type: rel.type,
        target: rel.target
      }))
    };
  });
  
  // Create translated generic dataset
  const translatedDataset: GenericDataset = {
    metadata: {
      source: 'ISCO Classification System (English)',
      ontology: 'isco',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      recordCount: records.length
    },
    records
  };
  
  // Save translated generic dataset
  const translatedGenericDatasetPath = path.join(dataDir, 'generic-dataset-english.json');
  fs.writeFileSync(translatedGenericDatasetPath, JSON.stringify(translatedDataset, null, 2));
  console.log(`✅ Translated generic dataset saved to: ${translatedGenericDatasetPath}`);
  
  console.log('\n📊 Translation Summary:');
  console.log(`  - Entities translated: ${entities.length}`);
  console.log(`  - Relationships preserved: ${allRelationships.length}`);
  console.log(`  - Major groups translated: ${Object.keys(ISCO_MAJOR_GROUPS_TRANSLATION).length}`);
  
  console.log('\n🌍 Sample translations:');
  Object.entries(ISCO_MAJOR_GROUPS_TRANSLATION).slice(0, 3).forEach(([spanish, english]) => {
    console.log(`  "${spanish}" → "${english}"`);
  });
  
  console.log('\n✅ ISCO translation to English completed!');
}

if (require.main === module) {
  translateISCOData();
} 