// O-CREAM-v2 Enhanced Neo4j Contact Repository
// Leverages ontological structure for advanced graph operations

import * as neo4j from 'neo4j-driver';
import { Neo4jConnection } from '../database/neo4j-connection';
import { ContactRepository, PaginationOptions } from '../../domain/repositories/contact-repository';
import { Contact } from '../../domain/entities/contact';

export class Neo4jOCreamContactRepository implements ContactRepository {
  private driver: neo4j.Driver;

  constructor() {
    this.driver = Neo4jConnection.getInstance().getDriver();
  }

  async save(contact: Contact): Promise<Contact> {
    const session = this.driver.session();
    try {
      await session.run(
        'MERGE (c:Contact {id: $id}) SET c.name = $name, c.email = $email, c.organizationId = $organizationId, c.phone = $phone',
        {
          id: contact.getId(),
          name: contact.getName(),
          email: contact.getEmail(),
          organizationId: contact.organizationId,
          phone: contact.getPhone()
        }
      );
      return contact;
    } finally {
      await session.close();
    }
  }

  async findById(id: string): Promise<Contact | undefined> {
    const session = this.driver.session();
    try {
      const result = await session.run('MATCH (c:Contact {id: $id}) RETURN c', { id });
      const record = result.records[0];
      if (!record) return undefined;
      const node = record.get('c').properties;
      return new Contact({ id: node.id, name: node.name, email: node.email, organizationId: node.organizationId, phone: node.phone });
    } finally {
      await session.close();
    }
  }

  async findAll(options?: PaginationOptions): Promise<Contact[]> {
    const session = this.driver.session();
    try {
      const result = await session.run('MATCH (c:Contact) RETURN c');
      return result.records.map(record => {
        const node = record.get('c').properties;
        return new Contact({ id: node.id, name: node.name, email: node.email, organizationId: node.organizationId, phone: node.phone });
      });
    } finally {
      await session.close();
    }
  }

  async findByEmail(email: string): Promise<Contact | undefined> {
    const session = this.driver.session();
    try {
      const result = await session.run('MATCH (c:Contact {email: $email}) RETURN c', { email });
      const record = result.records[0];
      if (!record) return undefined;
      const node = record.get('c').properties;
      return new Contact({ id: node.id, name: node.name, email: node.email, organizationId: node.organizationId, phone: node.phone });
    } finally {
      await session.close();
    }
  }

  async findByOrganizationId(organizationId: string): Promise<Contact[]> {
     const session = this.driver.session();
    try {
      const result = await session.run('MATCH (c:Contact {organizationId: $organizationId}) RETURN c', { organizationId });
      return result.records.map(record => {
        const node = record.get('c').properties;
        return new Contact({ id: node.id, name: node.name, email: node.email, organizationId: node.organizationId, phone: node.phone });
      });
    } finally {
      await session.close();
    }
  }

  async search(query: string): Promise<Contact[]> {
    const session = this.driver.session();
    try {
      const result = await session.run('MATCH (c:Contact) WHERE c.name CONTAINS $query OR c.email CONTAINS $query RETURN c', { query });
      return result.records.map(record => {
        const node = record.get('c').properties;
        return new Contact({ id: node.id, name: node.name, email: node.email, organizationId: node.organizationId, phone: node.phone });
      });
    } finally {
      await session.close();
    }
  }

  async delete(id: string): Promise<boolean> {
    const session = this.driver.session();
    try {
      const result = await session.run('MATCH (c:Contact {id: $id}) DETACH DELETE c', { id });
      return result.summary.counters.updates().nodesDeleted > 0;
    } finally {
      await session.close();
    }
  }

  async count(): Promise<number> {
    const session = this.driver.session();
    try {
      const result = await session.run('MATCH (c:Contact) RETURN count(c) as count');
      return result.records[0]?.get('count').toNumber() || 0;
    } finally {
      await session.close();
    }
  }

  async exists(id: string): Promise<boolean> {
    const session = this.driver.session();
    try {
      const result = await session.run('MATCH (c:Contact {id: $id}) RETURN count(c) > 0 as exists', { id });
      return result.records[0]?.get('exists') || false;
    } finally {
      await session.close();
    }
  }
} 