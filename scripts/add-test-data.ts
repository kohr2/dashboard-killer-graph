import 'tsconfig-paths/register';
import 'reflect-metadata';
import { container } from 'tsyringe';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { logger } from '@shared/utils/logger';

async function addTestData() {
  const neo4j = container.resolve(Neo4jConnection);
  
  try {
    await neo4j.connect();
    logger.info('✅ Connected to Neo4j');
    
    const session = neo4j.getSession();
    
    // Clear existing test data
    await session.run('MATCH (n) WHERE n.id STARTS WITH "org-" OR n.id STARTS WITH "contact-" OR n.id STARTS WITH "deal-" DETACH DELETE n');
    logger.info('🧹 Cleared existing test data');
    
    // Create Organizations
    await session.run(`
      CREATE (org1:Organization {
        id: 'org-001', 
        name: 'Microsoft Corporation', 
        type: 'Technology Company',
        sector: 'Technology',
        country: 'USA'
      })
      CREATE (org2:Organization {
        id: 'org-002', 
        name: 'Apple Inc', 
        type: 'Technology Company',
        sector: 'Technology', 
        country: 'USA'
      })
      CREATE (org3:Organization {
        id: 'org-003', 
        name: 'BlueOwl Capital', 
        type: 'Investment Firm',
        sector: 'Finance',
        country: 'USA'
      })
    `);
    
    // Create Contacts
    await session.run(`
      CREATE (contact1:Contact {
        id: 'contact-001',
        name: 'John Smith',
        firstName: 'John',
        lastName: 'Smith', 
        email: 'john.smith@microsoft.com',
        title: 'VP of Sales'
      })
      CREATE (contact2:Contact {
        id: 'contact-002',
        name: 'Lisa Johnson', 
        firstName: 'Lisa',
        lastName: 'Johnson',
        email: 'lisa.j@apple.com',
        title: 'Product Manager'
      })
    `);
    
    // Create Deals
    await session.run(`
      CREATE (deal1:Deal {
        id: 'deal-001',
        name: 'Microsoft Partnership Deal',
        amount: 5000000,
        status: 'Active',
        stage: 'Negotiation'
      })
      CREATE (deal2:Deal {
        id: 'deal-002', 
        name: 'Apple Investment',
        amount: 10000000,
        status: 'Closed',
        stage: 'Completed'
      })
    `);
    
    // Create relationships
    await session.run(`
      MATCH (contact1:Contact {id: 'contact-001'}), (org1:Organization {id: 'org-001'})
      MATCH (contact2:Contact {id: 'contact-002'}), (org2:Organization {id: 'org-002'})  
      MATCH (deal1:Deal {id: 'deal-001'}), (deal2:Deal {id: 'deal-002'})
      MATCH (org3:Organization {id: 'org-003'})
      CREATE (contact1)-[:WORKS_FOR]->(org1)
      CREATE (contact2)-[:WORKS_FOR]->(org2)  
      CREATE (deal1)-[:INVOLVES]->(org1)
      CREATE (deal2)-[:INVOLVES]->(org2)
      CREATE (org3)-[:INVESTED_IN]->(deal2)
    `);
    
    await session.close();
    logger.info('✅ Test data added successfully');
    
    // Verify data
    const verifySession = neo4j.getSession();
    const result = await verifySession.run('MATCH (n) RETURN count(n) as totalNodes');
    const totalNodes = result.records[0].get('totalNodes').toNumber();
    await verifySession.close();
    
    logger.info(`🎯 Total nodes in database: ${totalNodes}`);
    
  } catch (error) {
    logger.error('❌ Error adding test data:', error);
  } finally {
    await neo4j.disconnect();
  }
}

if (require.main === module) {
  addTestData();
}
