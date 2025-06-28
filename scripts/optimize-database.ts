import { Neo4jConnection } from '../src/platform/database/neo4j-connection';
import { container } from 'tsyringe';

async function optimizeDatabase() {
    console.log('🚀 Starting database optimization...');
    
    const connection = container.resolve(Neo4jConnection);
    await connection.connect();
    const session = connection.getDriver().session();

    try {
        // 1. Create essential indexes
        console.log('📊 Creating performance indexes...');
        
        const indexes = [
            'CREATE INDEX contact_email_idx IF NOT EXISTS FOR (c:Contact) ON (c.email)',
            'CREATE INDEX contact_name_idx IF NOT EXISTS FOR (c:Contact) ON (c.name)',
            'CREATE INDEX organization_name_idx IF NOT EXISTS FOR (o:Organization) ON (o.name)',
            'CREATE INDEX organization_industry_idx IF NOT EXISTS FOR (o:Organization) ON (o.industry)',
            'CREATE INDEX deal_stage_idx IF NOT EXISTS FOR (d:Deal) ON (d.stage)',
            'CREATE INDEX deal_name_idx IF NOT EXISTS FOR (d:Deal) ON (d.name)',
            'CREATE INDEX communication_date_idx IF NOT EXISTS FOR (c:Communication) ON (c.createdAt)',
            'CREATE INDEX communication_type_idx IF NOT EXISTS FOR (c:Communication) ON (c.type)',
            'CREATE INDEX task_due_date_idx IF NOT EXISTS FOR (t:Task) ON (t.dueDate)',
            'CREATE INDEX task_status_idx IF NOT EXISTS FOR (t:Task) ON (t.status)',
            'CREATE INDEX entity_id_idx IF NOT EXISTS FOR (e) ON (e.id)',
            'CREATE INDEX person_name_idx IF NOT EXISTS FOR (p:Person) ON (p.name)',
            'CREATE INDEX fund_name_idx IF NOT EXISTS FOR (f:Fund) ON (f.name)',
            'CREATE INDEX sector_name_idx IF NOT EXISTS FOR (s:Sector) ON (s.name)'
        ];

        for (const indexQuery of indexes) {
            try {
                await session.run(indexQuery);
                const indexName = indexQuery.split(' ')[2];
                console.log(`   ✅ ${indexName}`);
            } catch (error: unknown) {
                if (!error.message.includes('already exists')) {
                    console.warn(`   ⚠️ Index creation failed: ${error.message}`);
                }
            }
        }

        // 2. Create unique constraints
        console.log('🔒 Creating unique constraints...');
        
        const constraints = [
            'CREATE CONSTRAINT contact_id_unique IF NOT EXISTS FOR (c:Contact) REQUIRE c.id IS UNIQUE',
            'CREATE CONSTRAINT organization_id_unique IF NOT EXISTS FOR (o:Organization) REQUIRE o.id IS UNIQUE',
            'CREATE CONSTRAINT deal_id_unique IF NOT EXISTS FOR (d:Deal) REQUIRE d.id IS UNIQUE',
            'CREATE CONSTRAINT communication_id_unique IF NOT EXISTS FOR (c:Communication) REQUIRE c.id IS UNIQUE',
            'CREATE CONSTRAINT person_id_unique IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE',
            'CREATE CONSTRAINT fund_id_unique IF NOT EXISTS FOR (f:Fund) REQUIRE f.id IS UNIQUE'
        ];

        for (const constraintQuery of constraints) {
            try {
                await session.run(constraintQuery);
                const constraintName = constraintQuery.split(' ')[2];
                console.log(`   ✅ ${constraintName}`);
            } catch (error: unknown) {
                if (!error.message.includes('already exists')) {
                    console.warn(`   ⚠️ Constraint creation failed: ${error.message}`);
                }
            }
        }

        // 3. Analyze database statistics
        console.log('📈 Analyzing database statistics...');
        
        try {
            const nodeStats = await session.run(`
                MATCH (n) 
                RETURN labels(n) as labels, count(n) as count 
                ORDER BY count DESC
            `);

            console.log('   📊 Node distribution:');
            nodeStats.records.forEach(record => {
                const labels = record.get('labels').join(':');
                const count = record.get('count').toNumber();
                console.log(`     - ${labels}: ${count}`);
            });

            const relStats = await session.run(`
                MATCH ()-[r]->() 
                RETURN type(r) as relType, count(r) as count 
                ORDER BY count DESC
            `);

            console.log('   🔗 Relationship distribution:');
            relStats.records.forEach(record => {
                const relType = record.get('relType');
                const count = record.get('count').toNumber();
                console.log(`     - ${relType}: ${count}`);
            });

        } catch (error) {
            console.warn('   ⚠️ Could not retrieve detailed statistics');
        }

        // 4. Check for potential performance issues
        console.log('🐌 Checking for potential performance issues...');
        
        const orphanNodes = await session.run(`
            MATCH (n) 
            WHERE NOT (n)--() 
            RETURN labels(n) as label, count(n) as count 
            ORDER BY count DESC
            LIMIT 10
        `);

        if (orphanNodes.records.length > 0) {
            console.log('   ⚠️ Orphan nodes found:');
            orphanNodes.records.forEach(record => {
                const labels = record.get('label').join(':');
                const count = record.get('count').toNumber();
                console.log(`     - ${labels}: ${count}`);
            });
        } else {
            console.log('   ✅ No orphan nodes found');
        }

        // 5. Performance recommendations
        console.log('💡 Performance recommendations:');
        console.log('   - Use EXPLAIN/PROFILE to analyze slow queries');
        console.log('   - Consider composite indexes for multi-property searches');
        console.log('   - Monitor memory usage with large datasets');
        console.log('   - Use LIMIT clauses in development queries');

        console.log('✅ Database optimization complete!');
        
    } catch (error) {
        console.error('❌ Optimization failed:', error);
        throw error;
    } finally {
        await session.close();
        await connection.close();
    }
}

// Run optimization if called directly
if (require.main === module) {
    optimizeDatabase().catch(console.error);
}

export { optimizeDatabase }; 