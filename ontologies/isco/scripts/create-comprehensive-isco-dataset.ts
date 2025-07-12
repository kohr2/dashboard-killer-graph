#!/usr/bin/env ts-node

import "reflect-metadata";
import * as fs from 'fs';
import * as path from 'path';

interface ComprehensiveISCODataset {
  metadata: {
    source: string;
    ontology: string;
    version: string;
    createdAt: string;
    recordCount: number;
  };
  records: Array<{
    id: string;
    type: string;
    content: string;
    properties: Record<string, any>;
    relationships?: Array<{
      type: string;
      target: string;
    }>;
  }>;
}

class ComprehensiveISCODatasetCreator {
  private ontologyDir: string;
  private records: any[] = [];

  constructor() {
    this.ontologyDir = path.join(__dirname, '../');
  }

  /**
   * Load ISCO entities from the entities file
   */
  private loadISCOEntities(): any {
    // Use English entities instead of Spanish
    const entitiesPath = path.join(this.ontologyDir, 'data', 'isco-entities-english.json');
    return JSON.parse(fs.readFileSync(entitiesPath, 'utf-8'));
  }

  /**
   * Load job title mappings
   */
  private loadJobTitleMappings(): any {
    const mappingPath = path.join(this.ontologyDir, 'data', 'job-title-to-isco-mapping.json');
    return JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
  }

  /**
   * Create ISCO structure records
   */
  private createISCOStructureRecords(entities: any): void {
    // Add ISCO Major Groups
    Object.entries(entities.ISCOMajorGroup || {}).forEach(([id, entity]: [string, any]) => {
      this.records.push({
        id,
        type: 'ISCOMajorGroup',
        content: `ISCOMajorGroup: ${entity.name}`,
        properties: {
          code: entity.code,
          name: entity.name,
          description: entity.description,
          level: entity.level
        },
        relationships: [
          {
            type: 'ISCO_GROUP_TYPE',
            target: id
          }
        ]
      });
    });

    // Add ISCO Sub-Major Groups
    Object.entries(entities.ISCOSubMajorGroup || {}).forEach(([id, entity]: [string, any]) => {
      this.records.push({
        id,
        type: 'ISCOSubMajorGroup',
        content: `ISCOSubMajorGroup: ${entity.name}`,
        properties: {
          code: entity.code,
          name: entity.name,
          description: entity.description,
          level: entity.level
        },
        relationships: [
          {
            type: 'ISCO_GROUP_TYPE',
            target: id
          }
        ]
      });
    });

    // Add ISCO Minor Groups
    Object.entries(entities.ISCOMinorGroup || {}).forEach(([id, entity]: [string, any]) => {
      this.records.push({
        id,
        type: 'ISCOMinorGroup',
        content: `ISCOMinorGroup: ${entity.name}`,
        properties: {
          code: entity.code,
          name: entity.name,
          description: entity.description,
          level: entity.level
        },
        relationships: [
          {
            type: 'ISCO_GROUP_TYPE',
            target: id
          }
        ]
      });
    });

    // Add ISCO Unit Groups
    Object.entries(entities.ISCOUnitGroup || {}).forEach(([id, entity]: [string, any]) => {
      this.records.push({
        id,
        type: 'ISCOUnitGroup',
        content: `ISCOUnitGroup: ${entity.name}`,
        properties: {
          code: entity.code,
          name: entity.name,
          description: entity.description,
          level: entity.level
        },
        relationships: [
          {
            type: 'ISCO_GROUP_TYPE',
            target: id
          }
        ]
      });
    });

    // Add generic ISCO Groups
    Object.entries(entities.ISCOGroup || {}).forEach(([id, entity]: [string, any]) => {
      this.records.push({
        id,
        type: 'ISCOGroup',
        content: `ISCOGroup: ${entity.name}`,
        properties: {
          code: entity.code,
          name: entity.name,
          description: entity.description,
          level: entity.level
        },
        relationships: [
          {
            type: 'ISCO_GROUP_TYPE',
            target: id
          }
        ]
      });
    });
  }

  /**
   * Create job title records (sampled to avoid overwhelming the system)
   */
  private createJobTitleRecords(jobTitleMappings: any, maxJobTitles: number = 1000): void {
    const jobTitles = Object.keys(jobTitleMappings);
    const sampledJobTitles = jobTitles.slice(0, maxJobTitles);

    sampledJobTitles.forEach((jobTitle, index) => {
      const iscoCodes = jobTitleMappings[jobTitle];
      
      this.records.push({
        id: `JobTitle_${index}`,
        type: 'JobTitle',
        content: `JobTitle: ${jobTitle}`,
        properties: {
          name: jobTitle,
          iscoCodes: iscoCodes,
          description: `Job title: ${jobTitle}`
        },
        relationships: iscoCodes.map((code: string) => ({
          type: 'MAPPED_TO_ISCO',
          target: `ISCOUnitGroup_${code}` // Assuming unit group level mapping
        }))
      });
    });
  }

  /**
   * Create comprehensive dataset
   */
  async createComprehensiveDataset(maxJobTitles: number = 1000): Promise<void> {
    console.log('Creating comprehensive ISCO dataset...');

    // Load data
    const entities = this.loadISCOEntities();
    const jobTitleMappings = this.loadJobTitleMappings();

    console.log(`Loaded ${Object.keys(entities.ISCOMajorGroup || {}).length} major groups`);
    console.log(`Loaded ${Object.keys(jobTitleMappings).length} job titles`);

    // Create ISCO structure records
    this.createISCOStructureRecords(entities);

    // Create job title records (sampled)
    this.createJobTitleRecords(jobTitleMappings, maxJobTitles);

    // Create dataset
    const dataset: ComprehensiveISCODataset = {
      metadata: {
        source: 'ISCO Classification System + Job Title Mappings',
        ontology: 'isco',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        recordCount: this.records.length
      },
      records: this.records
    };

    // Save dataset
    const outputPath = path.join(this.ontologyDir, 'data', 'comprehensive-isco-dataset-english.json');
    fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));

    console.log(`✅ Comprehensive English ISCO dataset created with ${this.records.length} records`);
    console.log(`📁 Saved to: ${outputPath}`);
    console.log(`📊 Breakdown:`);
    console.log(`   - ISCO Structure: ${this.records.filter(r => r.type.includes('ISCO')).length} records`);
    console.log(`   - Job Titles: ${this.records.filter(r => r.type === 'JobTitle').length} records`);
  }
}

/**
 * Main function
 */
async function main() {
  const maxJobTitles = process.argv.includes('--max-job-titles') ? 
    parseInt(process.argv[process.argv.indexOf('--max-job-titles') + 1], 10) : 
    1000;

  const creator = new ComprehensiveISCODatasetCreator();
  await creator.createComprehensiveDataset(maxJobTitles);
}

if (require.main === module) {
  main().catch(console.error);
} 