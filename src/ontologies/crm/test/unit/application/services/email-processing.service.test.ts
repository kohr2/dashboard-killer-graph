import { EmailProcessingService } from '../../../../application/services/email-processing.service';
import { CommunicationRepository } from '../../../../domain/repositories/communication-repository';
import { ContactRepository } from '../../../../domain/repositories/contact-repository';
import { SpacyEntityExtractionService, EntityType } from '../../../../application/services/spacy-entity-extraction.service';
import { OCreamV2Ontology } from '../../../../domain/ontology/o-cream-v2';
import * as fs from 'fs';
import * as path from 'path';

const { EmailProcessingService: ActualEmailProcessingService } = jest.requireActual('../../../../application/services/email-processing.service');

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('../../../../application/services/spacy-entity-extraction.service');
jest.mock('../../../../domain/repositories/contact-repository');
jest.mock('../../../../domain/repositories/communication-repository');
jest.mock('../../../../domain/ontology/o-cream-v2', () => {
  const originalModule = jest.requireActual(
    '../../../../domain/ontology/o-cream-v2',
  );
  return {
    ...originalModule,
    OCreamV2Ontology: {
      getInstance: jest.fn().mockReturnValue({
        addEntity: jest.fn(),
        addRelationship: jest.fn(),
        isLiteral: jest.fn().mockReturnValue(false),
      }),
    },
  };
});

describe('EmailProcessingService', () => {
  let processingService: EmailProcessingService;
  let mockContactRepository: jest.Mocked<ContactRepository>;
  let mockCommunicationRepository: jest.Mocked<CommunicationRepository>;
  let mockEntityExtractor: jest.Mocked<SpacyEntityExtractionService>;
  let mockFs: jest.Mocked<typeof fs>;
  let mockPath: jest.Mocked<typeof path>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContactRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
    } as any;

    mockCommunicationRepository = {
      save: jest.fn(),
      linkEntitiesToCommunication: jest.fn(),
      updateProperties: jest.fn(),
    } as any;

    mockEntityExtractor = {
      extractEmailEntities: jest.fn(),
    } as any;

    mockFs = fs as jest.Mocked<typeof fs>;
    mockPath = path as jest.Mocked<typeof path>;

    // Instantiate the service with mocked dependencies
    processingService = new ActualEmailProcessingService(
      mockContactRepository,
      mockCommunicationRepository,
      mockEntityExtractor,
    );

    // Common mock implementations
    mockFs.readFileSync.mockReturnValue('Subject: Test\n\nBody');
    mockCommunicationRepository.save.mockResolvedValue({
      id: 'comm-123',
    } as any);
    mockEntityExtractor.extractEmailEntities.mockResolvedValue({
      entities: [
        {
          value: 'John Doe',
          type: EntityType.PERSON_NAME,
          confidence: 0.95,
          startIndex: 0,
          endIndex: 8,
          context: 'email body',
          spacyLabel: 'PERSON',
        },
      ],
      entityCount: 1,
      confidence: 0.9,
      entityTypes: [EntityType.PERSON_NAME],
      processingTime: 120,
      metadata: {
        textLength: 150,
        extractionMethod: 'spacy',
        nlpModel: 'en_core_web_lg',
      },
    });

    // Mock private methods/dependencies if necessary for a specific test
    // This is an example of how you might mock a private method if needed
    (processingService as any).resolveContacts = jest.fn().mockResolvedValue({
      sender: { getId: jest.fn().mockReturnValue('contact-123') },
      recipients: [],
      newContacts: [],
    });
  });

  describe('processEmlFile', () => {
    it('should parse a simple email, save a communication, and update ontology', async () => {
      const result = await processingService.processEmlFile(
        'dummy/path/to/email.eml',
      );

      expect(mockEntityExtractor.extractEmailEntities).toHaveBeenCalled();
      expect(mockCommunicationRepository.save).toHaveBeenCalled();
      expect(result.email.subject).toBe('Test');
    });

    it('should throw an error if the EML file cannot be read', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(
        processingService.processEmlFile('non-existent/path/to/email.eml'),
      ).rejects.toThrow('File not found');
    });
  });

  describe('processBatchEmlFiles', () => {
    it('should process all .eml files in a directory and return a summary', async () => {
      const emlFiles = ['test1.eml', 'test2.eml', 'other.txt'];
      mockFs.readdirSync.mockReturnValue(emlFiles as any);
      mockPath.join.mockImplementation((...args) => args.join('/'));

      // Since processEmlFile is complex, we can mock its implementation for this batch test
      const processEmlFileSpy = jest
        .spyOn(processingService, 'processEmlFile')
        .mockResolvedValue({
          email: { subject: 'Batch Test' } as any,
          entityExtraction: { entityCount: 2, confidence: 0.9 } as any,
          contactResolution: { newContacts: [{ id: 'new-1' }] } as any,
          businessInsights: { complianceFlags: [] } as any,
          financialAnalysis: null,
          knowledgeGraphInsertions: {
            entities: [],
            relationships: [],
            knowledgeElements: [],
            activities: [],
          },
          recommendations: [],
        });

      const summary = await processingService.processBatchEmlFiles(
        'dummy/directory',
      );

      expect(mockFs.readdirSync).toHaveBeenCalledWith('dummy/directory');
      expect(processEmlFileSpy).toHaveBeenCalledTimes(2); // .eml files only
      expect(processEmlFileSpy).toHaveBeenCalledWith(
        'dummy/directory/test1.eml',
      );
      expect(processEmlFileSpy).toHaveBeenCalledWith(
        'dummy/directory/test2.eml',
      );

      expect(summary.summary.totalEmails).toBe(2);
      expect(summary.summary.totalEntities).toBe(4);
      expect(summary.summary.totalContacts).toBe(2);
    });

    it('should handle errors for individual files and continue processing others', async () => {
      const emlFiles = ['good1.eml', 'bad.eml', 'good2.eml'];
      mockFs.readdirSync.mockReturnValue(emlFiles as any);
      mockPath.join.mockImplementation((...args) => args.join('/'));

      const processEmlFileSpy = jest
        .spyOn(processingService, 'processEmlFile')
        .mockImplementation(async (filePath) => {
          if (filePath.includes('bad.eml')) {
            throw new Error('Test processing error');
          }
          return {
            email: { subject: 'Batch Test' } as any,
            entityExtraction: { entityCount: 1 } as any,
            contactResolution: { newContacts: [] } as any,
            businessInsights: { complianceFlags: [] } as any,
          } as any;
        });
      
      const summary = await processingService.processBatchEmlFiles('dummy/directory');

      expect(processEmlFileSpy).toHaveBeenCalledTimes(3);
      expect(summary.summary.totalEmails).toBe(2); // Only two succeeded
      expect(summary.results).toHaveLength(2);
      // We could also check that console.error was called
    });
  });
});
