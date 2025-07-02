#!/usr/bin/env ts-node

import 'reflect-metadata';
import { container } from 'tsyringe';
import { OntologyDrivenReasoningService } from '../../src/platform/reasoning/ontology-driven-reasoning.service';
import { ReasoningController } from '../../src/platform/reasoning/reasoning.controller';
import { Neo4jConnection } from '../../src/platform/database/neo4j-connection';
import { bootstrap } from '../../src/bootstrap';
import { logger } from '../../src/shared/utils/logger';

async function demonstrateReasoning() {
  console.log('🧠 Ontology-Driven Reasoning Demo\n');
  
  try {
    // Initialize the application
    bootstrap();
    
    // Initialize Neo4j connection
    const neo4jConnection = container.resolve(Neo4jConnection);
    await neo4jConnection.connect();
    console.log('✅ Connected to Neo4j');
    
    const reasoningService = container.resolve(OntologyDrivenReasoningService);
    const reasoningController = container.resolve(ReasoningController);
    
    // 1. List all available algorithms
    console.log('📋 Available Reasoning Algorithms:');
    const algorithms = await reasoningController.getReasoningAlgorithms();
    algorithms.algorithms.forEach((algo: any) => {
      console.log(`   • ${algo.name} (${algo.ontology})`);
      console.log(`     Description: ${algo.description}`);
      console.log(`     Entity Type: ${algo.entityType}`);
      if (algo.factors) {
        console.log(`     Factors: ${algo.factors.join(', ')}`);
      }
      console.log('');
    });
    
    // 2. Execute reasoning for specific ontologies (using plugin names)
    console.log('🔍 Executing Financial Ontology Reasoning...');
    const financialResult = await reasoningController.executeOntologyReasoning('financial');
    console.log(`   Result: ${financialResult.success ? '✅' : '❌'} ${financialResult.message}`);
    
    console.log('🔍 Executing Procurement Ontology Reasoning...');
    const procurementResult = await reasoningController.executeOntologyReasoning('procurement');
    console.log(`   Result: ${procurementResult.success ? '✅' : '❌'} ${procurementResult.message}`);
    
    // 3. Execute all reasoning algorithms
    console.log('\n🚀 Executing All Reasoning Algorithms...');
    const allResult = await reasoningController.executeAllReasoning();
    console.log(`   Result: ${allResult.success ? '✅' : '❌'} ${allResult.message}`);
    
    // Close Neo4j connection
    await neo4jConnection.close();
    console.log('✅ Neo4j connection closed');
    
    console.log('\n✅ Reasoning Demo Complete!');
    
  } catch (error) {
    console.error('❌ Error during reasoning demo:', error);
  }
}

if (require.main === module) {
  demonstrateReasoning().catch(e => {
    console.error('An unexpected error occurred:', e);
    process.exit(1);
  });
}

export { demonstrateReasoning }; 