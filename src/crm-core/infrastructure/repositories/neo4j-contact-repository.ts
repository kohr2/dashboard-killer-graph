// Neo4j Contact Repository Implementation
// Knowledge graph-based contact data access using Cypher queries

import { Contact } from '../../domain/entities/contact';
import { ContactRepository, PaginationOptions } from '../../domain/repositories/contact-repository';
import { Neo4jConnection } from '../database/neo4j-connection';
import { Session } from 'neo4j-driver';

export class Neo4jContactRepository implements ContactRepository {
  private connection: Neo4jConnection;

  constructor() {
    this.connection = Neo4jConnection.getInstance();
  }

  async save(contact: Contact): Promise<Contact> {
    const session = this.connection.getSession();
    
    try {
      const contactData = contact.toJSON();
      
      const query = `
        MERGE (c:Contact {id: $id})
        SET c.name = $name,
            c.email = $email,
            c.phone = $phone,
            c.createdAt = $createdAt,
            c.updatedAt = $updatedAt
        RETURN c
      `;

      await session.run(query, {
        id: contactData.id,
        name: contactData.name,
        email: contactData.email,
        phone: contactData.phone,
        createdAt: contactData.createdAt.toISOString(),
        updatedAt: contactData.updatedAt.toISOString()
      });

      return contact;
    } catch (error) {
      throw new Error(`Failed to save contact: ${error}`);
    } finally {
      await session.close();
    }
  }

  async findById(id: string): Promise<Contact | undefined> {
    const session = this.connection.getSession();
    
    try {
      const query = `
        MATCH (c:Contact {id: $id})
        RETURN c
      `;

      const result = await session.run(query, { id });
      
      if (result.records.length === 0) {
        return undefined;
      }

      const contactNode = result.records[0].get('c').properties;
      return this.nodeToContact(contactNode);
    } catch (error) {
      throw new Error(`Failed to find contact by ID: ${error}`);
    } finally {
      await session.close();
    }
  }

  async findAll(options?: PaginationOptions): Promise<Contact[]> {
    const session = this.connection.getSession();
    
    try {
      let query = `
        MATCH (c:Contact)
        RETURN c
        ORDER BY c.createdAt DESC
      `;

      if (options) {
        const skip = (options.page - 1) * options.limit;
        query += ` SKIP ${skip} LIMIT ${options.limit}`;
      }

      const result = await session.run(query);
      
      return result.records.map(record => {
        const contactNode = record.get('c').properties;
        return this.nodeToContact(contactNode);
      });
    } catch (error) {
      throw new Error(`Failed to find all contacts: ${error}`);
    } finally {
      await session.close();
    }
  }

  async delete(id: string): Promise<boolean> {
    const session = this.connection.getSession();
    
    try {
      const query = `
        MATCH (c:Contact {id: $id})
        DETACH DELETE c
        RETURN count(c) as deletedCount
      `;

      const result = await session.run(query, { id });
      const deletedCount = result.records[0].get('deletedCount').toNumber();
      
      return deletedCount > 0;
    } catch (error) {
      throw new Error(`Failed to delete contact: ${error}`);
    } finally {
      await session.close();
    }
  }

  async findByEmail(email: string): Promise<Contact | undefined> {
    const session = this.connection.getSession();
    
    try {
      const query = `
        MATCH (c:Contact {email: $email})
        RETURN c
      `;

      const result = await session.run(query, { email });
      
      if (result.records.length === 0) {
        return undefined;
      }

      const contactNode = result.records[0].get('c').properties;
      return this.nodeToContact(contactNode);
    } catch (error) {
      throw new Error(`Failed to find contact by email: ${error}`);
    } finally {
      await session.close();
    }
  }

  async findByOrganizationId(organizationId: string): Promise<Contact[]> {
    const session = this.connection.getSession();
    
    try {
      const query = `
        MATCH (c:Contact)-[:WORKS_AT]->(o:Organization {id: $organizationId})
        RETURN c
        ORDER BY c.name
      `;

      const result = await session.run(query, { organizationId });
      
      return result.records.map(record => {
        const contactNode = record.get('c').properties;
        return this.nodeToContact(contactNode);
      });
    } catch (error) {
      throw new Error(`Failed to find contacts by organization: ${error}`);
    } finally {
      await session.close();
    }
  }

  async search(query: string): Promise<Contact[]> {
    const session = this.connection.getSession();
    
    try {
      const cypherQuery = `
        MATCH (c:Contact)
        WHERE toLower(c.name) CONTAINS toLower($searchTerm)
           OR toLower(c.email) CONTAINS toLower($searchTerm)
        RETURN c
        ORDER BY c.name
        LIMIT 50
      `;

      const result = await session.run(cypherQuery, { searchTerm: query });
      
      return result.records.map(record => {
        const contactNode = record.get('c').properties;
        return this.nodeToContact(contactNode);
      });
    } catch (error) {
      throw new Error(`Failed to search contacts: ${error}`);
    } finally {
      await session.close();
    }
  }

  async count(): Promise<number> {
    const session = this.connection.getSession();
    
    try {
      const query = `
        MATCH (c:Contact)
        RETURN count(c) as total
      `;

      const result = await session.run(query);
      return result.records[0].get('total').toNumber();
    } catch (error) {
      throw new Error(`Failed to count contacts: ${error}`);
    } finally {
      await session.close();
    }
  }

  async exists(id: string): Promise<boolean> {
    const session = this.connection.getSession();
    
    try {
      const query = `
        MATCH (c:Contact {id: $id})
        RETURN count(c) > 0 as exists
      `;

      const result = await session.run(query, { id });
      return result.records[0].get('exists');
    } catch (error) {
      throw new Error(`Failed to check contact existence: ${error}`);
    } finally {
      await session.close();
    }
  }

  // Helper method to convert Neo4j node to Contact entity
  private nodeToContact(node: any): Contact {
    return new Contact({
      id: node.id,
      name: node.name,
      email: node.email,
      phone: node.phone
    });
  }

  // Graph-specific methods for relationship management
  async linkToOrganization(contactId: string, organizationId: string, role?: string): Promise<void> {
    const session = this.connection.getSession();
    
    try {
      const query = `
        MATCH (c:Contact {id: $contactId}), (o:Organization {id: $organizationId})
        MERGE (c)-[r:WORKS_AT]->(o)
        SET r.role = $role,
            r.createdAt = datetime()
      `;

      await session.run(query, { contactId, organizationId, role });
    } catch (error) {
      throw new Error(`Failed to link contact to organization: ${error}`);
    } finally {
      await session.close();
    }
  }

  async unlinkFromOrganization(contactId: string, organizationId: string): Promise<void> {
    const session = this.connection.getSession();
    
    try {
      const query = `
        MATCH (c:Contact {id: $contactId})-[r:WORKS_AT]->(o:Organization {id: $organizationId})
        DELETE r
      `;

      await session.run(query, { contactId, organizationId });
    } catch (error) {
      throw new Error(`Failed to unlink contact from organization: ${error}`);
    } finally {
      await session.close();
    }
  }
} 