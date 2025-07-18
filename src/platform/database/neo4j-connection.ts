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
  private database: string;

  constructor() {
    this.uri = process.env.NEO4J_URI!;
    this.user = process.env.NEO4J_USERNAME!;
    this.pass = process.env.NEO4J_PASSWORD!;
    // Always respect inline environment variable, fallback to .env or 'neo4j'
    this.database = process.env.NEO4J_DATABASE ?? 'neo4j';
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
      
      // Ensure database exists
      await this.ensureDatabaseExists();
      
      logger.info(`✅ Successfully connected to Neo4j database: ${this.database}`);
    } catch (error) {
      logger.error('❌ Failed to connect to Neo4j:', error);
      this.driver = null; // Ensure driver is null on failure
      throw new Error(`Neo4j connection failed: ${error}`);
    }
  }

  private async ensureDatabaseExists(): Promise<void> {
    if (this.database === 'neo4j') {
      // Default database always exists
      return;
    }

    const session = this.driver!.session({ database: 'system' });
    try {
      // Check if database exists
      const result = await session.run(
        'SHOW DATABASES YIELD name WHERE name = $name',
        { name: this.database }
      );

      if (result.records.length === 0) {
        logger.info(`🗄️ Creating database: ${this.database}`);
        await session.run(`CREATE DATABASE \`${this.database}\``);
        logger.info(`✅ Database ${this.database} created successfully`);
        
        // Wait for database to be fully initialized
        logger.info(`⏱️ Waiting for database ${this.database} to be ready...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        logger.info(`✅ Database ${this.database} is ready`);
      } else {
        logger.info(`✅ Database ${this.database} already exists`);
      }
    } catch (error) {
      logger.error(`❌ Failed to create database ${this.database}:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  public getDriver(): Driver {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized. Call connect() first.');
    }
    return this.driver;
  }

  public getSession(database?: string): Session {
    const targetDatabase = database || this.database;
    return this.getDriver().session({ database: targetDatabase });
  }

  public getDatabase(): string {
    return this.database;
  }

  public async switchDatabase(database: string): Promise<void> {
    if (database === this.database) {
      return; // Already using the requested database
    }

    // Verify the database exists
    const session = this.getDriver().session({ database: 'system' });
    try {
      const result = await session.run(
        'SHOW DATABASES YIELD name WHERE name = $name',
        { name: database }
      );

      if (result.records.length === 0) {
        throw new Error(`Database '${database}' does not exist`);
      }
    } finally {
      await session.close();
    }

    // Update the current database
    this.database = database;
    logger.info(`🔄 Switched to database: ${this.database}`);
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

      logger.info(`🏗️ Neo4j schema initialized dynamically for ${entityTypes.length} entity types in database: ${this.database}`);
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
      logger.info(`🧹 Database ${this.database} cleared`);
    } catch (error) {
      logger.error('❌ Failed to clear database:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async listDatabases(): Promise<string[]> {
    const session = this.driver!.session({ database: 'system' });
    try {
      const result = await session.run('SHOW DATABASES YIELD name');
      return result.records.map(record => record.get('name'));
    } catch (error) {
      logger.error('❌ Failed to list databases:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async dropDatabase(databaseName: string): Promise<void> {
    if (databaseName === 'neo4j' || databaseName === 'system') {
      throw new Error('Cannot drop system databases');
    }

    const session = this.driver!.session({ database: 'system' });
    try {
      logger.info(`🗑️ Dropping database: ${databaseName}`);
      await session.run(`DROP DATABASE \`${databaseName}\` IF EXISTS`);
      logger.info(`✅ Database ${databaseName} dropped successfully`);
    } catch (error) {
      logger.error(`❌ Failed to drop database ${databaseName}:`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Perform a cosine-similarity vector search in the Organization index.
   * Returns the top-scoring node if the score exceeds the threshold; otherwise undefined.
   */
  async findSimilarOrganizationEmbedding(embedding: number[], threshold = 0.9) {
    const session = this.getSession();
    const indexName = 'organization_embeddings';
    try {
      const result = await session.run(
        `CALL db.index.vector.queryNodes($indexName, 1, $embedding) YIELD node, score RETURN node, score`,
        { indexName, embedding }
      );
      if (result.records.length === 0) return undefined;
      const score = result.records[0].get('score');
      if (score < threshold) return undefined;
      return result.records[0].get('node');
    } catch (err: any) {
      if (err.code === 'Neo.ClientError.Procedure.ProcedureCallFailed') {
        logger.warn(`Vector search skipped – index '${indexName}' not found.`);
        return undefined;
      }
      logger.error('❌ Vector similarity search failed:', err);
      return undefined;
    } finally {
      await session.close();
    }
  }
} 