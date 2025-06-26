// Neo4j Knowledge Graph Connection Manager
// Manages connections to the Neo4j graph database

import neo4j, { Driver, Session } from 'neo4j-driver';
import { config } from 'dotenv';

config(); // Make sure environment variables are loaded

export class Neo4jConnection {
  private static instance: Neo4jConnection;
  private driver: Driver | null = null;
  private readonly uri: string;
  private readonly user: string;
  private readonly pass: string;

  private constructor() {
    this.uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    this.user = process.env.NEO4J_USERNAME || 'neo4j';
    this.pass = process.env.NEO4J_PASSWORD || 'password';
  }

  public static getInstance(): Neo4jConnection {
    if (!Neo4jConnection.instance) {
      Neo4jConnection.instance = new Neo4jConnection();
    }
    return Neo4jConnection.instance;
  }

  public async connect(): Promise<void> {
    try {
      this.driver = neo4j.driver(this.uri, neo4j.auth.basic(this.user, this.pass));
      await this.driver.verifyConnectivity();
      console.log('✅ Successfully connected to Neo4j.');
    } catch (error) {
      console.error('❌ Failed to connect to Neo4j:', error);
      throw new Error(`Neo4j connection failed: ${error}`);
    }
  }

  public getDriver(): Driver {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized. Call connect() first.');
    }
    return this.driver;
  }

  public getSession(): Session {
    return this.getDriver().session();
  }

  public async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      console.log('Neo4j connection closed.');
    }
  }

  async initializeSchema(): Promise<void> {
    const session = this.getSession();
    
    try {
      // Create constraints and indexes for optimal performance
      await session.run(`
        CREATE CONSTRAINT contact_id_unique IF NOT EXISTS
        FOR (c:Contact) REQUIRE c.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT organization_id_unique IF NOT EXISTS
        FOR (o:Organization) REQUIRE o.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT communication_id_unique IF NOT EXISTS
        FOR (comm:Communication) REQUIRE comm.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT task_id_unique IF NOT EXISTS
        FOR (t:Task) REQUIRE t.id IS UNIQUE
      `);

      // Create indexes for frequently queried properties
      await session.run(`
        CREATE INDEX contact_email_index IF NOT EXISTS
        FOR (c:Contact) ON (c.email)
      `);

      await session.run(`
        CREATE INDEX organization_name_index IF NOT EXISTS
        FOR (o:Organization) ON (o.name)
      `);

      await session.run(`
        CREATE INDEX task_status_index IF NOT EXISTS
        FOR (t:Task) ON (t.status)
      `);

      await session.run(`
        CREATE INDEX task_priority_index IF NOT EXISTS
        FOR (t:Task) ON (t.priority)
      `);

      // Create vector index for email embeddings
      await session.run(`
        CREATE VECTOR INDEX \`communication-embeddings\` IF NOT EXISTS
        FOR (c:Communication) ON (c.embedding)
        OPTIONS { indexConfig: {
          \`vector.dimensions\`: 384,
          \`vector.similarity_function\`: 'cosine'
        }}
      `);

      console.log('🏗️ Neo4j schema initialized with constraints and indexes');
    } catch (error) {
      console.error('❌ Schema initialization failed:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async clearDatabase(): Promise<void> {
    const session = this.getSession();
    
    try {
      await session.run('MATCH (n) DETACH DELETE n');
      console.log('🧹 Database cleared');
    } catch (error) {
      console.error('❌ Failed to clear database:', error);
      throw error;
    } finally {
      await session.close();
    }
  }
} 