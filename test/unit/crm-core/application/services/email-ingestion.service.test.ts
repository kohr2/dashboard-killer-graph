import { EmailIngestionService } from '@/crm-core/application/services/email-ingestion.service';
import { IContactRepository } from '@/crm-core/domain/repositories/i-contact-repository';
import { EmailProcessingService } from '@/crm-core/application/services/email-processing.service';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mocks
jest.mock('fs/promises');
jest.mock('@/crm-core/application/services/email-processing.service');
// jest.mock('@/crm-core/domain/repositories/i-contact-repository');

describe('EmailIngestionService', () => {
  let emailIngestionService: EmailIngestionService;
  let mockContactRepository: jest.Mocked<IContactRepository>;
  let mockEmailProcessingService: jest.Mocked<EmailProcessingService>;
  let mockFs: jest.Mocked<typeof fs>;

  beforeEach(() => {
    // Re-initialize mocks before each test
    mockContactRepository = {
      findByEmail: jest.fn(),
    } as unknown as jest.Mocked<IContactRepository>;

    mockEmailProcessingService = new EmailProcessingService(null, null, null) as jest.Mocked<EmailProcessingService>;
    mockEmailProcessingService.processEmail = jest.fn();

    mockFs = fs as jest.Mocked<typeof fs>;

    emailIngestionService = new EmailIngestionService(
      mockEmailProcessingService,
      mockContactRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(emailIngestionService).toBeDefined();
  });

  // We will add more tests here following the RED-GREEN-REFACTOR cycle.

});