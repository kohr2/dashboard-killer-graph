// O-CREAM-v2 Enhanced Neo4j Contact Repository
// Leverages ontological structure for advanced graph operations

import { Driver, Session } from 'neo4j-driver';
import { Neo4jConnection } from '../database/neo4j-connection';
import { ContactRepository, PaginationOptions } from '../../domain/repositories/contact-repository';
import { 
  OCreamContactEntity,
  createOCreamContact 
} from '../../domain/entities/contact-ontology';
import {
  DOLCECategory,
  RelationshipType,
  KnowledgeType,
  ActivityType,
  OCreamRelationship,
  InformationElement,
  CRMActivity,
  oCreamV2
} from '../../domain/ontology/o-cream-v2';

export class Neo4jOCreamContactRepository implements ContactRepository {
  private driver: Driver;

  constructor() {
    this.driver = Neo4jConnection.getInstance().getDriver();
  }

  async save(contact: OCreamContactEntity): Promise<void> {
    const session: Session = this.driver.session();
    
    try {
      await session.executeWrite(async (tx) => {
        // Save the main contact entity with O-CREAM-v2 properties
        const contactQuery = `
          MERGE (c:Contact:OCreamEntity {id: $id})
          SET c.category = $category,
              c.firstName = $firstName,
              c.lastName = $lastName,
              c.email = $email,
              c.phone = $phone,
              c.title = $title,
              c.organizationId = $organizationId,
              c.role = $role,
              c.status = $status,
              c.preferences = $preferences,
              c.ontologyVersion = $ontologyVersion,
              c.validationStatus = $validationStatus,
              c.createdAt = $createdAt,
              c.updatedAt = $updatedAt
        `;

        await tx.run(contactQuery, {
          id: contact.id,
          category: contact.category,
          firstName: contact.personalInfo.firstName,
          lastName: contact.personalInfo.lastName,
          email: contact.personalInfo.email,
          phone: contact.personalInfo.phone || null,
          title: contact.personalInfo.title || null,
          organizationId: contact.organizationId || null,
          role: contact.role || null,
          status: contact.status,
          preferences: JSON.stringify(contact.preferences),
          ontologyVersion: contact.ontologyMetadata.ontologyVersion,
          validationStatus: contact.ontologyMetadata.validationStatus,
          createdAt: contact.createdAt.toISOString(),
          updatedAt: contact.updatedAt.toISOString()
        });

        // Save knowledge elements as separate nodes
        for (const keId of contact.knowledgeElements) {
          const ke = oCreamV2.getEntity(keId) as InformationElement;
          if (ke) {
            const keQuery = `
              MERGE (ke:KnowledgeElement:OCreamEntity {id: $id})
              SET ke.category = $category,
                  ke.type = $type,
                  ke.title = $title,
                  ke.content = $content,
                  ke.format = $format,
                  ke.source = $source,
                  ke.reliability = $reliability,
                  ke.confidentiality = $confidentiality,
                  ke.version = $version,
                  ke.metadata = $metadata,
                  ke.createdAt = $createdAt,
                  ke.updatedAt = $updatedAt
              
              WITH ke
              MATCH (c:Contact {id: $contactId})
              MERGE (c)-[:HAS_KNOWLEDGE]->(ke)
            `;

            await tx.run(keQuery, {
              id: ke.id,
              category: ke.category,
              type: ke.type,
              title: ke.title,
              content: JSON.stringify(ke.content),
              format: ke.format,
              source: ke.source,
              reliability: ke.reliability,
              confidentiality: ke.confidentiality,
              version: ke.version,
              metadata: JSON.stringify(ke.metadata),
              createdAt: ke.createdAt.toISOString(),
              updatedAt: ke.updatedAt.toISOString(),
              contactId: contact.id
            });
          }
        }

        // Create organization relationship if exists
        if (contact.organizationId) {
          const orgRelQuery = `
            MATCH (c:Contact {id: $contactId})
            MATCH (o:Organization {id: $organizationId})
            MERGE (c)-[:WORKS_AT {
              type: $relType,
              role: $role,
              createdAt: $createdAt
            }]->(o)
          `;

          await tx.run(orgRelQuery, {
            contactId: contact.id,
            organizationId: contact.organizationId,
            relType: RelationshipType.EMPLOYMENT,
            role: contact.role || 'Employee',
            createdAt: contact.createdAt.toISOString()
          });
        }
      });
    } finally {
      await session.close();
    }
  }

  async findById(id: string): Promise<OCreamContactEntity | null> {
    const session: Session = this.driver.session();
    
    try {
      const result = await session.executeRead(async (tx) => {
        const query = `
          MATCH (c:Contact:OCreamEntity {id: $id})
          OPTIONAL MATCH (c)-[:HAS_KNOWLEDGE]->(ke:KnowledgeElement)
          RETURN c,
                 collect(ke) as knowledgeElements
        `;
        
        return await tx.run(query, { id });
      });

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const contactNode = record.get('c');
      const knowledgeElements = record.get('knowledgeElements') || [];

      return this.mapNodeToOCreamContact(contactNode, knowledgeElements);
    } finally {
      await session.close();
    }
  }

  async findAll(options?: PaginationOptions): Promise<OCreamContactEntity[]> {
    const session: Session = this.driver.session();
    
    try {
      const result = await session.executeRead(async (tx) => {
        const skip = options?.offset || 0;
        const limit = options?.limit || 100;
        
        const query = `
          MATCH (c:Contact:OCreamEntity)
          OPTIONAL MATCH (c)-[:HAS_KNOWLEDGE]->(ke:KnowledgeElement)
          WITH c, collect(ke) as knowledgeElements
          ORDER BY c.createdAt DESC
          SKIP $skip
          LIMIT $limit
          RETURN c, knowledgeElements
        `;
        
        return await tx.run(query, { skip, limit });
      });

      return result.records.map(record => {
        const contactNode = record.get('c');
        const knowledgeElements = record.get('knowledgeElements') || [];
        return this.mapNodeToOCreamContact(contactNode, knowledgeElements);
      });
    } finally {
      await session.close();
    }
  }

  async delete(id: string): Promise<boolean> {
    const session: Session = this.driver.session();
    
    try {
      const result = await session.executeWrite(async (tx) => {
        // Delete knowledge elements first
        await tx.run(`
          MATCH (c:Contact {id: $id})-[:HAS_KNOWLEDGE]->(ke:KnowledgeElement)
          DETACH DELETE ke
        `, { id });

        // Delete contact and all relationships
        const deleteQuery = `
          MATCH (c:Contact {id: $id})
          DETACH DELETE c
          RETURN count(c) as deletedCount
        `;
        
        return await tx.run(deleteQuery, { id });
      });

      return result.records[0]?.get('deletedCount') > 0;
    } finally {
      await session.close();
    }
  }

  async findByEmail(email: string): Promise<OCreamContactEntity | null> {
    const session: Session = this.driver.session();
    
    try {
      const result = await session.executeRead(async (tx) => {
        const query = `
          MATCH (c:Contact:OCreamEntity {email: $email})
          OPTIONAL MATCH (c)-[:HAS_KNOWLEDGE]->(ke:KnowledgeElement)
          RETURN c, collect(ke) as knowledgeElements
        `;
        
        return await tx.run(query, { email });
      });

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      const contactNode = record.get('c');
      const knowledgeElements = record.get('knowledgeElements') || [];

      return this.mapNodeToOCreamContact(contactNode, knowledgeElements);
    } finally {
      await session.close();
    }
  }

  async findByOrganizationId(organizationId: string, options?: PaginationOptions): Promise<OCreamContactEntity[]> {
    const session: Session = this.driver.session();
    
    try {
      const result = await session.executeRead(async (tx) => {
        const skip = options?.offset || 0;
        const limit = options?.limit || 100;
        
        const query = `
          MATCH (c:Contact:OCreamEntity {organizationId: $organizationId})
          OPTIONAL MATCH (c)-[:HAS_KNOWLEDGE]->(ke:KnowledgeElement)
          WITH c, collect(ke) as knowledgeElements
          ORDER BY c.createdAt DESC
          SKIP $skip
          LIMIT $limit
          RETURN c, knowledgeElements
        `;
        
        return await tx.run(query, { organizationId, skip, limit });
      });

      return result.records.map(record => {
        const contactNode = record.get('c');
        const knowledgeElements = record.get('knowledgeElements') || [];
        return this.mapNodeToOCreamContact(contactNode, knowledgeElements);
      });
    } finally {
      await session.close();
    }
  }

  async search(query: string, options?: PaginationOptions): Promise<OCreamContactEntity[]> {
    const session: Session = this.driver.session();
    
    try {
      const result = await session.executeRead(async (tx) => {
        const skip = options?.offset || 0;
        const limit = options?.limit || 100;
        
        const searchQuery = `
          MATCH (c:Contact:OCreamEntity)
          WHERE c.firstName CONTAINS $query 
             OR c.lastName CONTAINS $query 
             OR c.email CONTAINS $query
             OR c.title CONTAINS $query
          OPTIONAL MATCH (c)-[:HAS_KNOWLEDGE]->(ke:KnowledgeElement)
          WITH c, collect(ke) as knowledgeElements
          ORDER BY c.updatedAt DESC
          SKIP $skip
          LIMIT $limit
          RETURN c, knowledgeElements
        `;
        
        return await tx.run(searchQuery, { query, skip, limit });
      });

      return result.records.map(record => {
        const contactNode = record.get('c');
        const knowledgeElements = record.get('knowledgeElements') || [];
        return this.mapNodeToOCreamContact(contactNode, knowledgeElements);
      });
    } finally {
      await session.close();
    }
  }

  async count(): Promise<number> {
    const session: Session = this.driver.session();
    
    try {
      const result = await session.executeRead(async (tx) => {
        return await tx.run('MATCH (c:Contact:OCreamEntity) RETURN count(c) as count');
      });

      return result.records[0]?.get('count').toNumber() || 0;
    } finally {
      await session.close();
    }
  }

  async exists(id: string): Promise<boolean> {
    const session: Session = this.driver.session();
    
    try {
      const result = await session.executeRead(async (tx) => {
        return await tx.run(
          'MATCH (c:Contact:OCreamEntity {id: $id}) RETURN count(c) as count',
          { id }
        );
      });

      return (result.records[0]?.get('count').toNumber() || 0) > 0;
    } finally {
      await session.close();
    }
  }

  // O-CREAM-v2 specific methods

  async findByOntologyCategory(category: DOLCECategory, options?: PaginationOptions): Promise<OCreamContactEntity[]> {
    const session: Session = this.driver.session();
    
    try {
      const result = await session.executeRead(async (tx) => {
        const skip = options?.offset || 0;
        const limit = options?.limit || 100;
        
        const query = `
          MATCH (c:Contact:OCreamEntity {category: $category})
          OPTIONAL MATCH (c)-[:HAS_KNOWLEDGE]->(ke:KnowledgeElement)
          WITH c, collect(ke) as knowledgeElements
          ORDER BY c.createdAt DESC
          SKIP $skip
          LIMIT $limit
          RETURN c, knowledgeElements
        `;
        
        return await tx.run(query, { category, skip, limit });
      });

      return result.records.map(record => {
        const contactNode = record.get('c');
        const knowledgeElements = record.get('knowledgeElements') || [];
        return this.mapNodeToOCreamContact(contactNode, knowledgeElements);
      });
    } finally {
      await session.close();
    }
  }

  async findByKnowledgeType(knowledgeType: KnowledgeType, options?: PaginationOptions): Promise<OCreamContactEntity[]> {
    const session: Session = this.driver.session();
    
    try {
      const result = await session.executeRead(async (tx) => {
        const skip = options?.offset || 0;
        const limit = options?.limit || 100;
        
        const query = `
          MATCH (c:Contact:OCreamEntity)-[:HAS_KNOWLEDGE]->(ke:KnowledgeElement {type: $knowledgeType})
          OPTIONAL MATCH (c)-[:HAS_KNOWLEDGE]->(allKe:KnowledgeElement)
          WITH c, collect(DISTINCT allKe) as knowledgeElements
          ORDER BY c.updatedAt DESC
          SKIP $skip
          LIMIT $limit
          RETURN c, knowledgeElements
        `;
        
        return await tx.run(query, { knowledgeType, skip, limit });
      });

      return result.records.map(record => {
        const contactNode = record.get('c');
        const knowledgeElements = record.get('knowledgeElements') || [];
        return this.mapNodeToOCreamContact(contactNode, knowledgeElements);
      });
    } finally {
      await session.close();
    }
  }

  async findContactsWithRelationships(relationshipType?: RelationshipType, options?: PaginationOptions): Promise<OCreamContactEntity[]> {
    const session: Session = this.driver.session();
    
    try {
      const result = await session.executeRead(async (tx) => {
        const skip = options?.offset || 0;
        const limit = options?.limit || 100;
        
        let query = `
          MATCH (c:Contact:OCreamEntity)-[r]->(related)
        `;
        
        if (relationshipType) {
          query += ` WHERE r.type = $relationshipType`;
        }
        
        query += `
          OPTIONAL MATCH (c)-[:HAS_KNOWLEDGE]->(ke:KnowledgeElement)
          WITH c, collect(DISTINCT ke) as knowledgeElements, count(DISTINCT r) as relationshipCount
          ORDER BY relationshipCount DESC, c.updatedAt DESC
          SKIP $skip
          LIMIT $limit
          RETURN c, knowledgeElements
        `;
        
        const params: any = { skip, limit };
        if (relationshipType) {
          params.relationshipType = relationshipType;
        }
        
        return await tx.run(query, params);
      });

      return result.records.map(record => {
        const contactNode = record.get('c');
        const knowledgeElements = record.get('knowledgeElements') || [];
        return this.mapNodeToOCreamContact(contactNode, knowledgeElements);
      });
    } finally {
      await session.close();
    }
  }

  async getContactOntologyInsights(contactId: string): Promise<any> {
    const session: Session = this.driver.session();
    
    try {
      const result = await session.executeRead(async (tx) => {
        const query = `
          MATCH (c:Contact:OCreamEntity {id: $contactId})
          OPTIONAL MATCH (c)-[:HAS_KNOWLEDGE]->(ke:KnowledgeElement)
          OPTIONAL MATCH (c)-[r]->(related)
          OPTIONAL MATCH (c)-[:PARTICIPANT_IN]->(activity:Activity)
          
          RETURN c,
                 collect(DISTINCT ke) as knowledgeElements,
                 collect(DISTINCT {type: type(r), target: labels(related)}) as relationships,
                 collect(DISTINCT activity) as activities,
                 count(DISTINCT ke) as knowledgeCount,
                 count(DISTINCT r) as relationshipCount,
                 count(DISTINCT activity) as activityCount
        `;
        
        return await tx.run(query, { contactId });
      });

      if (result.records.length === 0) {
        return null;
      }

      const record = result.records[0];
      
      return {
        contact: record.get('c').properties,
        knowledgeElements: record.get('knowledgeElements').map((ke: any) => ke.properties),
        relationships: record.get('relationships'),
        activities: record.get('activities').map((a: any) => a.properties),
        metrics: {
          knowledgeCount: record.get('knowledgeCount').toNumber(),
          relationshipCount: record.get('relationshipCount').toNumber(),
          activityCount: record.get('activityCount').toNumber()
        }
      };
    } finally {
      await session.close();
    }
  }

  // Helper method to map Neo4j node to O-CREAM-v2 contact
  private mapNodeToOCreamContact(contactNode: any, knowledgeElements: any[]): OCreamContactEntity {
    const props = contactNode.properties;
    
    // Create the contact using the factory
    const contact = createOCreamContact({
      firstName: props.firstName,
      lastName: props.lastName,
      email: props.email,
      phone: props.phone || undefined,
      organizationId: props.organizationId || undefined,
      title: props.title || undefined,
      preferences: props.preferences ? JSON.parse(props.preferences) : {}
    });

    // Override with stored values
    (contact as any).id = props.id;
    contact.role = props.role || undefined;
    contact.status = props.status || 'active';
    (contact as any).createdAt = new Date(props.createdAt);
    contact.updatedAt = new Date(props.updatedAt);
    
    // Set ontology metadata
    contact.ontologyMetadata.ontologyVersion = props.ontologyVersion || '2.0';
    contact.ontologyMetadata.validationStatus = props.validationStatus || 'valid';
    contact.ontologyMetadata.lastOntologyUpdate = contact.updatedAt;

    // Map knowledge elements
    contact.knowledgeElements = knowledgeElements
      .filter(ke => ke && ke.properties)
      .map(ke => ke.properties.id);

    return contact;
  }
} 