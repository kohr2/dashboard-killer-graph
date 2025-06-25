// Neo4j Graph Builder
// Populates a Neo4j database from an entity-relationship graph JSON file

import neo4j, { Driver, Session, AuthToken } from 'neo4j-driver';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Neo4j connection details (use environment variables in production)
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://127.0.0.1:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'fiboocream';
const NEO4J_DATABASE = process.env.NEO4J_DATABASE || 'neo4j';

const GRAPH_FILE_PATH = join(__dirname, '../hybrid-extraction-report.json');

// Define O-CREAM and FIBO entity types
const OCREAM_TYPES = ['PERSON_NAME', 'COMPANY_NAME'];
const FIBO_TYPES = ['FINANCIAL_INSTITUTION', 'FINANCIAL_INSTRUMENT', 'TRANSACTION'];

// Mapping from primitive types to O-CREAM entity labels
const PRIMITIVE_TO_OCREAM_MAP: Record<string, string> = {
  'PERSON_NAME': 'Contact',
  'COMPANY_NAME': 'Organization',
};

class Neo4jGraphBuilder {
  private driver: Driver;

  constructor(uri: string, auth: AuthToken) {
    this.driver = neo4j.driver(uri, auth);
  }

  public async buildGraphFromJSON(filePath: string): Promise<any> {
    console.log(`🧠 Reading graph data from: ${filePath}`);
    const hybridReport = JSON.parse(readFileSync(filePath, 'utf8'));
    
    const nodes = hybridReport.mergedEntities.map((e: any) => ({
      id: e.value.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      value: e.value,
      type: e.type,
      source: e.source,
      details: e.details,
    }));
    
    const edges = hybridReport.llmResults.relationships.map((r: any) => ({
      from: r.source.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      to: r.target.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      label: r.type,
      properties: {
        explanation: r.explanation,
        confidence: r.confidence,
      }
    }));

    console.log(`   ✅ Found ${nodes.length} nodes and ${edges.length} relationships`);

    const session = this.getSession();
    
    try {
      console.log('🔗 Connecting to Neo4j...');
      await this.verifyConnection();
      console.log('   ✅ Connection successful');

      // 1. Clean the database
      console.log('\n🗑️  Cleaning the database...');
      await this.cleanDatabase(session);
      console.log('   ✅ Database cleaned');

      // 2. Create constraints for performance
      console.log('\n🔧 Creating constraints and indexes...');
      await this.createConstraints(session);
      console.log('   ✅ Constraints created');
      
      // 3. Ingest nodes
      console.log('\n📥 Ingesting nodes...');
      await this.ingestNodes(session, nodes);
      console.log(`   ✅ Ingested ${nodes.length} nodes`);

      // 4. Ingest relationships
      console.log('\n📥 Ingesting relationships...');
      const edgeCount = await this.ingestRelationships(session, edges);
      console.log(`   ✅ Ingested ${edgeCount} relationships`);

      // 5. Remove generic Entity label
      console.log('\n🏷️  Removing generic :Entity labels...');
      await this.removeEntityLabel(session);
      console.log('   ✅ Generic labels removed.');

      // 6. Log graph statistics
      const graphStats = await this.getGraphStatistics(session);
      console.log('\n📊 Neo4j Graph Statistics:');
      console.log(`   • Total Nodes: ${graphStats.nodeCount}`);
      console.log(`   • Total Relationships: ${graphStats.relationshipCount}`);
      console.log(`   • Node Labels: ${graphStats.labels.join(', ')}`);
      console.log(`   • Relationship Types: ${graphStats.relationshipTypes.join(', ')}`);

      return {
        success: true,
        message: 'Graph built successfully',
        stats: graphStats
      };
      
    } catch (error) {
      console.error('❌ Error building graph:', error);
      return { success: false, message: 'Graph building failed', error };
    } finally {
      await session.close();
    }
  }
  
  private getSession(): Session {
    return this.driver.session({ database: NEO4J_DATABASE });
  }

  private async verifyConnection(): Promise<void> {
    await this.driver.verifyConnectivity();
  }

  private async cleanDatabase(session: Session): Promise<void> {
    await session.run('MATCH (n) DETACH DELETE n');
  }

  private async createConstraints(session: Session): Promise<void> {
    // Unique constraint on entity ID (value + type) for performance
    await session.run('CREATE CONSTRAINT IF NOT EXISTS FOR (n:Entity) REQUIRE n.id IS UNIQUE');
    
    // Create indexes for faster lookups
    await session.run('CREATE INDEX IF NOT EXISTS FOR (n:Entity) ON (n.type)');
    await session.run('CREATE INDEX IF NOT EXISTS FOR (n:Entity) ON (n.value)');
    await session.run('CREATE INDEX IF NOT EXISTS FOR (n:PERSON_NAME) ON (n.value)');
    await session.run('CREATE INDEX IF NOT EXISTS FOR (n:COMPANY_NAME) ON (n.value)');

    await session.run('CREATE CONSTRAINT IF NOT EXISTS FOR (n:Contact) REQUIRE n.id IS UNIQUE');
    await session.run('CREATE CONSTRAINT IF NOT EXISTS FOR (n:Organization) REQUIRE n.id IS UNIQUE');
    await session.run('CREATE CONSTRAINT IF NOT EXISTS FOR (n:FinancialInstrument) REQUIRE n.id IS UNIQUE');
    
    // Create indexes for faster lookups
    await session.run('CREATE INDEX IF NOT EXISTS FOR (n:Contact) ON (n.name)');
    await session.run('CREATE INDEX IF NOT EXISTS FOR (n:Organization) ON (n.name)');
  }

  private async ingestNodes(session: Session, nodes: any[]): Promise<void> {
    for (const node of nodes) {
      // Use a generic :Entity label and add a more specific one
      const specificLabel = node.type.replace(/\s+/g, '_');
      await session.run(
        `
        MERGE (n:Entity {id: $id})
        ON CREATE SET 
          n.value = $value,
          n.type = $type,
          n.source = $source,
          n.created = timestamp()
        ON MATCH SET
          n.value = $value,
          n.type = $type,
          n.source = $source,
          n.updated = timestamp()
        SET n += $details
        SET n:${specificLabel}
        `,
        {
          id: node.id,
          value: node.value,
          type: node.type,
          source: node.source,
          details: node.details || {},
        }
      );
    }
  }
  
  private async ingestRelationships(session: Session, edges: any[]): Promise<number> {
    let createdCount = 0;
    
    for (const edge of edges) {
      if (!edge.label) {
        console.warn(`   ⚠️  Skipping relationship with no label:`, edge);
        continue;
      }
      const relType = edge.label.replace(/\s+/g, '_').toUpperCase();
      const result = await session.run(
        `
        MATCH (s:Entity {id: $from})
        MATCH (t:Entity {id: $to})
        MERGE (s)-[r:${relType}]->(t)
        SET r += $properties
        RETURN r
        `,
        { from: edge.from, to: edge.to, properties: edge.properties }
      );
      if (result.records.length > 0) {
        createdCount++;
      }
    }
    return createdCount;
  }

  private async removeEntityLabel(session: Session): Promise<void> {
    await session.run('MATCH (n:Entity) REMOVE n:Entity');
  }

  private async getGraphStatistics(session: Session): Promise<any> {
    // Add a small delay to allow schema changes to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const nodeCountResult = await session.run('MATCH (n) RETURN count(n) as count');
    const relationshipCountResult = await session.run('MATCH ()-[r]->() RETURN count(r) as count');
    const labelsResult = await session.run('MATCH (n) UNWIND labels(n) as label RETURN collect(distinct label) as labels');
    const relationshipTypesResult = await session.run('CALL db.relationshipTypes()');
    
    return {
      nodeCount: nodeCountResult.records[0].get('count').toNumber(),
      relationshipCount: relationshipCountResult.records[0].get('count').toNumber(),
      labels: labelsResult.records[0].get('labels'),
      relationshipTypes: relationshipTypesResult.records.map(r => r.get('relationshipType'))
    };
  }

  public async close(): Promise<void> {
    await this.driver.close();
  }
}

async function buildNeo4jGraph() {
  console.log('🚀 Neo4j Graph Builder Initialized');
  console.log(`   URI: ${NEO4J_URI}`);
  console.log(`   User: ${NEO4J_USER}`);
  console.log(`   Database: ${NEO4J_DATABASE}`);
  
  const builder = new Neo4jGraphBuilder(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
  );
  
  try {
    const result = await builder.buildGraphFromJSON(GRAPH_FILE_PATH);
    
    if (result.success) {
      console.log('\n🎉 Graph built successfully in Neo4j!');
      console.log('   You can now explore the graph in the Neo4j Browser.');
      console.log('\n🔍 Sample Cypher Queries:');
      console.log('   // Show all entities and relationships');
      console.log('   MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 25');
      console.log('\n   // Find all people and their relationships');
      console.log('   MATCH (p:Contact)-[r]-(e) RETURN p, r, e');
      console.log('\n   // Show the Goldman Sachs network');
      console.log('   MATCH (gs:Organization {name: "Goldman Sachs"})-[r*1..2]-(related) RETURN gs, r, related');
    }
    
  } catch (error) {
    console.error('❌ Failed to build Neo4j graph:', error);
  } finally {
    await builder.close();
    console.log('\n🔗 Connection to Neo4j closed.');
  }
}

if (require.main === module) {
  buildNeo4jGraph().catch(console.error);
}

export { Neo4jGraphBuilder }; 