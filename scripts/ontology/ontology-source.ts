import { ExtractionRule } from './config';

export interface Entity {
  name: string;
  description: string;
  properties: Record<string, any>;
  keyProperties: string[];
  vectorIndex: boolean;
  documentation?: string;
  parent?: string;
}

export interface Relationship {
  name: string;
  description: string;
  source: string;
  target: string;
  documentation?: string;
}

export interface ParsedOntology {
  entities: Entity[];
  relationships: Relationship[];
  ignoredEntities?: string[];
  ignoredRelationships?: string[];
  rawData?: any; // Raw parsed data for source-specific processing
}

export interface OntologySource {
  name: string;
  canHandle(url: string): boolean;
  fetch(url: string): Promise<string>;
  parse(content: string): Promise<ParsedOntology>;
  extractEntities(config: ExtractionRule, parsed: ParsedOntology): Promise<Entity[]>;
  extractRelationships(config: ExtractionRule, parsed: ParsedOntology): Promise<Relationship[]>;
}

export interface ExtractionResult {
  entities: Entity[];
  relationships: Relationship[];
  ignoredEntities?: string[];
  ignoredRelationships?: string[];
  metadata: {
    sourceUrl: string;
    extractionDate: string;
    sourceVersion: string;
    entityCount: number;
    relationshipCount: number;
  };
} 