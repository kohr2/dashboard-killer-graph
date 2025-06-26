import { injectable } from 'inversify';
import { Neo4jConnection } from '../database/neo4j-connection';
import { Communication, CommunicationType, CommunicationStatus } from '../../domain/entities/communication';
import { CommunicationRepository, PaginationOptions } from '../../domain/repositories/communication-repository';
import {
  SpacyEntityExtractionService,
  SpacyExtractedEntity,
  EntityType,
} from '../../application/services/spacy-entity-extraction.service';

@injectable()
export class Neo4jCommunicationRepository implements CommunicationRepository {
  private connection: Neo4jConnection;

  constructor() {
    this.connection = Neo4jConnection.getInstance();
  }

  private getLabelForEntityType(entityType: EntityType): string {
    const mapping: Partial<Record<EntityType, string>> = {
      [EntityType.PERSON_NAME]: 'Person',
      [EntityType.COMPANY_NAME]: 'Organization',
      [EntityType.FINANCIAL_INSTITUTION]: 'Organization',
      [EntityType.LOCATION]: 'Location',
      [EntityType.CITY]: 'Location',
      [EntityType.STATE]: 'Location',
      [EntityType.COUNTRY]: 'Location',
      [EntityType.MONETARY_AMOUNT]: 'MonetaryAmount',
      [EntityType.DATE]: 'Date',
      [EntityType.EMAIL_ADDRESS]: 'Email',
      [EntityType.PROJECT_NAME]: 'Project',
      [EntityType.PRODUCT_NAME]: 'Product',
    };
    // Sanitize the type to be a valid label
    const fallbackLabel = entityType
      .toString()
      .replace(/[^a-zA-Z0-9_]/g, '')
      .replace(/_(\w)/g, (_, c) => c.toUpperCase())
      .replace(/^\w/, c => c.toUpperCase());

    return mapping[entityType] || fallbackLabel;
  }

  private getLabelForSpacyType(spacyType: string): string {
    const mapping: Record<string, string> = {
        'PERSON': 'Person',
        'ORG': 'Organization',
        'GPE': 'Location',
        'LOC': 'Location',
        'DATE': 'Date',
        'MONEY': 'MonetaryAmount',
    };
    const label = mapping[spacyType] || spacyType.charAt(0).toUpperCase() + spacyType.slice(1).toLowerCase();
    return label.replace(/[^a-zA-Z0-9_]/g, '');
  }

  async linkEntitiesToCommunication(
    communicationId: string,
    entities: SpacyExtractedEntity[],
  ): Promise<void> {
    const session = this.connection.getDriver().session();
    try {
      for (const entity of entities) {
        const label = this.getLabelForSpacyType(entity.spacyLabel);
        // Step 1: Create or merge the entity node with a specific label
        await session.run(
          // We use backticks for the label to allow for a wider range of characters
          `MERGE (e:\`${label}\` {value: $value})
           ON CREATE SET e += $props, e.createdAt = timestamp()
           ON MATCH SET e.lastSeen = timestamp()
           RETURN e`,
          {
            value: entity.value,
            props: {
              type: entity.type,
              source: 'spacy-extraction',
              ...entity.metadata,
            },
          },
        );

        // Step 2: Create the relationship between the communication and the entity
        await session.run(
          `
          MATCH (c:Communication {id: $communicationId})
          MATCH (e:\`${label}\` {value: $value})
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

  async save(communication: Communication): Promise<Communication> {
    const session = this.connection.getSession();
    try {
      const query = `
        MERGE (c:Communication {id: $id})
        SET c += {
          type: $type,
          subject: $subject,
          body: $body,
          sender: $sender,
          recipients: $recipients,
          timestamp: datetime($timestamp),
          status: $status,
          metadata: $metadata
        }
        RETURN c
      `;
      
      const result = await session.run(query, {
        id: communication.id,
        type: communication.type,
        subject: communication.subject,
        body: communication.body,
        sender: communication.sender,
        recipients: communication.recipients,
        timestamp: communication.timestamp.toISOString(),
        status: communication.status,
        metadata: JSON.stringify(communication.metadata),
      });

      if (result.records.length === 0) {
        throw new Error('Failed to save communication.');
      }
      
      return communication;
    } finally {
      await session.close();
    }
  }

  async findById(id: string): Promise<Communication | null> {
    const session = this.connection.getSession();
    try {
      const query = `
        MATCH (c:Communication {id: $id})
        RETURN c
      `;
      const result = await session.run(query, { id });
      
      if (result.records.length === 0) {
        return null;
      }
      
      const record = result.records[0].get('c').properties;
      
      // Re-hydrate the Communication object
      return new Communication({
        id: record.id,
        type: record.type as CommunicationType,
        subject: record.subject,
        body: record.body,
        sender: record.sender,
        recipients: record.recipients,
        timestamp: new Date(record.timestamp.toString()),
        status: record.status as CommunicationStatus,
        metadata: JSON.parse(record.metadata),
      });
    } finally {
      await session.close();
    }
  }

  async findAll(options?: PaginationOptions): Promise<Communication[]> {
    // TODO: Implement
    return [];
  }

  async delete(id: string): Promise<boolean> {
    // TODO: Implement
    return false;
  }

  async findByContactId(contactId: string): Promise<Communication[]> {
    // TODO: Implement
    return [];
  }

  async findByType(type: CommunicationType): Promise<Communication[]> {
    // TODO: Implement
    return [];
  }

  async findByStatus(status: CommunicationStatus): Promise<Communication[]> {
    // TODO: Implement
    return [];
  }

  async search(query: string): Promise<Communication[]> {
    // TODO: Implement
    return [];
  }

  async count(): Promise<number> {
    // TODO: Implement
    return 0;
  }

  async exists(id: string): Promise<boolean> {
    // TODO: Implement
    return false;
  }
} 