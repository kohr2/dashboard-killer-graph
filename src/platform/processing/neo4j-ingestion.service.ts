import { Session } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import { container } from 'tsyringe';
import { singleton } from 'tsyringe';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { OntologyService } from '@platform/ontology/ontology.service';
import { logger } from '@shared/utils/logger';
import { flattenEnrichmentData, flattenEntityProperties } from './utils/enrichment.utils';
import { ContentProcessingService } from './content-processing.service';

export interface IngestionEntity {
  id: string;
  name: string;
  type: string;
  label: string;
  embedding?: number[];
  resolvedId?: string;
  category?: string;
  createdAt?: Date | string;
  properties?: { [key: string]: any };
  getOntologicalType?: () => string;
  enrichedData?: any;
  uuid?: string; // Add uuid for ontology datasets
}

export interface Relationship {
  source: string;
  target: string;
  type: string;
  properties?: Record<string, any>;
}

export interface ProcessingResult {
  entities: IngestionEntity[];
  relationships: Relationship[];
  metadata?: Record<string, any>;
}

@singleton()
export class Neo4jIngestionService {
  private neo4jConnection: Neo4jConnection;
  private ontologyService: OntologyService;
  private session: Session | null = null;
  private indexableLabels: string[] = [];

  constructor() {
    this.neo4jConnection = container.resolve(Neo4jConnection);
    this.ontologyService = container.resolve(OntologyService);
  }

  async initialize(): Promise<void> {
    await this.neo4jConnection.connect();
    // Build dynamic schema & vector indexes based on whatever ontologies are currently loaded.
    // This keeps the service ontology-agnostic and removes any path assumptions.
    await this.neo4jConnection.initializeSchema();

    this.session = this.neo4jConnection.getSession();
    if (!this.session) {
      throw new Error('Failed to create Neo4j session.');
    }
  }

  private getLabelInfo(entity: IngestionEntity, validOntologyTypes: string[]): { primary: string; candidates: string[] } {
    // Delegate normalisation logic to ContentProcessingService so we keep it in one place.
    const primaryLabel = ContentProcessingService.normaliseEntityType(
      entity.getOntologicalType ? entity.getOntologicalType() : entity.type,
    );

    if (!primaryLabel) {
      return { primary: 'UnrecognizedEntity', candidates: [] };
    }
    
    // Get super classes from ontology to add additional labels
    const superClasses = this.ontologyService.getSuperClasses(primaryLabel);
    
    // Combine primary + super classes (excluding duplicates)
    const allPotentialLabels = [primaryLabel, ...superClasses];
    
    // Get indexable labels from ontology service instead of this.indexableLabels
    const indexableLabels = this.ontologyService.getIndexableEntityTypes();
    const candidateLabels = allPotentialLabels.filter(l => indexableLabels.includes(l));

    return { primary: primaryLabel, candidates: [...new Set(candidateLabels)] };
  }

  private separatePropertyEntities(
    entities: IngestionEntity[],
    propertyEntityTypes: string[],
  ): {
    propertyEntities: IngestionEntity[];
    nonPropertyEntities: IngestionEntity[];
  } {
    const propertyEntities = entities.filter(entity =>
      propertyEntityTypes.includes(entity.type),
    );
    const nonPropertyEntities = entities.filter(
      entity => !propertyEntityTypes.includes(entity.type),
    );
    return { propertyEntities, nonPropertyEntities };
  }

  async ingestEntitiesAndRelationships(result: ProcessingResult): Promise<void> {
    if (!this.session) {
      throw new Error('Neo4j session not initialized');
    }

    const { entities, relationships } = result;
    const propertyEntityTypes = this.ontologyService.getPropertyEntityTypes();
    const validEntityTypes = this.ontologyService.getAllEntityTypes();

    logger.info('Starting Neo4j ingestion with vector search...');
    const entityMap = new Map<string, any>();

    // Separate property and non-property entities
    const { propertyEntities, nonPropertyEntities } = this.separatePropertyEntities(
      entities,
      propertyEntityTypes,
    );

    // Prepare property relationships
    const propertyRelationshipTypes = new Set(
      propertyEntityTypes.map(type => `HAS_${type.toUpperCase()}`),
    );
    
    const propertyRelationships = new Map<string, Map<string, string[]>>();
    relationships.forEach(rel => {
      if (propertyRelationshipTypes.has(rel.type)) {
        const sourceId = rel.source;
        const targetEntity = entities.find(e => e.id === rel.target);
        if (targetEntity && propertyEntityTypes.includes(targetEntity.type)) {
          if (!propertyRelationships.has(sourceId)) {
            propertyRelationships.set(sourceId, new Map());
          }
          const entityPropertyMap = propertyRelationships.get(sourceId)!;
          const propertyType = targetEntity.type.toLowerCase();
          if (!entityPropertyMap.has(propertyType)) {
            entityPropertyMap.set(propertyType, []);
          }
          entityPropertyMap.get(propertyType)!.push(targetEntity.name);
        }
      }
    });

    logger.info(`Found ${propertyEntities.length} property entities and processing ${nonPropertyEntities.length} non-property entities`);

    // Process non-property entities
    for (const entity of nonPropertyEntities) {
      const { primary: primaryLabel, candidates: candidateLabels } = this.getLabelInfo(entity, validEntityTypes);
      let nodeId = entity.id || uuidv4();
      let foundExistingNode = false;

      if (primaryLabel === 'UnrecognizedEntity') {
        logger.info(`Skipping unrecognized entity '${entity.name}'.`);
        continue;
      }
      // Skip generic catch-all types
      if (primaryLabel === 'Thing') {
        logger.info(`Skipping generic 'Thing' entity '${entity.name}'.`);
        continue;
      }

      // Always create Ontology node, even if not indexable or without embedding
      if (primaryLabel === 'Ontology') {
        logger.info(`[DEBUG] Processing Ontology entity: ${entity.name} (id: ${entity.id})`);
      } else {
        if (!entity.embedding && !this.ontologyService.getIndexableEntityTypes().includes(primaryLabel)) {
          logger.info(`[DEBUG] Skipping entity '${entity.name}' (id: ${entity.id}, type: ${entity.type}, primaryLabel: ${primaryLabel}) because it has no embedding and is not an indexed type.`);
          continue;
        }
      }

      // Vector search for existing entities (skip for ontology datasets with exact IDs)
      // Skip fuzzy matching if entity has a uuid property (indicating it's from a structured dataset)
      if (!entity.uuid && entity.embedding && candidateLabels.length > 0 && primaryLabel !== 'Thing') {
        for (const label of candidateLabels) {
          const indexName = `${label.toLowerCase()}_embeddings`;
          let searchResult;
          try {
            searchResult = await this.session.run(
              `CALL db.index.vector.queryNodes($indexName, $limit, $embedding) YIELD node, score`,
              { indexName, limit: 1, embedding: entity.embedding }
            );
          } catch (err: any) {
            // Neo4j will throw if the requested index doesn't exist (for instance if the label
            // wasn't flagged with vectorIndex: true). We skip vector matching in that case and
            // continue as if no match was found rather than aborting the entire ingestion.
            if (err.code === 'Neo.ClientError.Procedure.ProcedureCallFailed') {
              logger.warn(`Vector search skipped for label '${label}' – index '${indexName}' not found.`);
              continue;
            }
            throw err; // propagate unexpected errors
          }

          if (searchResult.records.length > 0 && searchResult.records[0].get('score') > 0.92) {
            const existingNode = searchResult.records[0].get('node');
            nodeId = existingNode.properties.id;
            logger.info(`Found existing '${label}' entity '${entity.name}' with score ${searchResult.records[0].get('score').toFixed(2)}. Reusing ID: ${nodeId}`);
            entityMap.set(entity.name, { ...existingNode.properties, labels: existingNode.labels });
            foundExistingNode = true;
            break;
          }
        }
      }

      if (!foundExistingNode) {
        // Create new entity
        const allLabels = [
          primaryLabel,
          ...this.ontologyService.getSuperClasses(primaryLabel),
        ].filter((l, idx, arr) => arr.indexOf(l) === idx);
        const labelsCypher = allLabels.map(l => '\`' + l + '\`').join(':');

        // Prepare properties
        const entityProperties = propertyRelationships.get(entity.id) || new Map();
        const additionalProperties: any = {};
        
        // Handle different property types
        if (entityProperties.has('name')) {
          const names = entityProperties.get('name')!;
          // Prefer the first 'name' property as canonical name, but keep original entity.name as fallback
          additionalProperties.name = names[0] ?? entity.name;
          if (names.length > 1) {
            additionalProperties.alternativeNames = names.slice(1);
          }
        }
        
        if (entityProperties.has('email')) {
          const emails = entityProperties.get('email')!;
          additionalProperties.email = emails[0];
          if (emails.length > 1) {
            additionalProperties.additionalEmails = emails.slice(1);
          }
        }
        
        if (entityProperties.has('percent')) {
          const percents = entityProperties.get('percent')!;
          additionalProperties.percentage = percents[0];
          if (percents.length > 1) {
            additionalProperties.additionalPercentages = percents.slice(1);
          }
        }
        
        if (entityProperties.has('date')) {
          const dates = entityProperties.get('date')!;
          additionalProperties.date = dates[0];
          if (dates.length > 1) {
            additionalProperties.additionalDates = dates.slice(1);
          }
        }
        
        if (entityProperties.has('monetaryamount')) {
          const amounts = entityProperties.get('monetaryamount')!;
          additionalProperties.amount = amounts[0];
          if (amounts.length > 1) {
            additionalProperties.additionalAmounts = amounts.slice(1);
          }
        }
        
        if (entityProperties.has('time')) {
          const times = entityProperties.get('time')!;
          additionalProperties.time = times[0];
          if (times.length > 1) {
            additionalProperties.additionalTimes = times.slice(1);
          }
        }

        // Flatten enriched data
        if (entity.enrichedData) {
          const flattened = flattenEnrichmentData(entity.enrichedData);
          Object.assign(additionalProperties, flattened);
        }

        // Create node
        const mergeQuery = entity.embedding
          ? `
            MERGE (e {id: $id})
            ON CREATE SET e += $props
            ON MATCH SET e += $props
            SET e:${labelsCypher}
            RETURN e
          `
          : `
            MERGE (e {id: $id})
            ON CREATE SET e += $props
            SET e:${labelsCypher}
            RETURN e
          `;
        
        const mergeResult = await this.session.run(
          mergeQuery,
          {
            id: nodeId,
            props: {
              id: nodeId,
              name: entity.name,
              category: entity.category || 'Generic',
              createdAt: (() => {
                if (!entity.createdAt) {
                  return new Date().toISOString();
                }
                if (typeof entity.createdAt === 'string') {
                  return entity.createdAt;
                }
                if (typeof (entity.createdAt as any).toISOString === 'function') {
                  return (entity.createdAt as Date).toISOString();
                }
                return new Date().toISOString();
              })(),
              embedding: entity.embedding,
              ...(entity.properties ? flattenEntityProperties(entity.properties) : {}),
              ...additionalProperties,
            }
          }
        );
        const newNode = mergeResult.records[0].get('e');
        const action = mergeResult.summary.counters.updates().nodesCreated > 0 ? 'Created' : 'Matched';
        logger.info(`${action} '${primaryLabel}' node for '${entity.name}' with ID: ${newNode.properties.id}`);
        entityMap.set(entity.name, { ...newNode.properties, labels: newNode.labels });
        nodeId = newNode.properties.id;
        entity.resolvedId = nodeId;
      } else {
        // Update existing node properties
        const entityProperties = propertyRelationships.get(entity.id) || new Map();
        const additionalProps: any = {};

        if (entityProperties.has('name')) {
          const names = entityProperties.get('name')!;
          // Prefer the first 'name' property as canonical name, but keep original entity.name as fallback
          additionalProps.name = names[0] ?? entity.name;
          if (names.length > 1) {
            additionalProps.alternativeNames = names.slice(1);
          }
        }
        if (entityProperties.has('email')) {
          const emails = entityProperties.get('email')!;
          additionalProps.email = emails[0];
          if (emails.length > 1) {
            additionalProps.additionalEmails = emails.slice(1);
          }
        }
        if (entityProperties.has('percent')) {
          const percents = entityProperties.get('percent')!;
          additionalProps.percentage = percents[0];
          if (percents.length > 1) {
            additionalProps.additionalPercentages = percents.slice(1);
          }
        }
        if (entityProperties.has('date')) {
          const dates = entityProperties.get('date')!;
          additionalProps.date = dates[0];
          if (dates.length > 1) {
            additionalProps.additionalDates = dates.slice(1);
          }
        }
        if (entityProperties.has('monetaryamount')) {
          const amounts = entityProperties.get('monetaryamount')!;
          additionalProps.amount = amounts[0];
          if (amounts.length > 1) {
            additionalProps.additionalAmounts = amounts.slice(1);
          }
        }
        if (entityProperties.has('time')) {
          const times = entityProperties.get('time')!;
          additionalProps.time = times[0];
          if (times.length > 1) {
            additionalProps.additionalTimes = times.slice(1);
          }
        }

        if (entity.enrichedData) {
          const flattened = flattenEnrichmentData(entity.enrichedData);
          Object.assign(additionalProps, flattened);
        }

        if (Object.keys(additionalProps).length > 0) {
          await this.session.run(
            `MATCH (e {id: $id}) SET e += $props`,
            {
              id: nodeId,
              props: {
                ...(entity.properties ? flattenEntityProperties(entity.properties) : {}),
                ...additionalProps,
              },
            },
          );
          logger.info(`Updated existing node '${entity.name}' with new properties.`);
        }

        entity.resolvedId = nodeId;
      }
      if (primaryLabel === 'Ontology') {
        logger.info(`Creating Ontology node: ${entity.name} (id: ${entity.id}) with properties: ${JSON.stringify(entity.properties)}`);
      }
    }
    
    // Create Communication Node and link entities
    const metadata = result.metadata || {};
    const sourceFile = metadata.sourceFile || 'unknown-email';
    const communicationId = `communication_${sourceFile}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`[DEBUG] Creating Communication node with metadata: ${JSON.stringify(metadata)}`);
    logger.info(`[DEBUG] SourceFile: ${sourceFile}`);
    logger.info(`[DEBUG] CommunicationId: ${communicationId}`);
    
    await this.session.run(
      `
      CREATE (c:Communication {id: $id, subject: $subject, from: $from, date: datetime($date), sourceFile: $sourceFile, createdAt: $createdAt})
    `,
      {
        id: communicationId,
        subject: 'Email Communication',
        from: 'Unknown Sender',
        date: new Date().toISOString(),
        sourceFile: sourceFile,
        createdAt: new Date().toISOString(),
      },
    );
    logger.info('Created Communication node.');
    
    // Link non-property entities to communication
    for (const entity of nonPropertyEntities) {
      if (entity.resolvedId) {
        const entityInfo = entityMap.get(entity.name);
        const labels = entityInfo.labels;
        const labelsCypher = labels.map((l: string) => '\`' + l + '\`').join(':');

        await this.session.run(
          `
          MATCH (c:Communication {id: $communicationId})
          MATCH (e:${labelsCypher} {id: $entityId})
          MERGE (c)-[:CONTAINS_ENTITY]->(e)
        `,
          {
            communicationId: communicationId,
            entityId: entity.resolvedId,
          },
        );
      }
    }
    logger.info(`Linked ${nonPropertyEntities.filter(e => e.resolvedId).length} non-property entities to communication.`);

    // Create relationships between entities
    const entityIdMap = new Map<string, IngestionEntity>(nonPropertyEntities.map((e: IngestionEntity) => [e.id, e]));
    const nonPropertyRelationships = relationships.filter(rel => !['HAS_EMAIL', 'HAS_PERCENT', 'HAS_DATE', 'HAS_MONETARY_AMOUNT', 'HAS_TIME'].includes(rel.type));
    
    for (const rel of nonPropertyRelationships) {
      const sourceEntity = entityIdMap.get(rel.source);
      const targetEntity = entityIdMap.get(rel.target);
      
      if (sourceEntity && sourceEntity.resolvedId && targetEntity && targetEntity.resolvedId) {
        const sourceInfo = entityMap.get(sourceEntity.name);
        const targetInfo = entityMap.get(targetEntity.name);
        const sourceLabelsCypher = sourceInfo.labels.map((l: string) => '`' + l + '`').join(':');
        const targetLabelsCypher = targetInfo.labels.map((l: string) => '`' + l + '`').join(':');
        const relType = this.convertCamelCaseToSnakeCase(rel.type); // no .toUpperCase()

        if (rel.properties && Object.keys(rel.properties).length > 0) {
          await this.session.run(
            `
            MATCH (a:${sourceLabelsCypher} {id: $sourceId})
            MATCH (b:${targetLabelsCypher} {id: $targetId})
            MERGE (a)-[r:\`${relType}\`]->(b)
            SET r += $relProps
            `,
            {
              sourceId: sourceEntity.resolvedId,
              targetId: targetEntity.resolvedId,
              relProps: rel.properties,
            },
          );
        } else {
          await this.session.run(
            `
            MATCH (a:${sourceLabelsCypher} {id: $sourceId})
            MATCH (b:${targetLabelsCypher} {id: $targetId})
            MERGE (a)-[:\`${relType}\`]->(b)
            `,
            {
              sourceId: sourceEntity.resolvedId,
              targetId: targetEntity.resolvedId,
            },
          );
        }
      }
    }
    logger.info(`Merged ${nonPropertyRelationships.length} non-property relationships between entities.`);
    logger.info('Neo4j ingestion complete.');
  }

  /**
   * Convert camelCase, PascalCase, or colon-suffixed relationship types to capitalized snake_case
   * E.g. associatedWith:INFERRED -> ASSOCIATED_WITH_INFERRED
   */
  private convertCamelCaseToSnakeCase(input: string): string {
    // Split on colon (for :INFERRED or similar)
    const [main, suffix] = input.split(/[:.]/);
    // Convert main part to snake_case
    const snake = main
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2') // camelCase to snake_case
      .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2') // PascalCase to snake_case
      .replace(/[^a-zA-Z0-9]+/g, '_') // non-alphanum to _
      .replace(/_+/g, '_') // collapse multiple _
      .replace(/^_+|_+$/g, '') // trim leading/trailing _
      .toLowerCase();
    if (suffix) {
      return `${snake}_${suffix.toLowerCase()}`.toUpperCase();
    }
    return snake.toUpperCase();
  }

  getSession(): Session | null {
    return this.session;
  }

  async close(): Promise<void> {
    if (this.session) {
      await this.session.close();
      logger.info('Neo4j session closed.');
    }
    await this.neo4jConnection.close();
    logger.info('Neo4j connection closed.');
  }
} 