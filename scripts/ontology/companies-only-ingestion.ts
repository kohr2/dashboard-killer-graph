import 'reflect-metadata';
import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { GenericIngestionPipeline } from '../../src/ingestion/pipeline/generic-ingestion-pipeline';
import { logger } from '@shared/utils/logger';
import { companiesPlugin } from '../../ontologies/companies/companies.plugin';
import * as fs from 'fs';
import * as path from 'path';

class CompaniesOnlyIngestionService {
  private readonly dataDir = path.join(__dirname, '..', '..', 'ontologies', 'companies', 'data');
  private readonly ontologyService: OntologyService;
  private readonly ingestionPipeline: GenericIngestionPipeline;

  constructor() {
    this.ontologyService = container.resolve(OntologyService);
    this.ingestionPipeline = container.resolve(GenericIngestionPipeline);
  }

  /**
   * Register only Companies ontology
   */
  private registerCompaniesOnly(): void {
    logger.info('🔄 Registering Companies ontology only...');
    
    // Register the ontology service
    container.registerSingleton(OntologyService);
    
    // Get the ontology service and load only Companies
    const ontologyService = container.resolve(OntologyService);
    ontologyService.loadFromPlugins([companiesPlugin]);
    
    logger.info('✅ Companies ontology loaded and registered');
  }

  /**
   * Load transformed S&P 500 data
   */
  private loadTransformedData(): any {
    logger.info('📂 Loading transformed S&P 500 data...');
    
    const completeDatasetPath = path.join(this.dataDir, 'sp500_complete_dataset.json');
    
    if (!fs.existsSync(completeDatasetPath)) {
      throw new Error(`Transformed data not found at ${completeDatasetPath}. Please run the transformation script first.`);
    }
    
    const data = JSON.parse(fs.readFileSync(completeDatasetPath, 'utf8'));
    logger.info(`📊 Loaded ${data.companies.length} companies, ${data.industries.length} industries, ${data.sectors.length} sectors, and ${data.exchanges.length} exchanges`);
    
    return data;
  }

  /**
   * Convert data to ingestion inputs
   */
  private convertToIngestionInputs(data: any): any[] {
    logger.info('🔄 Converting data to ingestion inputs...');
    
    const inputs: any[] = [];
    
    // Add companies
    data.companies.forEach((company: any) => {
      inputs.push({
        entityType: 'Company',
        properties: company.properties,
        relationships: []
      });
    });
    
    // Add industries
    data.industries.forEach((industry: any) => {
      inputs.push({
        entityType: 'Industry',
        properties: industry.properties,
        relationships: []
      });
    });
    
    // Add sectors
    data.sectors.forEach((sector: any) => {
      inputs.push({
        entityType: 'Sector',
        properties: sector.properties,
        relationships: []
      });
    });
    
    // Add stock exchanges
    data.exchanges.forEach((exchange: any) => {
      inputs.push({
        entityType: 'StockExchange',
        properties: exchange.properties,
        relationships: []
      });
    });
    
    logger.info(`📝 Created ${inputs.length} ingestion inputs`);
    return inputs;
  }

  /**
   * Clear existing companies data from database
   */
  private async clearExistingData(): Promise<void> {
    logger.info('🧹 Clearing existing companies data from database...');
    
    try {
      // This would typically use a database service to clear data
      // For now, we'll just log that we would clear the data
      logger.info('⚠️  Data clearing not implemented - would clear existing companies data');
    } catch (error) {
      logger.warn('⚠️  Could not clear existing data:', error);
    }
  }

  /**
   * Run the ingestion process
   */
  async run(): Promise<void> {
    try {
      logger.info('🚀 Starting Companies-only ingestion process...');
      
      // Step 1: Register Companies ontology only
      this.registerCompaniesOnly();
      
      // Step 2: Clear existing data (optional)
      await this.clearExistingData();
      
      // Step 3: Load transformed data
      const data = this.loadTransformedData();
      
      // Step 4: Convert to ingestion inputs
      const inputs = this.convertToIngestionInputs(data);
      
      // Step 5: Run ingestion pipeline
      logger.info('🔄 Running ingestion pipeline...');
      await this.ingestionPipeline.run(inputs);
      
      // Step 6: Log results
      logger.info('✅ Companies ingestion completed successfully');
      logger.info(`📊 Ingested ${inputs.length} entities`);
      
      // Log summary by entity type
      const summary = inputs.reduce((acc: any, input: any) => {
        const entityType = input.entityType || 'Unknown';
        acc[entityType] = (acc[entityType] || 0) + 1;
        return acc;
      }, {});
      
      logger.info('📈 Ingestion summary:', summary);
      
    } catch (error) {
      logger.error('❌ Companies ingestion failed:', error);
      throw error;
    }
  }
}

// Main execution
async function main(): Promise<void> {
  const ingestionService = new CompaniesOnlyIngestionService();
  await ingestionService.run();
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    logger.error('Script failed:', error);
    process.exit(1);
  });
}

export { CompaniesOnlyIngestionService }; 