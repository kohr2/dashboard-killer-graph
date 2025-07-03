// Neo4j Knowledge Graph Connection Manager
// Manages connections to the Neo4j graph database

import neo4j, { Driver, Session } from 'neo4j-driver';
import { config } from 'dotenv';
import { logger } from '@shared/utils/logger';
import { container, singleton } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';

config(); // Make sure environment variables are loaded

@singleton()
export class Neo4jConnection {
  private driver: Driver | null = null;
  private readonly uri: string;
  private readonly user: string;
  private readonly pass: string;

  constructor() {
    this.uri = process.env.NEO4J_URI!;
    this.user = process.env.NEO4J_USERNAME!;
    this.pass = process.env.NEO4J_PASSWORD!;
  }

  public async connect(): Promise<void> {
    // Only create a new driver instance if one doesn't already exist or has been closed.
    if (this.driver) {
      // You might want to add a connectivity check here in a real app,
      // but for now, just returning is fine if the driver exists.
      return;
    }

    try {
      this.driver = neo4j.driver(this.uri, neo4j.auth.basic(this.user, this.pass));
      await this.driver.verifyConnectivity();
      logger.info('✅ Successfully connected to Neo4j.');
    } catch (error) {
      logger.error('❌ Failed to connect to Neo4j:', error);
      this.driver = null; // Ensure driver is null on failure
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
      logger.info('Neo4j connection closed.');
    }
  }

  async initializeSchema(): Promise<void> {
    const session = this.getSession();
    try {
      const ontologyService = container.resolve(OntologyService);
      const entityTypes: string[] = ontologyService.getAllEntityTypes();
      const vectorTypes: string[] = ontologyService.getIndexableEntityTypes();

      // Create uniqueness constraints on id for every entity type
      for (const label of entityTypes) {
        const constraintQuery = `CREATE CONSTRAINT ${label.toLowerCase()}_id_unique IF NOT EXISTS FOR (n:\`${label}\`) REQUIRE n.id IS UNIQUE`;
        await session.run(constraintQuery);
      }

      // Create vector index on embedding for indexable entity types
      for (const label of vectorTypes) {
        const vectorQuery = `CREATE VECTOR INDEX \`${label.toLowerCase()}_embeddings\` IF NOT EXISTS FOR (n:\`${label}\`) ON (n.embedding) OPTIONS { indexConfig: { \`vector.dimensions\`: 384, \`vector.similarity_function\`: 'cosine' }}`;
        await session.run(vectorQuery);
      }

      logger.info(`🏗️ Neo4j schema initialized dynamically for ${entityTypes.length} entity types`);
    } catch (error) {
      logger.error('❌ Schema initialization failed:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async clearDatabase(): Promise<void> {
    const session = this.getSession();
    
    try {
      await session.run('MATCH (n) DETACH DELETE n');
      logger.info('🧹 Database cleared');
    } catch (error) {
      logger.error('❌ Failed to clear database:', error);
      throw error;
    } finally {
      await session.close();
    }
  }
} 