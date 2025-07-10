#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

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

function createGenericDataset(): void {
  const dataDir = path.join(__dirname, '../data');
  
  // Load ISCO entities
  const entitiesPath = path.join(dataDir, 'isco-entities.json');
  const entitiesData = JSON.parse(fs.readFileSync(entitiesPath, 'utf-8'));
  
  // Flatten entities from the nested structure
  const entities: ISCOEntity[] = [];
  for (const [entityType, entityGroup] of Object.entries(entitiesData)) {
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
  
  // Load ISCO relationships
  const relationshipsPath = path.join(dataDir, 'isco-relationships.json');
  const relationshipsData = JSON.parse(fs.readFileSync(relationshipsPath, 'utf-8'));
  
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
  
  // Create generic dataset
  const dataset: GenericDataset = {
    metadata: {
      source: 'ISCO Classification System',
      ontology: 'isco',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      recordCount: records.length
    },
    records
  };
  
  // Save generic dataset
  const outputPath = path.join(dataDir, 'generic-dataset.json');
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));
  
  console.log(`Created generic dataset with ${records.length} records`);
  console.log(`Saved to: ${outputPath}`);
}

if (require.main === module) {
  createGenericDataset();
} 