#!/usr/bin/env ts-node

/**
 * Advanced Graph Demo
 * Demonstrates ontology-agnostic advanced graph operations
 */

import 'reflect-metadata';
import { container } from 'tsyringe';
import { AdvancedGraphService, TemporalRelationship, HierarchicalRelationship, SimilarityRelationship, ComplexRelationship, GraphPattern } from '@platform/processing/advanced-graph.service';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { logger } from '@shared/utils/logger';

async function runAdvancedGraphDemo() {
  logger.info('🚀 Starting Advanced Graph Demo (Ontology Agnostic)');

  // Initialize services
  const advancedGraphService = container.resolve(AdvancedGraphService);
  const neo4jConnection = container.resolve(Neo4jConnection);

  try {
    // Initialize connections
    await neo4jConnection.connect();
    await advancedGraphService.initialize();

    logger.info('✅ Services initialized successfully');

    // Demo 1: Create temporal relationships for any entity type
    logger.info('\n📅 Demo 1: Creating Temporal Relationships');
    const temporalRelationships: TemporalRelationship[] = [
      {
        source: 'org_123',
        target: 'org_456',
        type: 'PARTNERSHIP_FORMED',
        startDate: new Date('2023-01-15'),
        endDate: new Date('2023-12-31'),
        duration: 350,
        confidence: 0.9,
        metadata: {
          source: 'email_analysis',
          patternType: 'business_partnership',
          entityTypes: ['Organization', 'Organization'],
        },
      },
      {
        source: 'deal_789',
        target: 'org_123',
        type: 'INVESTMENT_MADE',
        startDate: new Date('2023-03-20'),
        confidence: 0.95,
        metadata: {
          source: 'financial_data',
          patternType: 'investment_activity',
          entityTypes: ['Deal', 'Organization'],
        },
      },
    ];

    await advancedGraphService.createTemporalRelationships(temporalRelationships);
    logger.info(`✅ Created ${temporalRelationships.length} temporal relationships`);

    // Demo 2: Create hierarchical relationships for any entity types
    logger.info('\n🏗️ Demo 2: Creating Hierarchical Relationships');
    const hierarchicalRelationships: HierarchicalRelationship[] = [
      {
        parent: 'fund_001',
        child: 'deal_789',
        level: 1,
        hierarchyType: 'FUND_DEAL',
        properties: {
          ownershipPercentage: 75,
          investmentStage: 'Series A',
        },
        metadata: {
          source: 'deal_flow_analysis',
          confidence: 1.0,
        },
      },
      {
        parent: 'deal_789',
        child: 'org_123',
        level: 2,
        hierarchyType: 'DEAL_TARGET',
        properties: {
          acquisitionType: 'majority_stake',
          valuation: 50000000,
        },
        metadata: {
          source: 'deal_analysis',
          confidence: 0.95,
        },
      },
    ];

    await advancedGraphService.createHierarchicalRelationships(hierarchicalRelationships);
    logger.info(`✅ Created ${hierarchicalRelationships.length} hierarchical relationships`);

    // Demo 3: Create similarity relationships for any entity type
    logger.info('\n🔍 Demo 3: Creating Similarity Relationships');
    const similarityRelationships: SimilarityRelationship[] = [
      {
        entity1: 'org_123',
        entity2: 'org_456',
        similarityType: 'ORGANIZATION_SIMILARITY',
        score: 0.85,
        factors: ['sector', 'size', 'geography'],
        calculatedAt: new Date(),
        metadata: {
          algorithm: 'property_based_similarity',
          entityType: 'Organization',
        },
      },
      {
        entity1: 'deal_789',
        entity2: 'deal_101',
        similarityType: 'DEAL_SIMILARITY',
        score: 0.72,
        factors: ['sector', 'dealSize', 'stage'],
        calculatedAt: new Date(),
        metadata: {
          algorithm: 'property_based_similarity',
          entityType: 'Deal',
        },
      },
    ];

    await advancedGraphService.createSimilarityRelationships(similarityRelationships);
    logger.info(`✅ Created ${similarityRelationships.length} similarity relationships`);

    // Demo 4: Create complex relationship patterns
    logger.info('\n🎯 Demo 4: Creating Complex Relationship Patterns');
    const patternDefinitions: GraphPattern[] = [
      {
        name: 'COMPETITIVE_RELATIONSHIP',
        description: 'Organizations competing in the same sector',
        cypherQuery: `
          MATCH (org1:Organization)-[:INVOLVES]->(deal1:Deal)
          MATCH (org2:Organization)-[:INVOLVES]->(deal2:Deal)
          WHERE deal1 <> deal2 AND deal1.sector = deal2.sector
          AND org1 <> org2
          RETURN org1.id as source, org2.id as target, deal1.sector as sector
        `,
        resultMapping: {
          source: 'source',
          target: 'target',
          sector: 'sector',
        },
      },
      {
        name: 'INVESTMENT_PATTERN',
        description: 'Funds with multiple deals',
        cypherQuery: `
          MATCH (fund:Fund)-[:OWNS]->(deal:Deal)
          WITH fund, collect(deal) as deals
          WHERE size(deals) > 1
          RETURN fund.id as source, 'multi_deal_pattern' as target, size(deals) as dealCount
        `,
        resultMapping: {
          source: 'source',
          target: 'target',
          dealCount: 'dealCount',
        },
      },
    ];

    const complexRelationships = await advancedGraphService.createComplexPatterns(patternDefinitions);
    logger.info(`✅ Created ${complexRelationships.length} complex relationship patterns`);

    // Demo 5: Analyze timeline patterns for any entity
    logger.info('\n⏰ Demo 5: Analyzing Timeline Patterns');
    const timelinePatterns = await advancedGraphService.analyzeTimelinePatterns('org_123', 'Organization');
    logger.info(`✅ Found ${timelinePatterns.length} timeline patterns for organization org_123`);

    // Demo 6: Build hierarchical structure for any entity types
    logger.info('\n🏛️ Demo 6: Building Hierarchical Structure');
    const hierarchy = await advancedGraphService.buildHierarchicalStructure('Fund', 'Deal', 'OWNS');
    logger.info(`✅ Built ${hierarchy.length} hierarchical relationships between Fund and Deal entities`);

    // Demo 7: Calculate entity similarity for any entity type
    logger.info('\n📊 Demo 7: Calculating Entity Similarity');
    const similarities = await advancedGraphService.calculateEntitySimilarity('Organization', ['sector', 'size', 'geography']);
    logger.info(`✅ Calculated ${similarities.length} similarity relationships for Organization entities`);

    // Demo 8: Query advanced patterns
    logger.info('\n🔍 Demo 8: Querying Advanced Patterns');
    
    const patternTypes = ['timeline', 'hierarchy', 'similarity', 'complex', 'temporal', 'patterns'];
    
    for (const patternType of patternTypes) {
      try {
        const results = await advancedGraphService.queryAdvancedPatterns(patternType);
        logger.info(`📈 ${patternType.toUpperCase()} patterns: ${results.length} results`);
        
        if (results.length > 0) {
          logger.info(`   Sample: ${JSON.stringify(results[0], null, 2)}`);
        }
      } catch (error) {
        logger.warn(`⚠️ No ${patternType} patterns found or error occurred`);
      }
    }

    // Demo 9: Execute custom analysis
    logger.info('\n🎯 Demo 9: Custom Graph Analysis');
    const customQuery = `
      MATCH (entity)-[r:TEMPORAL_RELATIONSHIP]->(target)
      WHERE r.confidence > 0.8
      RETURN entity.name as entityName, 
             target.name as targetName, 
             r.type as relationshipType,
             r.confidence as confidence
      ORDER BY r.confidence DESC
      LIMIT 5
    `;
    
    const customResults = await advancedGraphService.executeCustomAnalysis(customQuery);
    logger.info(`✅ Custom analysis returned ${customResults.length} high-confidence temporal relationships`);

    // Demo 10: Get graph statistics
    logger.info('\n📊 Demo 10: Graph Statistics');
    const stats = await advancedGraphService.getGraphStatistics();
    logger.info('📈 Graph Statistics:');
    logger.info(`   - Temporal Relationships: ${stats.temporalRelationships}`);
    logger.info(`   - Hierarchical Relationships: ${stats.hierarchicalRelationships}`);
    logger.info(`   - Similarity Relationships: ${stats.similarityRelationships}`);
    logger.info(`   - Complex Relationships: ${stats.complexRelationships}`);
    logger.info(`   - Total Nodes: ${stats.totalNodes}`);
    logger.info(`   - Total Relationships: ${stats.totalRelationships}`);

    logger.info('\n🎉 Advanced Graph Demo completed successfully!');
    logger.info('✨ All operations were performed in an ontology-agnostic manner');

  } catch (error) {
    logger.error('❌ Error in Advanced Graph Demo:', error);
    throw error;
  } finally {
    // Cleanup
    await advancedGraphService.close();
    await neo4jConnection.close();
    logger.info('🧹 Cleanup completed');
  }
}

// Run the demo
if (require.main === module) {
  runAdvancedGraphDemo()
    .then(() => {
      logger.info('✅ Demo completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Demo failed:', error);
      process.exit(1);
    });
}

export { runAdvancedGraphDemo }; 