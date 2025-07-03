import { injectable, inject } from 'tsyringe';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { CommunicationDTO } from '@generated/crm/CommunicationDTO';
import { CommunicationRepository, PaginationOptions } from '../../repositories/communication-repository';
import { SpacyExtractedEntity, EntityType } from '../../application/services/spacy-entity-extraction.service';
import { OntologyService } from '@platform/ontology/ontology.service';
import { logger } from '@shared/utils/logger';
import { v4 as uuidv4 } from 'uuid';

@injectable()
export class Neo4jCommunicationRepository implements CommunicationRepository {
  private ontologyService: OntologyService;
  private communicationLabels: string;

  // A simple mapping from spaCy's coarse-grained labels to our more specific ontology types.
  private spacyToOntologyMap: Record<string, string> = {
    'PERSON': 'Person',
    'ORG': 'Organization',
    'GPE': 'GeographicRegion',
    'LOC': 'GeographicRegion',
    'DATE': 'Date', // Assuming 'Date' is a defined entity type in one of the ontologies
    'MONEY': 'MonetaryAmount', // Assuming 'MonetaryAmount' is defined
    'PRODUCT': 'Product', // Assuming 'Product' is defined
  };

  constructor(
    @inject(Neo4jConnection) private connection: Neo4jConnection,
    @inject(OntologyService) ontologyService: OntologyService,
  ) {
    this.ontologyService = ontologyService;
    this.communicationLabels =
      this.ontologyService.getLabelsForEntityType('Communication');
  }

  private _mapRecordToCommunicationDTO(record: any): CommunicationDTO | null {
    if (!record) {
      return null;
    }
    const node = record.get('c');
    if (!node || !node.properties) {
      return null;
    }
    const props = node.properties;
    return {
      id: props.id,
      name: props.name || props.subject || '',
      type: props.type || 'Communication',
      label: props.label || 'Communication',
      enrichedData: props.enrichedData || '',
      status: props.status || '',
      subject: props.subject || '',
      body: props.body || '',
      sender: props.sender || '',
      recipients: props.recipients || '',
      timestamp: props.timestamp ? props.timestamp.toString() : '',
      metadata: props.metadata || '',
      channel: props.channel || '',
      priority: props.priority || '',
      duration: props.duration || '',
      attachments: props.attachments || '',
      tags: props.tags || '',
      createdAt: props.createdAt || new Date().toISOString(),
      updatedAt: props.updatedAt || new Date().toISOString(),
    };
  }

  async linkEntitiesToCommunication(
    communicationId: string,
    entities: SpacyExtractedEntity[],
  ): Promise<void> {
    const session = this.connection.getDriver().session();
    try {
      // Define literal types that should not become separate nodes
      const literalTypes = [
        EntityType.DATE,
        EntityType.MONETARY_AMOUNT,
        EntityType.EMAIL_ADDRESS,
        EntityType.PHONE_NUMBER,
        EntityType.URL,
        // Adding legacy spacy labels for broader coverage during transition
        'DATE', 'MONEY', 'CARDINAL', 'ORDINAL', 'QUANTITY', 'PERCENT', 'EMAIL_ADDRESS', 'PHONE_NUMBER', 'URL'
      ];

      for (const entity of entities) {
        // Determine the primary type identifier, preferring our internal enum but falling back to the spacy label.
        const primaryType = entity.type || entity.spacyLabel;

        // Do not create nodes for literal-like entities.
        // These are handled as properties of other nodes at a higher-level service.
        if (literalTypes.includes(primaryType)) {
          logger.warn(`[Neo4jCommunicationRepository] Skipping node creation for literal type: "${primaryType}" (${entity.value}). This should be a property.`);
          continue; // Skip to the next entity
        }

        // Map the spaCy label to our internal ontology entity type
        const entityType = this.spacyToOntologyMap[entity.spacyLabel] || entity.spacyLabel;
        const entityLabels = this.ontologyService.getLabelsForEntityType(entityType);
        
        // If the entity type doesn't exist in our ontologies, we can either skip it or use a default label.
        // Skipping is safer to maintain ontological integrity.
        if (!this.ontologyService.isValidLabel(entityType)) {
            logger.warn(`[Neo4jCommunicationRepository] Ontology label not found for type: "${entityType}" (from spaCy label "${entity.spacyLabel}"). Skipping entity linking.`);
            continue;
        }

        // Create or merge the entity node
        await session.run(
          `MERGE (e:${entityLabels} {value: $value})
           ON CREATE SET e += $props, e.createdAt = timestamp()
           ON MATCH SET e.lastSeen = timestamp()`,
          {
            value: entity.value,
            props: {
              type: entity.type,
              source: 'spacy-extraction',
              ...entity.metadata,
            },
          },
        );

        // Create the relationship between the communication and the entity
        await session.run(
          `
          MATCH (c:${this.communicationLabels} {id: $communicationId})
          MATCH (e {value: $value})
          // Ensure we match the exact node we just created by checking its primary label
          WHERE e:\`${entityType}\`
          MERGE (c)-[r:CONTAINS_ENTITY]->(e)
          ON CREATE SET r.confidence = $confidence, r.context = $context
          `,
          {
            communicationId,
            value: entity.value,
            confidence: entity.confidence,
            context: entity.context,
          },
        );
      }
    } finally {
      await session.close();
    }
  }

  async save(communication: CommunicationDTO): Promise<CommunicationDTO> {
    const session = this.connection.getSession();
    try {
      const query = `
        MERGE (c:${this.communicationLabels} {id: $id})
        SET c += {
          name: $name,
          type: $type,
          label: $label,
          enrichedData: $enrichedData,
          status: $status,
          subject: $subject,
          body: $body,
          sender: $sender,
          recipients: $recipients,
          timestamp: $timestamp,
          metadata: $metadata,
          channel: $channel,
          priority: $priority,
          duration: $duration,
          attachments: $attachments,
          tags: $tags,
          createdAt: $createdAt,
          updatedAt: $updatedAt
        }
        RETURN c
      `;
      
      const result = await session.run(query, {
        id: communication.id,
        name: communication.name,
        type: communication.type,
        label: communication.label,
        enrichedData: communication.enrichedData,
        status: communication.status,
        subject: communication.subject,
        body: communication.body,
        sender: communication.sender,
        recipients: communication.recipients,
        timestamp: communication.timestamp,
        metadata: communication.metadata,
        channel: communication.channel,
        priority: communication.priority,
        duration: communication.duration,
        attachments: communication.attachments,
        tags: communication.tags,
        createdAt: communication.createdAt,
        updatedAt: communication.updatedAt,
      });

      if (result.records.length === 0) {
        throw new Error('Failed to save communication.');
      }
      
      const savedRecord = this._mapRecordToCommunicationDTO(result.records[0]);
      if (!savedRecord) {
        throw new Error('Failed to map saved communication record.');
      }
      return savedRecord;
    } finally {
      await session.close();
    }
  }

  async findById(id: string): Promise<CommunicationDTO | null> {
    const session = this.connection.getSession();
    try {
      const query = `
        MATCH (c:${this.communicationLabels} {id: $id})
        RETURN c
      `;
      const result = await session.run(query, { id });
      
      if (result.records.length === 0) {
        return null;
      }
      
      return this._mapRecordToCommunicationDTO(result.records[0]);
    } finally {
      await session.close();
    }
  }

  async findAll(options?: PaginationOptions): Promise<CommunicationDTO[]> {
    // Implementation pending
    return [];
  }

  async delete(id: string): Promise<boolean> {
    // Implementation pending
    return false;
  }

  async findByContactId(contactId: string): Promise<CommunicationDTO[]> {
    // Implementation pending
    return [];
  }

  async findByType(type: string): Promise<CommunicationDTO[]> {
    // Implementation pending
    return [];
  }

  async findByStatus(status: string): Promise<CommunicationDTO[]> {
    // Implementation pending
    return [];
  }

  async search(query: string): Promise<CommunicationDTO[]> {
    // Implementation pending
    return [];
  }

  async count(): Promise<number> {
    // Implementation pending
    return 0;
  }

  async exists(id: string): Promise<boolean> {
    // Implementation pending
    return false;
  }

  async updateProperties(id: string, properties: Record<string, any>): Promise<void> {
    const session = this.connection.getSession();
    try {
        const query = `
            MATCH (c:${this.communicationLabels} {id: $id})
            SET c += $props
        `;
        await session.run(query, { id, props: properties });
    } finally {
        await session.close();
    }
  }
} 