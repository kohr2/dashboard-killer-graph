#!/usr/bin/env ts-node

import "reflect-metadata";
import * as neo4j from 'neo4j-driver';
import { container } from 'tsyringe';
import { OntologyService } from './ontology.service';
import { Neo4jConnection } from '../database/neo4j-connection';
import { logger } from '@shared/utils/logger';

interface VerificationResult {
  ontologyName: string;
  entityCounts: Record<string, number>;
  relationshipCounts: Record<string, number>;
  sampleEntities: Record<string, any[]>;
  totalEntities: number;
  totalRelationships: number;
  success: boolean;
}

/**
 * Generic Ontology Verification Service
 * 
 * This service verifies ontology data in the Neo4j database.
 * It's ontology-agnostic and can work with any ontology.
 */
export class OntologyVerificationService {
  private driver: neo4j.Driver;
  private database: string;

  constructor(
    uri: string = 'bolt://localhost:7687',
    username: string = 'neo4j',
    password: string = 'dashboard-killer',
    database: string = 'dashboardkiller'
  ) {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
    this.database = database;
  }

  /**
   * Verify ontology data in the database
   */
  async verifyOntologyData(ontologyName: string): Promise<VerificationResult> {
    logger.info(`🔍 Verifying ${ontologyName} data in database: ${this.database}...`);
    
    const result: VerificationResult = {
      ontologyName,
      entityCounts: {},
      relationshipCounts: {},
      sampleEntities: {},
      totalEntities: 0,
      totalRelationships: 0,
      success: false
    };

    try {
      await this.driver.verifyConnectivity();
      logger.info('✅ Connected to Neo4j successfully!');
      
      const session = this.driver.session({ database: this.database });
      try {
        // Get all entity types and counts for this ontology
        const entityResult = await session.run(`
          MATCH (n) 
          WHERE any(label IN labels(n) WHERE label CONTAINS $ontologyName OR n.ontology = $ontologyName)
          RETURN labels(n) as labels, count(n) as count
          ORDER BY count DESC
        `, { ontologyName: ontologyName.toUpperCase() });
        
        logger.info(`\n📊 ${ontologyName} entities in database:`);
        entityResult.records.forEach((record: any) => {
          const labels = record.get('labels');
          const count = record.get('count').toNumber();
          const labelKey = labels.join(':');
          result.entityCounts[labelKey] = count;
          result.totalEntities += count;
          logger.info(`  ${labelKey}: ${count} nodes`);
        });

        // Get sample entities for each type
        for (const [labelKey, count] of Object.entries(result.entityCounts)) {
          if (count > 0) {
            const labels = labelKey.split(':');
            const sampleQuery = `
              MATCH (n:${labels.join(':')}) 
              WHERE n.ontology = $ontologyName OR any(label IN labels(n) WHERE label CONTAINS $ontologyName)
              RETURN n.name as name, n.code as code, n.description as description, n.type as type
              LIMIT 5
            `;
            
            const sampleResult = await session.run(sampleQuery, { 
              ontologyName: ontologyName.toUpperCase() 
            });
            
            result.sampleEntities[labelKey] = sampleResult.records.map((record: any) => ({
              name: record.get('name'),
              code: record.get('code'),
              description: record.get('description'),
              type: record.get('type')
            }));
          }
        }

        // Get relationship counts
        const relationshipResult = await session.run(`
          MATCH ()-[r]-() 
          WHERE type(r) CONTAINS $ontologyName OR r.ontology = $ontologyName
          RETURN type(r) as type, count(r) as count
          ORDER BY count DESC
        `, { ontologyName: ontologyName.toUpperCase() });
        
        logger.info(`\n🔗 ${ontologyName} relationships:`);
        relationshipResult.records.forEach((record: any) => {
          const type = record.get('type');
          const count = record.get('count').toNumber();
          result.relationshipCounts[type] = count;
          result.totalRelationships += count;
          logger.info(`  ${type}: ${count} relationships`);
        });

        // Show sample entities
        for (const [labelKey, entities] of Object.entries(result.sampleEntities)) {
          if (entities.length > 0) {
            logger.info(`\n📋 Sample ${labelKey} entities:`);
            entities.forEach(entity => {
              const displayName = entity.name || entity.code || entity.type || 'Unknown';
              logger.info(`  ${displayName}`);
              if (entity.description) {
                logger.info(`    Description: ${entity.description.substring(0, 100)}...`);
              }
            });
          }
        }

        if (result.totalEntities > 0) {
          logger.info(`\n✅ ${ontologyName} data has been successfully ingested!`);
          logger.info(`📊 Summary:`);
          logger.info(`   - Total Entities: ${result.totalEntities}`);
          logger.info(`   - Total Relationships: ${result.totalRelationships}`);
          logger.info(`   - Entity Types: ${Object.keys(result.entityCounts).length}`);
          logger.info(`   - Relationship Types: ${Object.keys(result.relationshipCounts).length}`);
          result.success = true;
        } else {
          logger.info(`\n❌ No ${ontologyName} data found. Ingestion may have failed...`);
          result.success = false;
        }
        
      } catch (dbError: any) {
        logger.error('❌ Database query failed:', dbError.message);
        result.success = false;
      } finally {
        await session.close();
      }
      
    } catch (error: any) {
      logger.error('❌ Failed to connect to Neo4j:', error.message);
      result.success = false;
    } finally {
      await this.driver.close();
    }

    return result;
  }

  /**
   * Verify multiple ontologies
   */
  async verifyMultipleOntologies(ontologyNames: string[]): Promise<Record<string, VerificationResult>> {
    const results: Record<string, VerificationResult> = {};
    
    for (const ontologyName of ontologyNames) {
      logger.info(`\n${'='.repeat(50)}`);
      logger.info(`Verifying ${ontologyName.toUpperCase()}`);
      logger.info(`${'='.repeat(50)}`);
      
      results[ontologyName] = await this.verifyOntologyData(ontologyName);
    }
    
    return results;
  }

  /**
   * Get summary of all ontologies in the database
   */
  async getOntologySummary(): Promise<any> {
    logger.info('🔍 Getting ontology summary from database...');
    
    try {
      await this.driver.verifyConnectivity();
      
      const session = this.driver.session({ database: this.database });
      try {
        // Get all ontologies and their entity counts
        const summaryResult = await session.run(`
          MATCH (n) 
          WHERE n.ontology IS NOT NULL
          RETURN n.ontology as ontology, labels(n) as labels, count(n) as count
          ORDER BY ontology, count DESC
        `);
        
        const summary: Record<string, any> = {};
        
        summaryResult.records.forEach((record: any) => {
          const ontology = record.get('ontology');
          const labels = record.get('labels');
          const count = record.get('count').toNumber();
          
          if (!summary[ontology]) {
            summary[ontology] = { entities: {}, totalEntities: 0 };
          }
          
          const labelKey = labels.join(':');
          summary[ontology].entities[labelKey] = count;
          summary[ontology].totalEntities += count;
        });
        
        logger.info('\n📊 Ontology Summary:');
        for (const [ontology, data] of Object.entries(summary)) {
          logger.info(`\n${ontology}:`);
          logger.info(`  Total Entities: ${data.totalEntities}`);
          for (const [entityType, count] of Object.entries(data.entities)) {
            logger.info(`    ${entityType}: ${count}`);
          }
        }
        
        return summary;
        
      } finally {
        await session.close();
      }
      
    } catch (error: any) {
      logger.error('❌ Failed to get ontology summary:', error.message);
      return {};
    } finally {
      await this.driver.close();
    }
  }
} 