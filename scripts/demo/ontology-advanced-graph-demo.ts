#!/usr/bin/env ts-node

/**
 * Ontology-Driven Advanced Graph Demo
 * Demonstrates how to use ontology.json files to configure advanced relationships
 */

import 'reflect-metadata';
import { container } from 'tsyringe';
import { OntologyDrivenAdvancedGraphService } from '@platform/processing/ontology-driven-advanced-graph.service';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { logger } from '@shared/utils/logger';
import * as path from 'path';

async function runOntologyAdvancedGraphDemo() {
  logger.info('Starting Ontology-Driven Advanced Graph Demo');

  const service = container.resolve(OntologyDrivenAdvancedGraphService);
  const neo4jConnection = container.resolve(Neo4jConnection);

  try {
    // Initialize services
    await neo4jConnection.connect();
    await service.initialize();

    logger.info('Services initialized successfully');

    // Load the financial ontology with advanced relationships
    const financialOntologyPath = path.join(__dirname, '..', '..', 'src', 'ontologies', 'financial', 'ontology.json');
    await service.loadOntology(financialOntologyPath);

    logger.info('Financial ontology loaded with advanced relationships');

    // Get ontology statistics
    const stats = await service.getOntologyStatistics();
    logger.info('Ontology Statistics:', JSON.stringify(stats, null, 2));

    // Execute different types of analysis
    const analysisTypes = ['temporal', 'hierarchical', 'similarity', 'complex'];

    for (const analysisType of analysisTypes) {
      try {
        logger.info(`\n=== Executing ${analysisType.toUpperCase()} Analysis ===`);
        
        const results = await service.executeOntologyAnalysis('financial', analysisType, {
          limit: 10,
          threshold: 0.7,
          confidence: 0.8
        });

        logger.info(`${analysisType} Analysis Results:`, JSON.stringify(results, null, 2));
      } catch (error) {
        logger.warn(`Analysis type ${analysisType} not available or failed:`, error);
      }
    }

    // Query specific patterns
    logger.info('\n=== Querying Specific Patterns ===');
    
    const patternTypes = ['timeline', 'hierarchy', 'similarity', 'complex'];
    
    for (const patternType of patternTypes) {
      try {
        const patternResults = await service.queryOntologyPatterns('financial', patternType, {
          limit: 5
        });
        
        logger.info(`${patternType} Pattern Results:`, JSON.stringify(patternResults, null, 2));
      } catch (error) {
        logger.warn(`Pattern type ${patternType} not available or failed:`, error);
      }
    }

    // Get loaded ontologies
    const loadedOntologies = service.getLoadedOntologies();
    logger.info('\nLoaded Ontologies:', loadedOntologies);

    // Get specific ontology configuration
    const financialConfig = service.getOntologyConfig('financial');
    if (financialConfig) {
      logger.info('\nFinancial Ontology Configuration:');
      logger.info(`- Name: ${financialConfig.name}`);
      logger.info(`- Version: ${financialConfig.version}`);
      logger.info(`- Entities: ${Object.keys(financialConfig.entities).length}`);
      logger.info(`- Relationships: ${Object.keys(financialConfig.relationships).length}`);
      logger.info(`- Advanced Relationships:`, {
        temporal: financialConfig.advancedRelationships.temporal?.enabled || false,
        hierarchical: financialConfig.advancedRelationships.hierarchical?.enabled || false,
        similarity: financialConfig.advancedRelationships.similarity?.enabled || false,
        complex: financialConfig.advancedRelationships.complex?.enabled || false
      });
    }

    logger.info('\n=== Demo Completed Successfully ===');

  } catch (error) {
    logger.error('Demo failed:', error);
    throw error;
  } finally {
    // Clean up
    await service.close();
    await neo4jConnection.close();
    logger.info('Services closed');
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runOntologyAdvancedGraphDemo()
    .then(() => {
      logger.info('Ontology Advanced Graph Demo completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Ontology Advanced Graph Demo failed:', error);
      process.exit(1);
    });
}

export { runOntologyAdvancedGraphDemo }; 