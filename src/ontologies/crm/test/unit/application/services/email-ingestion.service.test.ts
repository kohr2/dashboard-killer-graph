import 'reflect-metadata';
import { container } from 'tsyringe';
import { EmailIngestionService, IncomingEmail } from '@crm/application/services/email-ingestion.service';
import { User } from '@platform/security/domain/user';
import { ADMIN_ROLE } from '@platform/security/domain/role';
import { AccessControlService } from '@platform/security/application/services/access-control.service';
import { EmailProcessingService, EmailProcessingResult } from '@crm/application/services/email-processing.service';
import { ContactRepository } from '@crm/domain/repositories/contact-repository';

jest.mock('@crm/application/services/email-processing.service');
jest.mock('@platform/security/application/services/access-control.service');

describe('EmailIngestionService - Unit Test', () => {
    let emailIngestionService: EmailIngestionService;
    let processingService: jest.Mocked<EmailProcessingService>;
    let accessControlService: jest.Mocked<AccessControlService>;
    let user: User;

    const mockContactRepository: jest.Mocked<ContactRepository> = {
        findByEmail: jest.fn(),
        findById: jest.fn(),
        save: jest.fn(),
        findAll: jest.fn(),
        delete: jest.fn(),
        search: jest.fn(),
        addEmailToContact: jest.fn(),
    };

    beforeEach(() => {
        // Reset mocks and container before each test
        jest.clearAllMocks();
        container.clearInstances();

        processingService = new (EmailProcessingService as any)();
        accessControlService = new (AccessControlService as any)();
        user = { id: 'test-user', username: 'Test User', roles: [ADMIN_ROLE] };
        
        container.registerInstance(EmailProcessingService, processingService);
        container.registerInstance(AccessControlService, accessControlService);
        container.register<ContactRepository>('ContactRepository', { useValue: mockContactRepository });

        emailIngestionService = container.resolve(EmailIngestionService);
    });

    it('should deny access if user does not have create permission', async () => {
        accessControlService.can.mockReturnValue(false);

        await expect(
            emailIngestionService.ingestEmail(user, {} as IncomingEmail, 'dummy/path')
        ).rejects.toThrow('Access denied');

        expect(accessControlService.can).toHaveBeenCalledWith(user, 'create', 'Communication');
        expect(processingService.processEmlFile).not.toHaveBeenCalled();
    });

    it('should process an email from a file by calling the processing service', async () => {
        const emailFilePath = 'dummy/test.eml';
        accessControlService.can.mockReturnValue(true);
        processingService.processEmlFile.mockResolvedValue({} as EmailProcessingResult);

        const result = await emailIngestionService.ingestEmail(user, {} as IncomingEmail, emailFilePath);

        expect(accessControlService.can).toHaveBeenCalledWith(user, 'create', 'Communication');
        expect(processingService.processEmlFile).toHaveBeenCalledWith(emailFilePath);
        expect(result.success).toBe(true);
    });

    it('should return not implemented for direct email object ingestion', async () => {
        accessControlService.can.mockReturnValue(true);

        const result = await emailIngestionService.ingestEmail(user, {} as IncomingEmail);

        expect(result.success).toBe(false);
        expect(result.message).toContain('not implemented');
        expect(processingService.processEmlFile).not.toHaveBeenCalled();
    });
}); 