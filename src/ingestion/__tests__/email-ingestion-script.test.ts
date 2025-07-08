import 'reflect-metadata';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import axios from 'axios';
import * as fs from 'fs';
import { simpleParser } from 'mailparser';
import { ContentProcessingService } from '@platform/processing/content-processing.service';
import { bootstrap } from '@src/bootstrap';
import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { Neo4jIngestionService } from '@platform/processing/neo4j-ingestion.service';
import { GenericIngestionPipeline } from '@ingestion/pipeline/generic-ingestion-pipeline';
import { ReasoningOrchestratorService } from '@platform/reasoning/reasoning-orchestrator.service';

// Mock all external dependencies
jest.mock('axios');
jest.mock('mailparser');
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readFile: jest.fn(),
    readdir: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedSimpleParser = simpleParser as jest.Mock;
const mockedFsPromises = fs.promises as jest.Mocked<typeof fs.promises>;

describe('EmailIngestionPipeline (script logic)', () => {
  beforeAll(async () => {
    bootstrap();
  });

  afterAll(async () => {
    // Clean up any connections
    try {
      const neo4jService = container.resolve(Neo4jIngestionService);
      await neo4jService.close();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process email files through the ingestion pipeline', async () => {
    // Mock file system operations
    mockedFsPromises.readdir.mockResolvedValue(['test.eml'] as any);
    mockedFsPromises.readFile.mockResolvedValue('email content');
    
    // Mock email parsing
    mockedSimpleParser.mockResolvedValue({
      text: 'email body text',
      subject: 'Test Subject',
      headers: new Map(),
    } as any);

    // Mock axios for NLP service calls
    mockedAxios.post.mockResolvedValue({ 
      data: { graphs: [] } 
    });

    // Mock OntologyService methods
    const mockOntologyService = {
      getIndexableEntityTypes: jest.fn().mockReturnValue(['Email']),
      getAllEntityTypes: jest.fn().mockReturnValue(['Email', 'Organization']),
    };
    container.registerInstance(OntologyService, mockOntologyService as any);

    // Mock ContentProcessingService
    const mockContentProcessing = {
      processContentBatch: jest.fn().mockResolvedValue([
        {
          entities: [
            {
              id: 'e1',
              name: 'Test Entity',
              type: 'Email',
              label: 'Email',
              properties: {},
            },
          ],
          relationships: [],
        },
      ]),
    };
    container.registerInstance(ContentProcessingService, mockContentProcessing as any);

    // Mock Neo4j services with proper cleanup
    const mockSession = {
      run: jest.fn().mockResolvedValue({ records: [] }),
      close: jest.fn().mockResolvedValue(undefined),
    };

    const mockNeo4jIngestionService = {
      initialize: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      ingestEntitiesAndRelationships: jest.fn().mockResolvedValue(undefined),
    };
    container.registerInstance(Neo4jIngestionService, mockNeo4jIngestionService as any);

    const mockNeo4jConnection = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      getDriver: jest.fn().mockReturnValue({
        session: () => mockSession,
        close: jest.fn().mockResolvedValue(undefined),
      }),
    };
    container.registerInstance(Neo4jConnection, mockNeo4jConnection as any);

    // Mock ReasoningOrchestratorService
    const mockReasoningOrchestrator = {
      executeAllReasoning: jest.fn().mockResolvedValue({ success: true, message: 'OK' }),
    };
    container.registerInstance(ReasoningOrchestratorService, mockReasoningOrchestrator as any);

    // Test the core pipeline logic directly
    const contentProcessing = container.resolve(ContentProcessingService);
    const neo4jService = container.resolve(Neo4jIngestionService);
    const reasoningOrchestrator = container.resolve(ReasoningOrchestratorService);
    
    await neo4jService.initialize();
    
    const pipeline = new GenericIngestionPipeline(contentProcessing, neo4jService, reasoningOrchestrator);

    // Simulate reading and parsing email files
    const files = ['test.eml'];
    const inputs = [];
    
    for (const file of files) {
      const raw = await mockedFsPromises.readFile(`test/fixtures/emails/${file}`, 'utf-8');
      const parsed = await mockedSimpleParser(raw);
      const body = typeof parsed.text === 'string' ? parsed.text : (parsed.html || '').replace(/<[^>]*>/g, '');
      inputs.push({ id: file, content: body, meta: { sourceFile: file } });
    }

    // Run the pipeline
    await pipeline.run(inputs);

    // Verify interactions
    expect(mockedFsPromises.readFile).toHaveBeenCalled();
    expect(mockedSimpleParser).toHaveBeenCalled();
    expect(mockContentProcessing.processContentBatch).toHaveBeenCalled();
    expect(mockNeo4jIngestionService.initialize).toHaveBeenCalled();
    expect(mockNeo4jIngestionService.ingestEntitiesAndRelationships).toHaveBeenCalled();
    
    await neo4jService.close();
    expect(mockNeo4jIngestionService.close).toHaveBeenCalled();
  }, 30000); // 30 second timeout
}); 