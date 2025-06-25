
import { CreateContactUseCase, CreateContactRequest } from '../../../../../../src/crm-core/application/use-cases/contact/create-contact.use-case';
import { ContactRepository } from '../../../../../../src/crm-core/domain/repositories/contact-repository';
import { Contact } from '../../../../../../src/crm-core/domain/entities/contact';
import { oCreamV2, createOCreamContact } from '../../../../../../src/crm-core/domain/ontology/o-cream-v2';

jest.mock('../../../../../../src/crm-core/domain/repositories/contact-repository');
jest.mock('../../../../../../src/crm-core/domain/entities/contact');
jest.mock('../../../../../../src/crm-core/domain/ontology/o-cream-v2', () => ({
  oCreamV2: {
    addEntity: jest.fn(),
  },
  createOCreamContact: jest.fn(),
}));

describe('CreateContactUseCase', () => {
  let useCase: CreateContactUseCase;
  let mockContactRepository: jest.Mocked<ContactRepository>;
  const mockDate = new Date();

  beforeEach(() => {
    mockContactRepository = new (ContactRepository as any)();
    useCase = new CreateContactUseCase(mockContactRepository);
    jest.clearAllMocks();
  });

  describe('Validation', () => {
    it('should return a failure response if firstName is missing', async () => {
      const request: CreateContactRequest = { firstName: ' ', lastName: 'Doe', email: 'test@test.com' };
      const response = await useCase.execute(request);
      expect(response.success).toBe(false);
      expect(response.message).toBe('First name is required');
    });

    it('should return a failure response if lastName is missing', async () => {
      const request: CreateContactRequest = { firstName: 'John', lastName: '  ', email: 'test@test.com' };
      const response = await useCase.execute(request);
      expect(response.success).toBe(false);
      expect(response.message).toBe('Last name is required');
    });

    it('should return a failure response if email is missing', async () => {
      const request: CreateContactRequest = { firstName: 'John', lastName: 'Doe', email: '' };
      const response = await useCase.execute(request);
      expect(response.success).toBe(false);
      expect(response.message).toBe('Email is required');
    });
  });

  describe('Success case', () => {
    it('should create a contact and return a success response', async () => {
      const request: CreateContactRequest = { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' };
      
      const mockContactInstance = {
        getId: jest.fn().mockReturnValue('contact-123'),
        getName: jest.fn().mockReturnValue('John Doe'),
        getEmail: jest.fn().mockReturnValue('john.doe@example.com'),
        getPhone: jest.fn().mockReturnValue(undefined),
        getCreatedAt: jest.fn().mockReturnValue(mockDate),
      };

      const mockOCreamEntity = {
        id: 'ocream-123',
        addActivity: jest.fn(),
      };

      (Contact as jest.Mock).mockImplementation(() => mockContactInstance);
      mockContactRepository.save.mockResolvedValue(mockContactInstance as any);
      (createOCreamContact as jest.Mock).mockReturnValue(mockOCreamEntity);

      const response = await useCase.execute(request);

      expect(mockContactRepository.save).toHaveBeenCalledWith(mockContactInstance);
      expect(createOCreamContact).toHaveBeenCalled();
      expect(oCreamV2.addEntity).toHaveBeenCalledTimes(2);
      expect(mockOCreamEntity.addActivity).toHaveBeenCalled();
      expect(response.success).toBe(true);
      expect(response.id).toBe('contact-123');
      expect(response.contact?.ontologyStatus).toBe('registered');
    });
  });
});

