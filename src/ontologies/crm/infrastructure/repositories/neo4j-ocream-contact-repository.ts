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

  async save(contact: OCreamContactEntity): Promise<OCreamContactEntity> {
    const session = this.getSession();
    try {
      await session.run(
        `MERGE (c:${this.contactLabels} {id: $id}) SET c += $props`,
        {
          id: contact.id,
          props: {
            name: contact.name,
            email: contact.personalInfo.email,
            organizationId: contact.organizationId,
            phone: contact.personalInfo.phone,
            title: contact.personalInfo.title,
            firstName: contact.personalInfo.firstName,
            lastName: contact.personalInfo.lastName,
            description: contact.description,
            createdAt: contact.createdAt.toISOString(),
            updatedAt: contact.updatedAt.toISOString(),
          }
        }
      );
      return contact;
    } finally {
      await session.close();
    }
  }

  async findById(id: string): Promise<OCreamContactEntity | null> {
    const session = this.getSession();
    try {
      const result = await session.run(`MATCH (c:${this.contactLabels} {id: $id}) RETURN c`, { id });
      const record = result.records[0];
      if (!record) return null;
      const node = record.get('c').properties;
      return this.mapNodeToContact(node);
    } finally {
      await session.close();
    }
  }

  async findAll(): Promise<OCreamContactEntity[]> {
    const session = this.getSession();
    try {
      const result = await session.run(`MATCH (c:${this.contactLabels}) RETURN c`);
      return result.records.map(record => this.mapNodeToContact(record.get('c').properties));
    } finally {
      await session.close();
    }
  }

  async findByEmail(email: string): Promise<OCreamContactEntity | null> {
    const session = this.getSession();
    try {
      const result = await session.run(`MATCH (c:${this.contactLabels} {email: $email}) RETURN c`, { email });
      const record = result.records[0];
      if (!record) return null;
      return this.mapNodeToContact(record.get('c').properties);
    } finally {
      await session.close();
    }
  }

  async search(query: unknown): Promise<OCreamContactEntity[]> {
    const session = this.getSession();
    try {
      const result = await session.run(`MATCH (c:${this.contactLabels}) WHERE c.name CONTAINS $query OR c.email CONTAINS $query RETURN c`, { query });
      return result.records.map(record => this.mapNodeToContact(record.get('c').properties));
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
  
  private mapNodeToContact(node: any): OCreamContactEntity {
    return ContactOntology.createOCreamContact({
        id: node.id,
        firstName: node.firstName,
        lastName: node.lastName,
        email: node.email,
        phone: node.phone,
        title: node.title,
        organizationId: node.organizationId,
    });
  }
} 