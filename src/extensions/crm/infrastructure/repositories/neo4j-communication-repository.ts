import { injectable, inject } from 'inversify';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { Communication, CommunicationType, CommunicationStatus } from '../../domain/entities/communication';
import { CommunicationRepository, PaginationOptions } from '../../domain/repositories/communication-repository';
import { SpacyExtractedEntity, EntityType } from '../../application/services/spacy-entity-extraction.service';
import { OntologyService } from '@platform/ontology/ontology.service';

@injectable()
export class Neo4jCommunicationRepository implements CommunicationRepository {
  private connection: Neo4jConnection;
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

  constructor(@inject(OntologyService) ontologyService: OntologyService) {
    this.connection = Neo4jConnection.getInstance();
    this.ontologyService = ontologyService;
    this.communicationLabels = this.ontologyService.getLabelsForEntityType('Communication');
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
      ];

      for (const entity of entities) {
        // Do not create nodes for literal-like entities.
        // These are handled as properties of other nodes at a higher-level service.
        if (literalTypes.includes(entity.type)) {
          console.warn(`[Neo4jCommunicationRepository] Skipping node creation for literal type: "${entity.type}" (${entity.value}). This should be a property.`);
          continue;
        }

        // Map the spaCy label to our internal ontology entity type
        const entityType = this.spacyToOntologyMap[entity.spacyLabel] || entity.spacyLabel;
        const entityLabels = this.ontologyService.getLabelsForEntityType(entityType);
        
        // If the entity type doesn't exist in our ontologies, we can either skip it or use a default label.
        // Skipping is safer to maintain ontological integrity.
        if (!this.ontologyService.isValidLabel(entityType)) {
            console.warn(`[Neo4jCommunicationRepository] Ontology label not found for type: "${entityType}" (from spaCy label "${entity.spacyLabel}"). Skipping entity linking.`);
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

  async save(communication: Communication): Promise<Communication> {
    const session = this.connection.getSession();
    try {
      const query = `
        MERGE (c:${this.communicationLabels} {id: $id})
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
        MATCH (c:${this.communicationLabels} {id: $id})
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