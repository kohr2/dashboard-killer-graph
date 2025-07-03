import { injectable, inject } from 'tsyringe';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { ContactOntology, OCreamContactEntity } from '../../domain/entities/contact-ontology';
import { ContactRepository } from '../../repositories/contact-repository';
import { Session, Record as Neo4jRecord } from 'neo4j-driver';

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
export class Neo4jContactRepository implements ContactRepository {
  constructor(@inject(Neo4jConnection) private connection: Neo4jConnection) {}

  private nodeToContactDTO(node: any): ContactDTO {
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

  async save(contact: ContactDTO): Promise<ContactDTO> {
    const session = this.connection.getSession();
    try {
      const cypherQuery = `
        MERGE (c:Contact {id: $id})
        SET c += $props, c.updatedAt = timestamp()
        ON CREATE SET c.createdAt = timestamp()
        RETURN c
      `;
      
      const result = await session.run(cypherQuery, {
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
        },
      });

      const singleRecord = result.records[0];
      const contactNode = singleRecord.get('c').properties;

      return this.nodeToContactDTO(contactNode);
    } finally {
      await session.close();
    }
  }

  async findById(id: string): Promise<ContactDTO | null> {
    const session = this.connection.getSession();
    try {
      const result = await session.run('MATCH (c:Contact {id: $id}) RETURN c', { id });

      if (result.records.length === 0) {
        return null;
      }

      const singleRecord = result.records[0];
      const contactNode = singleRecord.get('c').properties;

      return this.nodeToContactDTO(contactNode);
    } finally {
      await session.close();
    }
  }

  async findAll(): Promise<ContactDTO[]> {
    const session = this.connection.getSession();
    try {
      const result = await session.run('MATCH (c:Contact) RETURN c');

      return result.records.map((record: Neo4jRecord) => {
        const contactNode = record.get('c').properties;
        return this.nodeToContactDTO(contactNode);
      });
    } finally {
      await session.close();
    }
  }

  async findByEmail(email: string): Promise<ContactDTO | null> {
    const session = this.connection.getSession();
    try {
      const result = await session.run('MATCH (c:Contact {email: $email}) RETURN c', {
        email,
      });

      if (result.records.length === 0) {
        return null;
      }

      const singleRecord = result.records[0];
      const contactNode = singleRecord.get('c').properties;

      return this.nodeToContactDTO(contactNode);
    } finally {
      await session.close();
    }
  }

  async search(query: string): Promise<ContactDTO[]> {
    const session = this.connection.getSession();
    try {
      const result = await session.run(
        'MATCH (c:Contact) WHERE c.name CONTAINS $term OR c.email CONTAINS $term RETURN c',
        { term: query },
      );
      return result.records.map((record: Neo4jRecord) => {
        const contactNode = record.get('c').properties;
        return this.nodeToContactDTO(contactNode);
      });
    } finally {
      await session.close();
    }
  }

  async delete(id: string): Promise<void> {
    const session = this.connection.getSession();
    try {
      await session.run('MATCH (c:Contact {id: $id}) DETACH DELETE c', { id });
    } finally {
      await session.close();
    }
  }

  async count(): Promise<number> {
    const session = this.connection.getSession();
    try {
      const result = await session.run('MATCH (c:Contact) RETURN count(c) as count');
      return result.records[0].get('count').toNumber();
    } finally {
      await session.close();
    }
  }

  public async addEmailToContact(contactId: string, email: string): Promise<void> {
    const session = this.connection.getSession();
    try {
      await session.run(
        `
        MATCH (c:Contact {id: $contactId})
        SET c.additionalEmails = CASE
          WHEN c.additionalEmails IS NULL THEN [$email]
          WHEN NOT $email IN c.additionalEmails THEN c.additionalEmails + $email
          ELSE c.additionalEmails
        END
        SET c.updatedAt = datetime()
        `,
        { contactId, email }
      );
    } finally {
      await session.close();
    }
  }
}