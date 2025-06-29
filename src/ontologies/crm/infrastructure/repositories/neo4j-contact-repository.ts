import { injectable, inject } from 'tsyringe';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { ContactOntology, OCreamContactEntity } from '../../domain/entities/contact-ontology';
import { ContactRepository } from '../../domain/repositories/contact-repository';
import { Session, Record as Neo4jRecord } from 'neo4j-driver';

@injectable()
export class Neo4jContactRepository implements ContactRepository {
  constructor(@inject(Neo4jConnection) private connection: Neo4jConnection) {}

  private nodeToContact(node: any): OCreamContactEntity {
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

  async save(contact: OCreamContactEntity): Promise<OCreamContactEntity> {
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
          email: contact.personalInfo.email,
          organizationId: contact.organizationId,
          phone: contact.personalInfo.phone,
          title: contact.personalInfo.title,
          firstName: contact.personalInfo.firstName,
          lastName: contact.personalInfo.lastName,
          description: contact.description,
        },
      });

      const singleRecord = result.records[0];
      const contactNode = singleRecord.get('c').properties;

      return this.nodeToContact(contactNode);
    } finally {
      await session.close();
    }
  }

  async findById(id: string): Promise<OCreamContactEntity | null> {
    const session = this.connection.getSession();
    try {
      const result = await session.run('MATCH (c:Contact {id: $id}) RETURN c', { id });

      if (result.records.length === 0) {
        return null;
      }

      const singleRecord = result.records[0];
      const contactNode = singleRecord.get('c').properties;

      return this.nodeToContact(contactNode);
    } finally {
      await session.close();
    }
  }

  async findAll(): Promise<OCreamContactEntity[]> {
    const session = this.connection.getSession();
    try {
      const result = await session.run('MATCH (c:Contact) RETURN c');

      return result.records.map((record: Neo4jRecord) => {
        const contactNode = record.get('c').properties;
        return this.nodeToContact(contactNode);
      });
    } finally {
      await session.close();
    }
  }

  async findByEmail(email: string): Promise<OCreamContactEntity | null> {
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

      return this.nodeToContact(contactNode);
    } finally {
      await session.close();
    }
  }

  async search(query: string): Promise<OCreamContactEntity[]> {
    const session = this.connection.getSession();
    try {
      const result = await session.run(
        'MATCH (c:Contact) WHERE c.name CONTAINS $term OR c.email CONTAINS $term RETURN c',
        { term: query },
      );
      return result.records.map((record: Neo4jRecord) => {
        const contactNode = record.get('c').properties;
        return this.nodeToContact(contactNode);
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