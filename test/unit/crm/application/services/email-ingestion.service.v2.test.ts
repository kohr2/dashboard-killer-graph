import { EmailIngestionService } from '../../../../../src/ontologies/crm/application/services/email-ingestion.service';
import { EmailProcessingService } from '../../../../../src/ontologies/crm/application/services/email-processing.service';
import { AccessControlService } from '../../../../../src/platform/security/application/services/access-control.service';
import { User } from '../../../../../src/platform/security/domain/user';
import { GUEST_ROLE, ANALYST_ROLE } from '../../../../../src/platform/security/domain/role';

jest.mock('../../../../../src/ontologies/crm/application/services/email-processing.service');
jest.mock('../../../../../src/platform/security/application/services/access-control.service');

describe('EmailIngestionService', () => {
  let ingestionService: EmailIngestionService;
  let mockProcessingService: jest.Mocked<EmailProcessingService>;
  let mockAccessControlService: jest.Mocked<AccessControlService>;

  const analystUser: User = { id: 'analyst-1', username: 'analyst', roles: [ANALYST_ROLE] };
  const guestUser: User = { id: 'guest-1', username: 'guest', roles: [GUEST_ROLE] };

  beforeEach(() => {
    mockProcessingService = new (EmailProcessingService as any)();
    mockProcessingService.processEmlFile = jest.fn();
    mockAccessControlService = new (AccessControlService as any)();
    ingestionService = new EmailIngestionService(mockProcessingService, {} as any, mockAccessControlService);
  });

  it('should call the processing service when user has permission', async () => {
    const filePath = '/test-emails/01.eml';
    mockAccessControlService.can.mockReturnValue(true);
    (mockProcessingService.processEmlFile as jest.Mock).mockResolvedValue({ success: true });
    
    const result = await ingestionService.ingestEmail(analystUser, {} as any, filePath);
    
    expect(mockAccessControlService.can).toHaveBeenCalledWith(analystUser, 'create', 'Communication');
    expect(mockProcessingService.processEmlFile).toHaveBeenCalledWith(filePath);
    expect(result.success).toBe(true);
  });
  
  it('should throw an error if the user does not have permission', async () => {
    const filePath = '/test-emails/01.eml';
    mockAccessControlService.can.mockReturnValue(false);

    await expect(ingestionService.ingestEmail(guestUser, {} as any, filePath)).rejects.toThrow('Access denied');
    expect(mockAccessControlService.can).toHaveBeenCalledWith(guestUser, 'create', 'Communication');
    expect(mockProcessingService.processEmlFile).not.toHaveBeenCalled();
  });

  it('should return a failure message if no EML file path is provided', async () => {
    const result = await ingestionService.ingestEmail(analystUser, {} as any);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Direct email object ingestion not implemented');
    expect(mockProcessingService.processEmlFile).not.toHaveBeenCalled();
  });
});
