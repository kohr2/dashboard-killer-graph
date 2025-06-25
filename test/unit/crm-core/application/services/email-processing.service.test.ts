import { EmailProcessingService } from '../../../../../src/crm-core/application/services/email-processing.service';
import { SpacyEntityExtractionService } from '../../../../../src/crm-core/application/services/spacy-entity-extraction.service';
import { CommunicationRepository } from '../../../../../src/crm-core/domain/repositories/communication-repository';

jest.mock('../../../../../src/crm-core/application/services/spacy-entity-extraction.service');
jest.mock('../../../../../src/crm-core/domain/repositories/communication-repository');

describe('EmailProcessingService', () => {
  let processingService: EmailProcessingService;
  let mockNlpService: jest.Mocked<SpacyEntityExtractionService>;
  let mockCommRepository: jest.Mocked<CommunicationRepository>;

  beforeEach(() => {
    mockNlpService = new (SpacyEntityExtractionService as any)();
    mockCommRepository = { save: jest.fn() } as any;
    processingService = new EmailProcessingService(mockNlpService, mockCommRepository);
  });

  it('should be defined', () => {
    expect(processingService).toBeDefined();
  });
});
