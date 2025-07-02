import { Session } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import { container } from 'tsyringe';
import { singleton } from 'tsyringe';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { OntologyService } from '@platform/ontology/ontology.service';
import { FinancialToCrmBridge } from '@financial/application/ontology-bridges/financial-to-crm.bridge';
import { flattenEnrichmentData } from './utils/enrichment.utils';
import { logger } from '@shared/utils/logger';

export interface IngestionEntity {
  id: string;
  name: string;
  type: string;
  label: string;
  embedding?: number[];
  resolvedId?: string;
  category?: string;
  createdAt?: Date;
  properties?: { [key: string]: any };
  getOntologicalType?: () => string;
  enrichedData?: any;
}

export interface Relationship {
  source: string;
  target: string;
  type: string;
}

export interface ProcessingResult {
  entities: IngestionEntity[];
  relationships: Relationship[];
}

@singleton()
export class Neo4jIngestionService {
  private neo4jConnection: Neo4jConnection;
  private ontologyService: OntologyService;
  private bridge: FinancialToCrmBridge;
  private session: Session | null = null;
  private indexableLabels: string[] = [];

  constructor() {
    this.neo4jConnection = container.resolve(Neo4jConnection);
    this.ontologyService = container.resolve(OntologyService);
    this.bridge = container.resolve(FinancialToCrmBridge);
  }

  async initialize(): Promise<void> {
    await this.neo4jConnection.connect();
    this.session = this.neo4jConnection.getDriver().session();
    
    if (!this.session) {
      throw new Error('Failed to create Neo4j session.');
    }

    this.indexableLabels = this.ontologyService.getIndexableEntityTypes();
    
    // Create Vector Index for all relevant labels
    logger.info('Creating vector indexes for indexable labels...');
    for (const label of this.indexableLabels) {
      const indexName = `${label.toLowerCase()}_embeddings`;
      await this.session.run(`DROP INDEX ${indexName} IF EXISTS`);
      const query = `CREATE VECTOR INDEX ${indexName} IF NOT EXISTS FOR (n:${label}) ON (n.embedding) OPTIONS {indexConfig: { \`vector.dimensions\`: 384, \`vector.similarity_function\`: 'cosine' }}`;
      await this.session.run(query);
      logger.info(`Vector index '${indexName}' is ready for label '${label}'.`);
    }
  }

  private getLabelInfo(entity: IngestionEntity, validOntologyTypes: string[]): { primary: string; candidates: string[] } {
    const primaryLabel = entity.getOntologicalType ? entity.getOntologicalType() : entity.type;

    if (!validOntologyTypes.includes(primaryLabel)) {
      logger.warn(`[Label Validation] Received type "${primaryLabel}" is not a registered ontology type. Defaulting to 'Thing'.`);
      return { primary: 'Thing', candidates: ['Thing'] };
    }
    
    const candidateLabels = [primaryLabel]
      .filter(l => this.indexableLabels.includes(l));

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
      if (!entity.embedding && !this.indexableLabels.includes(primaryLabel)) {
        logger.info(`Skipping entity '${entity.name}' (type: ${primaryLabel}) because it has no embedding and is not an indexed type.`);
        continue;
      }

      // Vector search for existing entities
      if (entity.embedding && candidateLabels.length > 0 && primaryLabel !== 'Thing') {
        for (const label of candidateLabels) {
          const indexName = `${label.toLowerCase()}_embeddings`;
          const searchResult = await this.session.run(
            `CALL db.index.vector.queryNodes($indexName, $limit, $embedding) YIELD node, score`,
            { indexName, limit: 1, embedding: entity.embedding }
          );

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
        const allLabels = [primaryLabel];
        if (primaryLabel && this.bridge && 'getCrmLabelsForFinancialType' in this.bridge) {
          try {
            const crmLabels = this.bridge.getCrmLabelsForFinancialType(primaryLabel);
            if (crmLabels.length > 0) {
              allLabels.push(...crmLabels);
            }
          } catch (error: any) {
            logger.error(`Error getting CRM labels for ${primaryLabel}:`, error.message);
          }
        }
        const labelsCypher = allLabels.map(l => `\`${l}\``).join(':');

        // Prepare properties
        const entityProperties = propertyRelationships.get(entity.id) || new Map();
        const additionalProperties: any = {};
        
        // Handle different property types
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
              createdAt: (entity.createdAt || new Date()).toISOString(),
              embedding: entity.embedding,
              ...(entity.properties || {}),
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
              props: additionalProps,
            },
          );
          logger.info(`Updated existing node '${entity.name}' with new properties.`);
        }

        entity.resolvedId = nodeId;
      }
    }
    
    // Create Communication Node and link entities
    const communicationId = uuidv4();
    await this.session.run(
      `
      MERGE (c:Communication {id: $id})
      ON CREATE SET c.subject = $subject, c.from = $from, c.date = datetime($date), c.sourceFile = $sourceFile
    `,
      {
        id: communicationId,
        subject: 'Email Communication',
        from: 'Unknown Sender',
        date: new Date().toISOString(),
        sourceFile: 'email',
      },
    );
    logger.info('Merged Communication node.');
    
    // Link non-property entities to communication
    for (const entity of nonPropertyEntities) {
      if (entity.resolvedId) {
        const entityInfo = entityMap.get(entity.name);
        const labels = entityInfo.labels;
        const labelsCypher = labels.map((l: string) => `\`${l}\``).join(':');

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
        const sourceLabelsCypher = sourceInfo.labels.map((l: string) => `\`${l}\``).join(':');
        const targetLabelsCypher = targetInfo.labels.map((l: string) => `\`${l}\``).join(':');
        const relType = rel.type.replace(/ /g, '_').toUpperCase();

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
    logger.info(`Merged ${nonPropertyRelationships.length} non-property relationships between entities.`);
    logger.info('Neo4j ingestion complete.');
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