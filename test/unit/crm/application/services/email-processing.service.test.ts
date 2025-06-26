import { EmailProcessingService } from '@crm/application/services/email-processing.service';
import { CommunicationRepository } from '@crm/domain/repositories/communication-repository';
import { ContactRepository } from '@crm/domain/repositories/contact-repository';
import { SpacyEntityExtractionService } from '@crm/application/services/spacy-entity-extraction.service';
import { OCreamV2Ontology } from '@crm/domain/ontology/o-cream-v2';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('@crm/application/services/spacy-entity-extraction.service');
jest.mock('@crm/domain/repositories/contact-repository');
jest.mock('@crm/domain/repositories/communication-repository');
jest.mock('@crm/domain/ontology/o-cream-v2', () => {
  const originalModule = jest.requireActual(
    '@crm/domain/ontology/o-cream-v2',
  );
  return {
    ...originalModule,
    OCreamV2Ontology: {
      getInstance: jest.fn().mockReturnValue({
        addEntity: jest.fn(),
        addRelationship: jest.fn(),
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
    } as any;

    mockEntityExtractor = {
      extractEmailEntities: jest.fn(),
    } as any;

    mockFs = fs as jest.Mocked<typeof fs>;
    mockPath = path as jest.Mocked<typeof path>;

    // Instantiate the service with mocked dependencies
    processingService = new EmailProcessingService(
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
      entities: [],
      entityCount: 0,
      confidence: 0.9,
      entityTypes: [],
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

      const ontologyMock = OCreamV2Ontology.getInstance();

      expect(mockEntityExtractor.extractEmailEntities).toHaveBeenCalled();
      expect(mockCommunicationRepository.save).toHaveBeenCalled();
      expect(result.email.subject).toBe('Test');
      expect(ontologyMock.addEntity).toHaveBeenCalled();
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
  });
});
