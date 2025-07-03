// O-CREAM-v2 Enhanced Neo4j Contact Repository
// Leverages ontological structure for advanced graph operations

import * as neo4j from 'neo4j-driver';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { ContactRepository } from '@crm/domain/repositories/contact-repository';
import {
  OCreamContactEntity,
  ContactOntology,
} from '@crm/domain/entities/contact-ontology';
import { OntologyService } from '@platform/ontology/ontology.service';
import { singleton, inject } from 'tsyringe';
import { logger } from '@shared/utils/logger';
import { injectable } from 'tsyringe';
import { Driver, Session } from 'neo4j-driver';

// Temporary type definition until import issues are resolved
interface ContactDTO {
  id: string;
  name: string;
  type: string;
  label: string;
  enrichedData: string;
  email: string;
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  description: string;
  organizationId: string;
  activities: string;
  knowledgeElements: string;
  validationStatus: string;
  createdAt: string;
  updatedAt: string;
  additionalEmails: string;
  address: string;
  preferences: string;
}

@injectable()
export class Neo4jOCreamContactRepository implements ContactRepository {
  private driver: Driver;
  private contactLabels: string;

  constructor(
    @inject(OntologyService) private ontologyService: OntologyService,
    @inject(Neo4jConnection) connection: Neo4jConnection
  ) {
    this.driver = connection.getDriver();
    this.contactLabels = this.ontologyService.getLabelsForEntityType('Person');
  }

  private getSession(): Session {
    return this.driver.session();
  }

  async save(contact: ContactDTO): Promise<ContactDTO> {
    const session = this.getSession();
    try {
      await session.run(
        `MERGE (c:${this.contactLabels} {id: $id}) SET c += $props`,
        {
          id: contact.id,
          props: {
            name: contact.name,
            email: contact.email,
            organizationId: contact.organizationId,
            phone: contact.phone,
            title: contact.title,
            firstName: contact.firstName,
            lastName: contact.lastName,
            description: contact.description,
            type: contact.type,
            label: contact.label,
            enrichedData: contact.enrichedData,
            activities: contact.activities,
            knowledgeElements: contact.knowledgeElements,
            validationStatus: contact.validationStatus,
            additionalEmails: contact.additionalEmails,
            address: contact.address,
            preferences: contact.preferences,
            createdAt: contact.createdAt,
            updatedAt: contact.updatedAt,
          }
        }
      );
      return contact;
    } finally {
      await session.close();
    }
  }

  async findById(id: string): Promise<ContactDTO | null> {
    const session = this.getSession();
    try {
      const result = await session.run(`MATCH (c:${this.contactLabels} {id: $id}) RETURN c`, { id });
      const record = result.records[0];
      if (!record) return null;
      const node = record.get('c').properties;
      return this.mapNodeToContactDTO(node);
    } finally {
      await session.close();
    }
  }

  async findAll(): Promise<ContactDTO[]> {
    const session = this.getSession();
    try {
      const result = await session.run(`MATCH (c:${this.contactLabels}) RETURN c`);
      return result.records.map(record => this.mapNodeToContactDTO(record.get('c').properties));
    } finally {
      await session.close();
    }
  }

  async findByEmail(email: string): Promise<ContactDTO | null> {
    const session = this.getSession();
    try {
      const result = await session.run(`MATCH (c:${this.contactLabels} {email: $email}) RETURN c`, { email });
      const record = result.records[0];
      if (!record) return null;
      return this.mapNodeToContactDTO(record.get('c').properties);
    } finally {
      await session.close();
    }
  }

  async search(query: string): Promise<ContactDTO[]> {
    const session = this.getSession();
    try {
      const result = await session.run(`MATCH (c:${this.contactLabels}) WHERE c.name CONTAINS $query OR c.email CONTAINS $query RETURN c`, { query });
      return result.records.map(record => this.mapNodeToContactDTO(record.get('c').properties));
    } finally {
      await session.close();
    }
  }

  async delete(id: string): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(`MATCH (c:${this.contactLabels} {id: $id}) DETACH DELETE c`, { id });
    } finally {
      await session.close();
    }
  }

  async addEmailToContact(contactId: string, email: string): Promise<void> {
    // Implementation pending the logic to add an additional email to a contact
    logger.info(`Adding email ${email} to contact ${contactId} - not implemented`);
    return Promise.resolve();
  }
  
  private mapNodeToContactDTO(node: any): ContactDTO {
    return {
      id: node.id,
      name: node.name || `${node.firstName} ${node.lastName}`,
      type: 'Contact',
      label: node.name || `${node.firstName} ${node.lastName}`,
      enrichedData: node.enrichedData || '',
      email: node.email,
      title: node.title || '',
      firstName: node.firstName,
      lastName: node.lastName,
      phone: node.phone || '',
      description: node.description || '',
      organizationId: node.organizationId || '',
      activities: node.activities || '',
      knowledgeElements: node.knowledgeElements || '',
      validationStatus: node.validationStatus || 'VALID',
      createdAt: node.createdAt || new Date().toISOString(),
      updatedAt: node.updatedAt || new Date().toISOString(),
      additionalEmails: node.additionalEmails || '',
      address: node.address || '',
      preferences: node.preferences || '',
    };
  }
} 