import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { ContentProcessingService } from './content-processing.service';
import { Neo4jIngestionService } from './neo4j-ingestion.service';
import { EmailFixtureGenerationService } from '../fixtures/email-fixture-generation.service';
import { OntologyBuildService, BuildOptions } from '@platform/ontology/ontology-build.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { simpleParser } from 'mailparser';
import { logger } from '@common/utils/logger';
import { GenericIngestionPipeline, IngestionInput } from '@ingestion/pipeline/generic-ingestion-pipeline';

/**
 * Service for ingesting ontology-specific fixture emails into the database
 * This service builds the ontology, generates a fixture email, and ingests it
 * while keeping the data in the database (no cleanup)
 */
export class OntologyEmailIngestionService {
  private ontologyService: OntologyService;
  private contentProcessingService: ContentProcessingService;
  private neo4jIngestionService: Neo4jIngestionService;
  private emailFixtureGenerationService: EmailFixtureGenerationService;
  private ontologyBuildService: OntologyBuildService;

  constructor() {
    this.ontologyService = container.resolve(OntologyService);
    this.contentProcessingService = container.resolve(ContentProcessingService);
    this.neo4jIngestionService = container.resolve(Neo4jIngestionService);
    this.emailFixtureGenerationService = container.resolve(EmailFixtureGenerationService);
    this.ontologyBuildService = container.resolve(OntologyBuildService);
  }

  /**
   * Ingest a fixture email for the specified ontology
   * @param ontologyName - The name of the ontology (e.g., 'fibo', 'procurement')
   * @param buildOptions - Optional build options to limit entities/relationships
   * @param generateNewEmail - If true, generate a new email; otherwise use existing fixture
   * @param emailPath - If provided, use this email file instead of default logic
   */
  async ingestOntologyEmail(ontologyName: string, buildOptions?: Partial<BuildOptions>, generateNewEmail: boolean = false, emailPath?: string): Promise<void> {
    logger.info(`🚀 Starting ontology email ingestion for: ${ontologyName}`);

    try {
      // Step 1: Build ontology service
      await this.buildOntologyService(ontologyName, buildOptions);

      // Step 2: Get fixture email (generate if asked, else use existing, or use provided path)
      const emailContent = await this.getFixtureEmail(ontologyName, generateNewEmail, emailPath);

      // Step 3: Process and ingest email
      await this.processAndIngestEmail(emailContent, ontologyName);

      // Step 4: Gracefully close Neo4j resources so the Node process can exit
      await this.neo4jIngestionService.close();

      logger.info(`✅ Successfully ingested ontology email for: ${ontologyName}`);
    } catch (error) {
      logger.error(`❌ Failed to ingest ontology email for ${ontologyName}:`, error);
      throw error;
    }
  }

  /**
   * Step 1: Build ontology service
   */
  private async buildOntologyService(ontologyName: string, buildOptions?: Partial<BuildOptions>): Promise<void> {
    logger.info(`🔧 Step 1: Building ontology service for ${ontologyName}`);
    
    try {
      // Register only the selected ontology (plus core) if ontologyName is provided, otherwise register all
      if (ontologyName) {
        const { registerSelectedOntologies } = require('../../register-ontologies');
        registerSelectedOntologies([ontologyName]);
      } else {
        const { registerAllOntologies } = require('../../register-ontologies');
        registerAllOntologies();
      }
      
      // If build options are provided, use the ontology build service
      if (buildOptions) {
        await this.ontologyBuildService.buildOntologyByName(ontologyName, buildOptions);
        logger.info(`✅ Built ontology ${ontologyName} with options:`, buildOptions);
      }
      
      // Verify the ontology exists
      const ontologies = this.ontologyService.getAllOntologies();
      const ontology = ontologies.find((o: any) => o.name.toLowerCase() === ontologyName.toLowerCase());
      
      if (!ontology) {
        throw new Error(`Ontology '${ontologyName}' not found. Available ontologies: ${ontologies.map((o: any) => o.name).join(', ')}`);
      }
      
      logger.info(`✅ Ontology service built successfully for ${ontologyName}`);
    } catch (error) {
      logger.error(`❌ Failed to build ontology service for ${ontologyName}:`, error);
      throw error;
    }
  }

  /**
   * Step 2: Get fixture email (generate if asked, else use existing, or use provided path)
   */
  private async getFixtureEmail(ontologyName: string, generateNewEmail: boolean, emailPath?: string): Promise<string> {
    logger.info(`📧 Step 2: Getting fixture email for ${ontologyName}`);
    if (emailPath) {
      // Use the provided email file
      const emailContent = await fs.readFile(emailPath, 'utf-8');
      logger.info(`✅ Loaded provided email file: ${emailPath}`);
      return emailContent;
    }
    if (generateNewEmail) {
      // Use the EmailFixtureGenerationService to generate a fixture email
      const generatedPath = await this.emailFixtureGenerationService.generateSingleEmailFixture(ontologyName);
      const emailContent = await fs.readFile(generatedPath, 'utf-8');
      logger.info(`✅ Generated new fixture email for ${ontologyName}`);
      return emailContent;
    } else {
      // Use the first existing fixture email for the ontology
      const fixtureDir = path.join(__dirname, '../../../test/fixtures', ontologyName, 'emails');
      const files = await fs.readdir(fixtureDir);
      const emlFiles = files.filter(f => f.endsWith('.eml'));
      if (emlFiles.length === 0) {
        throw new Error(`No fixture emails found for ontology '${ontologyName}' in ${fixtureDir}`);
      }
      const selectedEmail = emlFiles.sort()[0];
      const emailPath = path.join(fixtureDir, selectedEmail);
      const emailContent = await fs.readFile(emailPath, 'utf-8');
      logger.info(`✅ Loaded existing fixture email: ${emailPath}`);
      return emailContent;
    }
  }

  /**
   * Step 3: Process and ingest email
   */
  private async processAndIngestEmail(emailContent: string, ontologyName: string): Promise<void> {
    logger.info(`🔄 Step 3: Processing and ingesting email for ${ontologyName}`);
    
    try {
      // Ensure Neo4j connection is initialized
      await this.neo4jIngestionService.initialize();

      // Create ingestion pipeline
      const pipeline = new GenericIngestionPipeline(
        this.contentProcessingService,
        this.neo4jIngestionService,
        undefined,
        undefined, // relationshipInferenceService - will use default
        (input: IngestionInput) => input.content,
        ontologyName
      );

      // Create email input
      const emailInput: IngestionInput = {
        id: `fixture-email-${ontologyName}-${Date.now()}`,
        content: emailContent,
        meta: {
          source: 'fixture',
          ontology: ontologyName,
          type: 'email'
        }
      };

      // Process through pipeline
      await pipeline.run([emailInput]);
      
      logger.info(`✅ Successfully processed and ingested email for ${ontologyName}`);
    } catch (error) {
      logger.error(`❌ Failed to process and ingest email for ${ontologyName}:`, error);
      throw error;
    }
  }
} 