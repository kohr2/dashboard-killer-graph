// O-CREAM-v2 Enhanced Neo4j Contact Repository
// Leverages ontological structure for advanced graph operations

import * as neo4j from 'neo4j-driver';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { ContactRepository } from '@crm/domain/repositories/contact-repository';
import {
  OCreamContactEntity,
  ContactOntology,
} from '@crm/domain/entities/contact-ontology';

export class Neo4jOCreamContactRepository implements ContactRepository {
  private driver: neo4j.Driver;

  constructor() {
    this.driver = Neo4jConnection.getInstance().getDriver();
  }

  async save(contact: OCreamContactEntity): Promise<OCreamContactEntity> {
    const session = this.driver.session();
    try {
      await session.run(
        'MERGE (c:Contact {id: $id}) SET c += $props',
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
    const session = this.driver.session();
    try {
      const result = await session.run('MATCH (c:Contact {id: $id}) RETURN c', { id });
      const record = result.records[0];
      if (!record) return null;
      const node = record.get('c').properties;
      return this.mapNodeToContact(node);
    } finally {
      await session.close();
    }
  }

  async findAll(): Promise<OCreamContactEntity[]> {
    const session = this.driver.session();
    try {
      const result = await session.run('MATCH (c:Contact) RETURN c');
      return result.records.map(record => this.mapNodeToContact(record.get('c').properties));
    } finally {
      await session.close();
    }
  }

  async findByEmail(email: string): Promise<OCreamContactEntity | null> {
    const session = this.driver.session();
    try {
      const result = await session.run('MATCH (c:Contact {email: $email}) RETURN c', { email });
      const record = result.records[0];
      if (!record) return null;
      return this.mapNodeToContact(record.get('c').properties);
    } finally {
      await session.close();
    }
  }

  async search(query: any): Promise<OCreamContactEntity[]> {
    const session = this.driver.session();
    try {
      const result = await session.run('MATCH (c:Contact) WHERE c.name CONTAINS $query OR c.email CONTAINS $query RETURN c', { query });
      return result.records.map(record => this.mapNodeToContact(record.get('c').properties));
    } finally {
      await session.close();
    }
  }

  async delete(id: string): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run('MATCH (c:Contact {id: $id}) DETACH DELETE c', { id });
    } finally {
      await session.close();
    }
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