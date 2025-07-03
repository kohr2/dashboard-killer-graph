import { Entity, Relationship } from './ontology-source';
import { OverrideConfig } from './config';

interface OntologyData {
  entities: Record<string, Entity>;
  relationships: Record<string, Relationship>;
}

export class OntologyMerger {
  async merge(sourceOntology: OntologyData, overrides: OverrideConfig): Promise<OntologyData> {
    const merged = { ...sourceOntology };
    
    // Apply entity overrides
    for (const [entityName, override] of Object.entries(overrides.entities || {})) {
      if (merged.entities[entityName]) {
        merged.entities[entityName] = this.mergeEntity(
          merged.entities[entityName], 
          override as Partial<Entity>
        );
      } else {
        merged.entities[entityName] = override as Entity;
      }
    }
    
    // Apply relationship overrides
    for (const [relName, override] of Object.entries(overrides.relationships || {})) {
      if (merged.relationships[relName]) {
        merged.relationships[relName] = this.mergeRelationship(
          merged.relationships[relName], 
          override as Partial<Relationship>
        );
      } else {
        merged.relationships[relName] = override as Relationship;
      }
    }
    
    return merged;
  }

  private mergeEntity(source: Entity, override: Partial<Entity>): Entity {
    return {
      ...source,
      ...override,
      properties: this.deepMerge(source.properties, override.properties || {}),
      keyProperties: override.keyProperties || source.keyProperties,
      vectorIndex: override.vectorIndex !== undefined ? override.vectorIndex : source.vectorIndex
    };
  }

  private mergeRelationship(source: Relationship, override: Partial<Relationship>): Relationship {
    return {
      ...source,
      ...override
    };
  }

  private deepMerge(source: any, override: any): any {
    if (typeof override !== 'object' || override === null) {
      return override;
    }
    
    if (typeof source !== 'object' || source === null) {
      return override;
    }
    
    const result = { ...source };
    
    for (const [key, value] of Object.entries(override)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.deepMerge(source[key] || {}, value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
} 