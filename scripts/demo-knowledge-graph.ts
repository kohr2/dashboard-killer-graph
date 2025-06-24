// Knowledge Graph CRM Demo Script
// Demonstrates the power of graph-based CRM data modeling

import { Neo4jConnection } from '../src/crm-core/infrastructure/database/neo4j-connection';
import { Neo4jContactRepository } from '../src/crm-core/infrastructure/repositories/neo4j-contact-repository';
import { Contact } from '../src/crm-core/domain/entities/contact';
import { GraphQueries } from '../src/crm-core/infrastructure/database/graph-queries';

async function demonstrateKnowledgeGraph() {
  const connection = Neo4jConnection.getInstance();
  const contactRepo = new Neo4jContactRepository();

  try {
    console.log('🚀 Starting Knowledge Graph CRM Demo...\n');

    // Connect to Neo4j
    await connection.connect();
    await connection.clearDatabase();
    await connection.initializeSchema();

    console.log('✅ Connected to Neo4j Knowledge Graph\n');

    // Create sample data
    await createSampleData(connection, contactRepo);
    
    // Demonstrate graph queries
    await demonstrateGraphQueries(connection);
    
    console.log('\n🎉 Knowledge Graph Demo Complete!');
    console.log('Visit http://localhost:7474 to explore the graph visually');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await connection.close();
  }
}

async function createSampleData(connection: Neo4jConnection, contactRepo: Neo4jContactRepository) {
  console.log('📊 Creating sample CRM knowledge graph...\n');
  
  const session = connection.getSession();
  
  try {
    // Create comprehensive CRM graph
    await session.run(`
      // Create Organizations
      CREATE (techCorp:Organization {
        id: 'org-1',
        name: 'TechCorp Solutions',
        industry: 'Technology',
        size: 'Large',
        website: 'https://techcorp.com',
        createdAt: datetime()
      })
      
      CREATE (startup:Organization {
        id: 'org-2', 
        name: 'InnovateStartup',
        industry: 'Technology',
        size: 'Small',
        website: 'https://innovate.io',
        createdAt: datetime()
      })
      
      CREATE (healthcare:Organization {
        id: 'org-3',
        name: 'HealthFirst Medical',
        industry: 'Healthcare', 
        size: 'Medium',
        website: 'https://healthfirst.com',
        createdAt: datetime()
      })
      
      // Create Contacts
      CREATE (john:Contact {
        id: 'contact-1',
        name: 'John Smith', 
        email: 'john.smith@techcorp.com',
        phone: '+1-555-0101',
        createdAt: datetime()
      })
      
      CREATE (sarah:Contact {
        id: 'contact-2',
        name: 'Sarah Johnson',
        email: 'sarah@innovate.io', 
        phone: '+1-555-0102',
        createdAt: datetime()
      })
      
      CREATE (mike:Contact {
        id: 'contact-3',
        name: 'Mike Chen',
        email: 'mike.chen@techcorp.com',
        phone: '+1-555-0103', 
        createdAt: datetime()
      })
      
      CREATE (emma:Contact {
        id: 'contact-4',
        name: 'Emma Davis',
        email: 'emma@healthfirst.com',
        phone: '+1-555-0104',
        createdAt: datetime()
      })
      
      // Create Communications
      CREATE (email1:Communication {
        id: 'comm-1',
        type: 'email',
        subject: 'Project Kickoff Meeting',
        content: 'Let\\'s schedule the project kickoff for next week',
        direction: 'outbound',
        status: 'completed',
        createdAt: datetime() - duration({days: 5})
      })
      
      CREATE (call1:Communication {
        id: 'comm-2', 
        type: 'call',
        subject: 'Technical Discussion',
        content: 'Discussed API integration requirements',
        direction: 'inbound',
        status: 'completed',
        duration: 45,
        createdAt: datetime() - duration({days: 3})
      })
      
      CREATE (meeting1:Communication {
        id: 'comm-3',
        type: 'meeting',
        subject: 'Quarterly Review',
        content: 'Reviewed Q4 performance and Q1 goals',
        direction: 'outbound',
        status: 'completed',
        location: 'Conference Room A',
        createdAt: datetime() - duration({days: 1})
      })
      
      // Create Tasks
      CREATE (task1:Task {
        id: 'task-1',
        title: 'Follow up on proposal',
        description: 'Send follow-up email about the project proposal',
        priority: 'high',
        status: 'pending',
        dueDate: datetime() + duration({days: 2}),
        createdAt: datetime() - duration({days: 1})
      })
      
      CREATE (task2:Task {
        id: 'task-2',
        title: 'Prepare technical demo',
        description: 'Create demo for the upcoming client presentation', 
        priority: 'urgent',
        status: 'in_progress',
        dueDate: datetime() + duration({days: 1}),
        createdAt: datetime() - duration({days: 3})
      })
      
      CREATE (task3:Task {
        id: 'task-3',
        title: 'Update CRM records',
        description: 'Update contact information and notes',
        priority: 'medium', 
        status: 'completed',
        dueDate: datetime() - duration({days: 1}),
        completedAt: datetime(),
        createdAt: datetime() - duration({days: 5})
      })
      
      // Create Relationships
      CREATE (john)-[:WORKS_AT {role: 'Senior Developer', startDate: date('2022-01-15')}]->(techCorp)
      CREATE (mike)-[:WORKS_AT {role: 'Product Manager', startDate: date('2021-08-01')}]->(techCorp)
      CREATE (sarah)-[:WORKS_AT {role: 'CEO', startDate: date('2023-01-01')}]->(startup)
      CREATE (emma)-[:WORKS_AT {role: 'IT Director', startDate: date('2020-06-15')}]->(healthcare)
      
      CREATE (john)-[:PARTICIPANT_IN]->(email1)
      CREATE (sarah)-[:PARTICIPANT_IN]->(email1)
      CREATE (mike)-[:PARTICIPANT_IN]->(call1)
      CREATE (john)-[:PARTICIPANT_IN]->(call1)
      CREATE (emma)-[:PARTICIPANT_IN]->(meeting1)
      CREATE (john)-[:PARTICIPANT_IN]->(meeting1)
      
      CREATE (task1)-[:ASSIGNED_TO]->(john)
      CREATE (task2)-[:ASSIGNED_TO]->(mike)
      CREATE (task3)-[:ASSIGNED_TO]->(emma)
      
      CREATE (task1)-[:RELATED_TO]->(email1)
      CREATE (task2)-[:RELATED_TO]->(meeting1)
      
      // Create some industry connections
      CREATE (techCorp)-[:PARTNERS_WITH {since: date('2023-01-01')}]->(startup)
      CREATE (healthcare)-[:CLIENT_OF {since: date('2022-06-01')}]->(techCorp)
    `);

    console.log('✅ Created organizations: TechCorp, InnovateStartup, HealthFirst');
    console.log('✅ Created contacts: John, Sarah, Mike, Emma');
    console.log('✅ Created communications and tasks');
    console.log('✅ Established relationships: WORKS_AT, PARTICIPANT_IN, ASSIGNED_TO, etc.\n');

  } finally {
    await session.close();
  }
}

async function demonstrateGraphQueries(connection: Neo4jConnection) {
  console.log('🔍 Demonstrating Knowledge Graph Query Power...\n');
  
  const session = connection.getSession();
  
  try {
    // 1. Find contacts by industry
    console.log('1️⃣ Finding Technology industry contacts:');
    const techContacts = await session.run(GraphQueries.contactsByIndustry, { industry: 'Technology' });
    techContacts.records.forEach(record => {
      const contact = record.get('c').properties;
      const org = record.get('o').properties;
      console.log(`   👤 ${contact.name} at ${org.name} (${org.size})`);
    });
    
    // 2. Communication network analysis
    console.log('\n2️⃣ Communication Network Analysis:');
    const networkResult = await session.run(GraphQueries.communicationNetwork, { minConnections: 1 });
    networkResult.records.forEach(record => {
      console.log(`   🔗 ${record.get('contact1')} ↔ ${record.get('contact2')} (${record.get('connectionStrength')} communications)`);
    });
    
    // 3. Organization influence scores
    console.log('\n3️⃣ Organization Influence Scores:');
    const influenceResult = await session.run(GraphQueries.organizationInfluenceScore);
    influenceResult.records.forEach(record => {
      console.log(`   🏢 ${record.get('organization')}: Score ${record.get('influenceScore')} (${record.get('employeeCount')} employees, ${record.get('totalCommunications')} comms)`);
    });
    
    // 4. Task completion rates
    console.log('\n4️⃣ Task Completion Rates by Organization:');
    const completionResult = await session.run(GraphQueries.taskCompletionByOrg);
    completionResult.records.forEach(record => {
      console.log(`   📊 ${record.get('organization')}: ${record.get('completionRate')}% (${record.get('completedTasks')}/${record.get('totalTasks')})`);
    });
    
    // 5. Advanced path finding
    console.log('\n5️⃣ Finding Communication Paths:');
    const pathResult = await session.run(`
      MATCH path = (john:Contact {name: 'John Smith'})-[:PARTICIPANT_IN*..3]-(emma:Contact {name: 'Emma Davis'})
      RETURN path, length(path) as pathLength
      LIMIT 1
    `);
    
    if (pathResult.records.length > 0) {
      console.log(`   🛤️ Found ${pathResult.records[0].get('pathLength')}-step connection between John and Emma through communications`);
    }
    
    // 6. Real-time business insights
    console.log('\n6️⃣ Real-time Business Insights:');
    const insightResult = await session.run(`
      MATCH (o:Organization)<-[:WORKS_AT]-(c:Contact)
      OPTIONAL MATCH (c)-[:PARTICIPANT_IN]->(comm:Communication)
      WHERE comm.createdAt > datetime() - duration({days: 7})
      WITH o, count(DISTINCT c) as activeContacts, count(comm) as weeklyActivity
      WHERE weeklyActivity > 0
      RETURN o.name as organization, activeContacts, weeklyActivity,
             CASE 
               WHEN weeklyActivity > 5 THEN 'High Activity'
               WHEN weeklyActivity > 2 THEN 'Medium Activity'
               ELSE 'Low Activity'
             END as activityLevel
      ORDER BY weeklyActivity DESC
    `);
    
    insightResult.records.forEach(record => {
      console.log(`   📈 ${record.get('organization')}: ${record.get('activityLevel')} (${record.get('weeklyActivity')} activities this week)`);
    });

  } finally {
    await session.close();
  }
}

// Run the demo
if (require.main === module) {
  demonstrateKnowledgeGraph().catch(console.error);
}

export { demonstrateKnowledgeGraph }; 