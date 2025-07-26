import 'reflect-metadata';
import { OntologyEmailIngestionService } from '../ontology-email-ingestion.service';
import { OntologyService } from '../../platform/ontology/ontology.service';
import { ContentProcessingService } from '../../platform/processing/content-processing.service';
import { Neo4jIngestionService } from '../../platform/processing/neo4j-ingestion.service';
import { EmailFixtureGenerationService } from '../fixtures/email-fixture-generation.service';
import { OntologyBuildService } from '../../platform/ontology/ontology-build.service';
import { GenericIngestionPipeline } from '../pipeline/generic-ingestion-pipeline';
import { container } from 'tsyringe';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock dependencies
jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn(),
  },
  injectable: () => (constructor: any) => constructor,
  singleton: () => (constructor: any) => constructor,
}));
jest.mock('fs/promises');
jest.mock('path');
jest.mock('../../register-ontologies', () => ({
  registerSelectedOntologies: jest.fn(),
  registerAllOntologies: jest.fn(),
}));

const mockContainer = {
  resolve: jest.fn(),
};

const mockOntologyService = {
  getAllOntologies: jest.fn(),
  getOntology: jest.fn().mockReturnValue({ name: 'test-ontology' }),
} as any;

const mockContentProcessingService = {
  processContent: jest.fn(),
};

const mockNeo4jIngestionService = {
  initialize: jest.fn(),
  close: jest.fn(),
};

const mockEmailFixtureGenerationService = {
  generateEmailFixtures: jest.fn(),
  generateSingleEmailFixture: jest.fn().mockResolvedValue('/path/to/generated.eml'),
} as any;
const mockOntologyBuildService = {
  build: jest.fn(),
  buildOntologyByName: jest.fn().mockResolvedValue(undefined),
} as any;

const mockGenericIngestionPipeline = {
  run: jest.fn(),
};

// Get the mocked container from 'tsyringe'
// const tsyringe = jest.requireActual('tsyringe');

describe('OntologyEmailIngestionService', () => {
  let service: OntologyEmailIngestionService;
  let mockFs: jest.Mocked<typeof fs>;
  let mockPath: jest.Mocked<typeof path>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup container mock
    mockContainer.resolve
      .mockReturnValueOnce(mockOntologyService)
      .mockReturnValueOnce(mockContentProcessingService)
      .mockReturnValueOnce(mockNeo4jIngestionService)
      .mockReturnValueOnce(mockEmailFixtureGenerationService)
      .mockReturnValueOnce(mockOntologyBuildService);

    // Add missing mock methods
    mockOntologyService.getOntology = jest.fn().mockReturnValue({ name: 'test-ontology' });
    mockOntologyBuildService.buildOntologyByName = jest.fn().mockResolvedValue(undefined);
    mockEmailFixtureGenerationService.generateSingleEmailFixture = jest.fn().mockResolvedValue('/path/to/generated.eml');
    mockContentProcessingService.processContent = jest.fn().mockResolvedValue({ entities: [], relationships: [] });
    mockNeo4jIngestionService.initialize = jest.fn().mockResolvedValue(undefined);

    // Setup fs and path mocks
    mockFs = fs as jest.Mocked<typeof fs>;
    mockPath = path as jest.Mocked<typeof path>;

    // Mock path.join to return predictable paths
    mockPath.join.mockImplementation((...args) => args.join('/'));

    // Mock fs.readFile to return test email content
    mockFs.readFile.mockResolvedValue('test email content');
    mockFs.readdir.mockResolvedValue([
      'test1.eml',
      'test2.eml',
    ] as any);

    // Setup ontology service mock
    mockOntologyService.getAllOntologies.mockReturnValue([{ name: 'test-ontology' }]);
    mockOntologyService.getOntology.mockReturnValue({ name: 'test-ontology' });

    (container.resolve as jest.Mock).mockImplementation((service) => {
      if (service === OntologyService) return mockOntologyService;
      if (service === ContentProcessingService) return mockContentProcessingService;
      if (service === Neo4jIngestionService) return mockNeo4jIngestionService;
      if (service === EmailFixtureGenerationService) return mockEmailFixtureGenerationService;
      if (service === OntologyBuildService) return mockOntologyBuildService;
      return {};
    });

    service = new OntologyEmailIngestionService();
  });

  describe('constructor', () => {
    it('should resolve all required dependencies from container', () => {
      expect((container.resolve as jest.Mock)).toHaveBeenCalledWith(OntologyService);
      expect((container.resolve as jest.Mock)).toHaveBeenCalledWith(ContentProcessingService);
      expect((container.resolve as jest.Mock)).toHaveBeenCalledWith(Neo4jIngestionService);
      expect((container.resolve as jest.Mock)).toHaveBeenCalledWith(EmailFixtureGenerationService);
      expect((container.resolve as jest.Mock)).toHaveBeenCalledWith(OntologyBuildService);
    });
  });

  describe('ingestOntologyEmail', () => {
    const mockEmailContent = 'test email content';
    const ontologyName = 'test-ontology';

    beforeEach(() => {
      // Mock GenericIngestionPipeline constructor
      (GenericIngestionPipeline as any) = jest.fn().mockImplementation(() => mockGenericIngestionPipeline);
    });

    it('should successfully ingest ontology email with default parameters', async () => {
      // Mock successful execution
      mockGenericIngestionPipeline.run.mockResolvedValue(undefined);

      await service.ingestOntologyEmail(ontologyName);

      expect(mockGenericIngestionPipeline.run).toHaveBeenCalled();
      expect(mockNeo4jIngestionService.close).toHaveBeenCalled();
    });

    it('should successfully ingest ontology email with build options', async () => {
      const buildOptions = { topEntities: 100, topRelationships: 50 };
      mockGenericIngestionPipeline.run.mockResolvedValue(undefined);

      await service.ingestOntologyEmail(ontologyName, buildOptions);

      expect(mockOntologyBuildService.buildOntologyByName).toHaveBeenCalledWith(ontologyName, buildOptions);
      expect(mockGenericIngestionPipeline.run).toHaveBeenCalled();
    });

    it('should successfully ingest ontology email with provided email path', async () => {
      const emailPath = '/path/to/email.eml';
      mockGenericIngestionPipeline.run.mockResolvedValue(undefined);

      await service.ingestOntologyEmail(ontologyName, undefined, false, emailPath);

      expect(mockFs.readFile).toHaveBeenCalledWith(emailPath, 'utf-8');
      expect(mockGenericIngestionPipeline.run).toHaveBeenCalled();
    });

    it('should successfully ingest ontology email with generated email', async () => {
      const generatedPath = '/path/to/generated.eml';
      mockEmailFixtureGenerationService.generateSingleEmailFixture.mockResolvedValue(generatedPath);
      mockGenericIngestionPipeline.run.mockResolvedValue(undefined);

      await service.ingestOntologyEmail(ontologyName, undefined, true);

      expect(mockEmailFixtureGenerationService.generateSingleEmailFixture).toHaveBeenCalledWith(ontologyName);
      expect(mockFs.readFile).toHaveBeenCalledWith(generatedPath, 'utf-8');
      expect(mockGenericIngestionPipeline.run).toHaveBeenCalled();
    });

    it('should throw error when ontology is not found', async () => {
      mockOntologyService.getAllOntologies.mockReturnValue([
        { name: 'other-ontology', entities: [] }
      ]);

      await expect(service.ingestOntologyEmail(ontologyName))
        .rejects.toThrow(`Ontology '${ontologyName}' not found`);
    });

    it('should throw error when no fixture emails are found', async () => {
      mockFs.readdir.mockResolvedValue([]);

      await expect(service.ingestOntologyEmail(ontologyName))
        .rejects.toThrow(`No fixture emails found for ontology '${ontologyName}'`);
    });

    it('should throw error when ontology build fails', async () => {
      const buildError = new Error('Build failed');
      mockOntologyBuildService.buildOntologyByName.mockRejectedValue(buildError);

      await expect(service.ingestOntologyEmail(ontologyName, { topEntities: 100 }))
        .rejects.toThrow('Build failed');
    });

    it('should throw error when pipeline processing fails', async () => {
      const pipelineError = new Error('Pipeline failed');
      mockGenericIngestionPipeline.run.mockRejectedValue(pipelineError);

      await expect(service.ingestOntologyEmail(ontologyName))
        .rejects.toThrow('Pipeline failed');
    });

    it('should throw error when Neo4j initialization fails', async () => {
      const neo4jError = new Error('Neo4j failed');
      mockNeo4jIngestionService.initialize.mockRejectedValue(neo4jError);

      await expect(service.ingestOntologyEmail(ontologyName))
        .rejects.toThrow('Neo4j failed');
    });

    it('should handle case-insensitive ontology name matching', async () => {
      mockOntologyService.getAllOntologies.mockReturnValue([
        { name: 'TEST-ONTOLOGY', entities: [] }
      ]);
      mockGenericIngestionPipeline.run.mockResolvedValue(undefined);

      await service.ingestOntologyEmail('test-ontology');

      expect(mockGenericIngestionPipeline.run).toHaveBeenCalled();
    });

    it('should register selected ontologies when ontologyName is provided', async () => {
      const { registerSelectedOntologies } = require('../../register-ontologies');
      mockGenericIngestionPipeline.run.mockResolvedValue(undefined);

      await service.ingestOntologyEmail(ontologyName);

      expect(registerSelectedOntologies).toHaveBeenCalledWith([ontologyName]);
    });

    it('should register all ontologies when ontologyName is not provided', async () => {
      const { registerAllOntologies } = require('../../register-ontologies');
      mockGenericIngestionPipeline.run.mockResolvedValue(undefined);

      await service.ingestOntologyEmail('');

      expect(registerAllOntologies).toHaveBeenCalled();
    });
  });

  describe('private methods', () => {
    describe('buildOntologyService', () => {
      it('should build ontology service successfully', async () => {
        const buildOptions = { maxEntities: 100 };
        mockOntologyBuildService.buildOntologyByName.mockResolvedValue(undefined);

        // Access private method through any
        await (service as any).buildOntologyService('test-ontology', buildOptions);

        expect(mockOntologyBuildService.buildOntologyByName).toHaveBeenCalledWith('test-ontology', buildOptions);
      });

      it('should handle build service errors', async () => {
        const buildError = new Error('Build service error');
        mockOntologyBuildService.buildOntologyByName.mockRejectedValue(buildError);

        await expect((service as any).buildOntologyService('test-ontology', { maxEntities: 100 }))
          .rejects.toThrow('Build service error');
      });
    });

    describe('getFixtureEmail', () => {
      it('should load provided email path', async () => {
        const emailPath = '/custom/path/email.eml';
        const result = await (service as any).getFixtureEmail('test-ontology', false, emailPath);

        expect(mockFs.readFile).toHaveBeenCalledWith(emailPath, 'utf-8');
        expect(result).toBe('test email content');
      });

      it('should generate new email when requested', async () => {
        const generatedPath = '/generated/path/email.eml';
        mockEmailFixtureGenerationService.generateSingleEmailFixture.mockResolvedValue(generatedPath);

        const result = await (service as any).getFixtureEmail('test-ontology', true);

        expect(mockEmailFixtureGenerationService.generateSingleEmailFixture).toHaveBeenCalledWith('test-ontology');
        expect(mockFs.readFile).toHaveBeenCalledWith(generatedPath, 'utf-8');
        expect(result).toBe('test email content');
      });

      it('should load existing fixture email', async () => {
        const result = await (service as any).getFixtureEmail('test-ontology', false);

        expect(mockFs.readdir).toHaveBeenCalled();
        expect(mockFs.readFile).toHaveBeenCalledWith(path.join(process.cwd(), 'ontologies/test-ontology/fixtures/emails/test1.eml'), 'utf-8');
        expect(result).toBe('test email content');
      });

      it('should throw error when no fixture emails exist', async () => {
        mockFs.readdir.mockResolvedValue([]);

        await expect((service as any).getFixtureEmail('test-ontology', false))
          .rejects.toThrow(`No fixture emails found for ontology 'test-ontology'`);
      });
    });

    describe('processAndIngestEmail', () => {
      it('should process and ingest email successfully', async () => {
        mockGenericIngestionPipeline.run.mockResolvedValue(undefined);

        await (service as any).processAndIngestEmail('email content', 'test-ontology');

        expect(mockNeo4jIngestionService.initialize).toHaveBeenCalled();
        expect(mockGenericIngestionPipeline.run).toHaveBeenCalled();
      });

      it('should handle processing errors', async () => {
        const processingError = new Error('Processing failed');
        mockGenericIngestionPipeline.run.mockRejectedValue(processingError);

        await expect((service as any).processAndIngestEmail('email content', 'test-ontology'))
          .rejects.toThrow('Processing failed');
      });

      it('should handle Neo4j initialization errors', async () => {
        const neo4jError = new Error('Neo4j init failed');
        mockNeo4jIngestionService.initialize.mockRejectedValue(neo4jError);

        await expect((service as any).processAndIngestEmail('email content', 'test-ontology'))
          .rejects.toThrow('Neo4j init failed');
      });
    });
  });

  describe('run', () => {
    it('should call ingest with correct arguments', async () => {
      const argv = {
        scope: 'test-ontology',
        folder: '/path/to/emails',
        limit: '10',
        ci: 'true',
        llm: 'true',
        delete: 'false',
        generate: 'true',
      };
      await service.ingestOntologyEmail(argv.scope, undefined, argv.generate === 'true', argv.folder);
      expect((container.resolve as jest.Mock)).toHaveBeenCalledWith(OntologyService);
      expect((container.resolve as jest.Mock)).toHaveBeenCalledWith(
        ContentProcessingService,
      );
      expect((container.resolve as jest.Mock)).toHaveBeenCalledWith(Neo4jIngestionService);
      expect((container.resolve as jest.Mock)).toHaveBeenCalledWith(
        EmailFixtureGenerationService,
      );
      expect((container.resolve as jest.Mock)).toHaveBeenCalledWith(OntologyBuildService);
    });
  });
});