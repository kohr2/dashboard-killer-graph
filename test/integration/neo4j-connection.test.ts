// Neo4j Knowledge Graph Integration Tests
// Tests the connection, schema initialization, and basic graph operations

import { Neo4jConnection } from '../../src/crm-core/infrastructure/database/neo4j-connection';
import { Neo4jContactRepository } from '../../src/crm-core/infrastructure/repositories/neo4j-contact-repository';
import { Contact } from '../../src/crm-core/domain/entities/contact';

describe('Neo4j Knowledge Graph Integration', () => {
  let connection: Neo4jConnection;
  let contactRepository: Neo4jContactRepository;

  beforeAll(async () => {
    connection = Neo4jConnection.getInstance();
    contactRepository = new Neo4jContactRepository();
    
    // Note: These tests require a running Neo4j instance
    // Skip if Neo4j is not available
    try {
      await connection.connect('bolt://localhost:7687', 'neo4j', 'password');
      await connection.initializeSchema();
    } catch (error) {
      console.log('⚠️  Neo4j not available - skipping integration tests');
      pending('Neo4j database not available for integration tests');
    }
  });

  afterAll(async () => {
    if (connection) {
      await connection.close();
    }
  });

  beforeEach(async () => {
    // Clear database before each test
    await connection.clearDatabase();
    await connection.initializeSchema();
  });

  describe('Connection Management', () => {
    it('should connect to Neo4j successfully', async () => {
      // Connection is established in beforeAll
      expect(connection).toBeDefined();
    });

    it('should initialize schema with constraints and indexes', async () => {
      // Schema initialization is done in beforeAll
      const session = connection.getSession();
      
      try {
        // Verify constraints exist
        const result = await session.run('SHOW CONSTRAINTS');
        const constraints = result.records.map(record => record.get('name'));
        
        expect(constraints).toContain('contact_id_unique');
        expect(constraints).toContain('organization_id_unique');
      } finally {
        await session.close();
      }
    });
  });

  describe('Contact Repository Graph Operations', () => {
    it('should save and retrieve a contact as a graph node', async () => {
      // Arrange
      const contact = new Contact({
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-123-4567'
      });

      // Act
      await contactRepository.save(contact);
      const retrieved = await contactRepository.findById(contact.getId());

      // Assert
      expect(retrieved).toBeDefined();
      expect(retrieved!.getName()).toBe('John Doe');
      expect(retrieved!.getEmail()).toBe('john.doe@example.com');
    });

    it('should handle contact-organization relationships', async () => {
      // Arrange
      const contact = new Contact({
        name: 'Jane Smith',
        email: 'jane.smith@techcorp.com'
      });
      await contactRepository.save(contact);

      // Create organization node directly
      const session = connection.getSession();
      const orgId = 'org-123';
      
      try {
        await session.run(`
          CREATE (o:Organization {
            id: $id,
            name: 'TechCorp',
            industry: 'Technology'
          })
        `, { id: orgId });

        // Act - Link contact to organization
        await contactRepository.linkToOrganization(contact.getId(), orgId, 'Software Engineer');

        // Verify relationship exists
        const result = await session.run(`
          MATCH (c:Contact {id: $contactId})-[r:WORKS_AT]->(o:Organization {id: $orgId})
          RETURN r.role as role
        `, { contactId: contact.getId(), orgId });

        // Assert
        expect(result.records).toHaveLength(1);
        expect(result.records[0].get('role')).toBe('Software Engineer');
      } finally {
        await session.close();
      }
    });

    it('should find contacts by organization using graph traversal', async () => {
      // Arrange - Create organization
      const session = connection.getSession();
      const orgId = 'startup-456';
      
      try {
        await session.run(`
          CREATE (o:Organization {
            id: $id,
            name: 'StartupCorp',
            size: 'Small'
          })
        `, { id: orgId });

        // Create and link multiple contacts
        const contact1 = new Contact({
          name: 'Alice Johnson',
          email: 'alice@startup.com'
        });
        const contact2 = new Contact({
          name: 'Bob Wilson',
          email: 'bob@startup.com'
        });

        await contactRepository.save(contact1);
        await contactRepository.save(contact2);
        await contactRepository.linkToOrganization(contact1.getId(), orgId);
        await contactRepository.linkToOrganization(contact2.getId(), orgId);

        // Act
        const orgContacts = await contactRepository.findByOrganizationId(orgId);

        // Assert
        expect(orgContacts).toHaveLength(2);
        expect(orgContacts.map(c => c.getName())).toContain('Alice Johnson');
        expect(orgContacts.map(c => c.getName())).toContain('Bob Wilson');
      } finally {
        await session.close();
      }
    });

    it('should perform graph-based search across relationships', async () => {
      // Arrange - Create a complex graph structure
      const session = connection.getSession();
      
      try {
        // Create nodes and relationships
        await session.run(`
          CREATE (c1:Contact {
            id: 'contact-1',
            name: 'Marketing Manager',
            email: 'marketing@corp.com'
          })
          CREATE (c2:Contact {
            id: 'contact-2', 
            name: 'Sales Director',
            email: 'sales@corp.com'
          })
          CREATE (o:Organization {
            id: 'big-corp',
            name: 'BigCorp Industries',
            industry: 'Manufacturing'
          })
          CREATE (c1)-[:WORKS_AT]->(o)
          CREATE (c2)-[:WORKS_AT]->(o)
        `);

        // Act - Search for contacts
        const results = await contactRepository.search('Marketing');

        // Assert
        expect(results).toHaveLength(1);
        expect(results[0].getName()).toBe('Marketing Manager');
      } finally {
        await session.close();
      }
    });
  });

  describe('Advanced Graph Queries', () => {
    it('should execute complex relationship queries', async () => {
      const session = connection.getSession();
      
      try {
        // Create a network of contacts, organizations, and communications
        await session.run(`
          CREATE (c1:Contact {id: 'c1', name: 'John Doe', email: 'john@test.com'})
          CREATE (c2:Contact {id: 'c2', name: 'Jane Smith', email: 'jane@test.com'})
          CREATE (o:Organization {id: 'o1', name: 'TestCorp', industry: 'Tech'})
          CREATE (comm:Communication {
            id: 'comm1',
            type: 'email',
            subject: 'Project Discussion',
            createdAt: datetime()
          })
          CREATE (c1)-[:WORKS_AT]->(o)
          CREATE (c2)-[:WORKS_AT]->(o)
          CREATE (c1)-[:PARTICIPANT_IN]->(comm)
          CREATE (c2)-[:PARTICIPANT_IN]->(comm)
        `);

        // Query: Find all contacts who have communicated with each other
        const result = await session.run(`
          MATCH (c1:Contact)-[:PARTICIPANT_IN]->(comm:Communication)<-[:PARTICIPANT_IN]-(c2:Contact)
          WHERE c1 <> c2
          RETURN c1.name as contact1, c2.name as contact2, comm.subject as about
        `);

        // Assert
        expect(result.records.length).toBeGreaterThan(0);
        const record = result.records[0];
        expect([record.get('contact1'), record.get('contact2')]).toContain('John Doe');
        expect([record.get('contact1'), record.get('contact2')]).toContain('Jane Smith');
      } finally {
        await session.close();
      }
    });
  });
}); 