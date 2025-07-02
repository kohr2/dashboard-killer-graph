import { EmailIngestionService, IncomingEmail } from '@crm/application/services/email-ingestion.service';
import { EmailProcessingService, EmailProcessingResult } from '@crm/application/services/email-processing.service';
import { AccessControlService } from '@platform/security/application/services/access-control.service';
import { User } from '@platform/security/domain/user';
import { GUEST_ROLE, ANALYST_ROLE } from '@platform/security/domain/role';
import { ContactRepository } from '@crm/domain/repositories/contact-repository';
import { CommunicationRepository } from '@crm/domain/repositories/communication-repository';
import { SpacyEntityExtractionService } from '@crm/application/services/spacy-entity-extraction.service';

jest.mock('@crm/application/services/email-processing.service');
jest.mock('@platform/security/application/services/access-control.service');

const mockProcessingResult: EmailProcessingResult = {
  email: {} as any,
  entityExtraction: {} as any,
  contactResolution: {} as any,
  knowledgeGraphInsertions: {} as any,
  businessInsights: {} as any,
  recommendations: [],
};

describe('EmailIngestionService', () => {
  let ingestionService: EmailIngestionService;
  let mockProcessingService: jest.Mocked<EmailProcessingService>;
  let mockAccessControlService: jest.Mocked<AccessControlService>;

  const analystUser: User = { id: 'analyst-1', username: 'analyst', roles: [ANALYST_ROLE] };
  const guestUser: User = { id: 'guest-1', username: 'guest', roles: [GUEST_ROLE] };

  beforeEach(() => {
    // We need to provide mock instances for the constructor of the mocked service
    const mockContactRepo = {} as jest.Mocked<ContactRepository>;
    const mockCommRepo = {} as jest.Mocked<CommunicationRepository>;
    const mockExtractor = {} as jest.Mocked<SpacyEntityExtractionService>;

    mockProcessingService = new EmailProcessingService(mockContactRepo, mockCommRepo, mockExtractor) as jest.Mocked<EmailProcessingService>;
    mockAccessControlService = new AccessControlService() as jest.Mocked<AccessControlService>;
    
    // Setup default mock behaviors
    mockProcessingService.processEmlFile = jest.fn();
    mockAccessControlService.can = jest.fn();

    ingestionService = new EmailIngestionService(mockProcessingService, {} as any, mockAccessControlService);
  });

  it('should call the processing service when user has permission', async () => {
    const filePath = '/test-emails/01.eml';
    mockAccessControlService.can.mockReturnValue(true);
    mockProcessingService.processEmlFile.mockResolvedValue(mockProcessingResult);
    
    const result = await ingestionService.ingestEmail(analystUser, {} as IncomingEmail, filePath);
    
    expect(mockAccessControlService.can).toHaveBeenCalledWith(analystUser, 'create', 'Communication');
    expect(mockProcessingService.processEmlFile).toHaveBeenCalledWith(filePath);
    expect(result.success).toBe(true);
  });
  
  it('should throw an error if the user does not have permission', async () => {
    const filePath = '/test-emails/01.eml';
    mockAccessControlService.can.mockReturnValue(false);

    await expect(ingestionService.ingestEmail(guestUser, {} as IncomingEmail, filePath)).rejects.toThrow('Access denied');
    expect(mockAccessControlService.can).toHaveBeenCalledWith(guestUser, 'create', 'Communication');
    expect(mockProcessingService.processEmlFile).not.toHaveBeenCalled();
  });

  it('should return a failure message if no EML file path is provided', async () => {
    mockAccessControlService.can.mockReturnValue(true);
    const result = await ingestionService.ingestEmail(analystUser, {} as IncomingEmail);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Direct email object ingestion not implemented');
    expect(mockProcessingService.processEmlFile).not.toHaveBeenCalled();
    expect(mockAccessControlService.can).toHaveBeenCalledWith(analystUser, 'create', 'Communication');
  });
});
