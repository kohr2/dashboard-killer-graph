import { OntologySource, ParsedOntology, Entity, Relationship } from '../ontology-source';
import { ExtractionRule } from '../config';
import * as fs from 'fs';
import * as path from 'path';
import jsonpath from 'jsonpath';

export class JsonSource implements OntologySource {
  name = 'JSON Source';
  private readonly cache: Map<string, string> = new Map();

  canHandle(url: string): boolean {
    return url.includes('json') || url.endsWith('.json') || url.includes('api') || url.includes('dataset');
  }

  async fetch(url: string): Promise<string> {
    // Check if URL is local file
    if (url.startsWith('file://') || url.startsWith('./') || url.startsWith('/')) {
      return fs.readFileSync(url.replace('file://', ''), 'utf-8');
    }

    // For online URLs, check cache first
    const cachePath = this.getCachePath(url);
    
    if (fs.existsSync(cachePath)) {
      console.log(`📁 Using cached dataset: ${cachePath}`);
      return fs.readFileSync(cachePath, 'utf-8');
    }

    // Download and cache the file
    console.log(`🌐 Downloading dataset: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    
    const content = await response.text();
    
    // Ensure cache directory exists
    const cacheDir = path.dirname(cachePath);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    // Save to cache
    fs.writeFileSync(cachePath, content);
    console.log(`💾 Cached dataset to: ${cachePath}`);
    
    return content;
  }

  async parse(content: string): Promise<ParsedOntology> {
    try {
      const data = JSON.parse(content);
      return {
        entities: [],
        relationships: [],
        rawData: data
      };
    } catch (error) {
      throw new Error(`Failed to parse JSON content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async extractEntities(config: ExtractionRule, parsed: ParsedOntology): Promise<Entity[]> {
    const entities: Entity[] = [];
    
    try {
      if (!parsed.rawData) {
        console.warn('No raw data available for entity extraction');
        return entities;
      }

      // Use JSONPath to extract entities
      const entityPath = config.path || '$.entities[*]';
      const entityNodes = jsonpath.query(parsed.rawData, entityPath);
      
      console.log(`🔍 Found ${entityNodes.length} potential entities using path: ${entityPath}`);
      
      for (const node of entityNodes) {
        try {
          const entityName = this.extractValue(node, config.name);
          const entityDescription = this.extractValue(node, config.description);
          
          if (entityName) {
            const entity: Entity = {
              name: String(entityName),
              description: entityDescription ? String(entityDescription) : `Entity: ${entityName}`,
              properties: this.extractProperties(node, config),
              keyProperties: ['name', 'id'],
              vectorIndex: true
            };
            
            entities.push(entity);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to extract entity from node:`, error);
        }
      }
      
      console.log(`✅ Extracted ${entities.length} entities`);
      return entities;
      
    } catch (error) {
      console.error('❌ Entity extraction failed:', error);
      return entities;
    }
  }

  async extractRelationships(config: ExtractionRule, parsed: ParsedOntology): Promise<Relationship[]> {
    const relationships: Relationship[] = [];
    
    try {
      if (!parsed.rawData) {
        console.warn('No raw data available for relationship extraction');
        return relationships;
      }

      // Use JSONPath to extract relationships
      const relPath = config.path || '$.relationships[*]';
      const relNodes = jsonpath.query(parsed.rawData, relPath);
      
      console.log(`🔗 Found ${relNodes.length} potential relationships using path: ${relPath}`);
      
      for (const node of relNodes) {
        try {
          const relName = this.extractValue(node, config.name);
          const relDescription = this.extractValue(node, config.description);
          const source = this.extractValue(node, config.source || '');
          const target = this.extractValue(node, config.target || '');
          
          if (relName) {
            const relationship: Relationship = {
              name: String(relName),
              description: relDescription ? String(relDescription) : `Relationship: ${relName}`,
              source: source ? String(source) : 'Entity',
              target: target ? String(target) : 'Entity'
            };
            
            relationships.push(relationship);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to extract relationship from node:`, error);
        }
      }
      
      console.log(`✅ Extracted ${relationships.length} relationships`);
      return relationships;
      
    } catch (error) {
      console.error('❌ Relationship extraction failed:', error);
      return relationships;
    }
  }

  private extractValue(node: any, path: string): any {
    if (!path || path === '.') {
      return node;
    }
    
    if (typeof path === 'string' && path.startsWith('$.')) {
      // JSONPath expression
      const results = jsonpath.query(node, path);
      return results.length > 0 ? results[0] : null;
    }
    
    // Simple property access
    if (typeof node === 'object' && node !== null) {
      return node[path];
    }
    
    return null;
  }

  private extractProperties(node: any, config: ExtractionRule): Record<string, any> {
    const properties: Record<string, any> = {};
    
    // Extract all properties from the node
    if (typeof node === 'object' && node !== null) {
      for (const [key, value] of Object.entries(node)) {
        // Skip special fields that are handled separately
        if (['name', 'description', 'source', 'target', 'id'].includes(key)) {
          continue;
        }
        
        // Add property with type inference
        if (value !== null && value !== undefined) {
          properties[key] = {
            type: this.inferType(value),
            description: `Property: ${key}`,
            value: value
          };
        }
      }
    }
    
    return properties;
  }

  private inferType(value: any): string {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object' && value !== null) return 'object';
    return 'unknown';
  }

  private getCachePath(url: string): string {
    // Create a safe filename from the URL
    const urlWithoutProtocol = url.replace(/^https?:\/\//i, '');
    const parts = urlWithoutProtocol
      .split(/[\\/]/)
      .map(p => p.replace(/[^a-zA-Z0-9._-]/g, '_'))
      .filter(Boolean);

    return path.join('cache', 'datasets', ...parts);
  }
} 