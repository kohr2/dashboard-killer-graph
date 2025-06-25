import { GetContactUseCase, GetContactRequest } from '../../../../../../src/crm-core/application/use-cases/contact/get-contact.use-case';
import { ContactRepository } from '../../../../../../src/crm-core/domain/repositories/contact-repository';
import { oCreamV2 } from '../../../../../../src/crm-core/domain/ontology/o-cream-v2';

jest.mock('../../../../../../src/crm-core/domain/repositories/contact-repository');
jest.mock('../../../../../../src/crm-core/domain/ontology/o-cream-v2', () => ({
  oCreamV2: {
    getEntity: jest.fn(),
    getRelationshipsForEntity: jest.fn(),
  },
}));

describe('GetContactUseCase', () => {
  let useCase: GetContactUseCase;
  let mockContactRepository: jest.Mocked<ContactRepository>;

  beforeEach(() => {
    mockContactRepository = {
      findById: jest.fn(),
    } as any;
    useCase = new GetContactUseCase(mockContactRepository);
    jest.clearAllMocks();
  });

  it('should return failure when ID is missing', async () => {
    const request: GetContactRequest = { id: ' ' };
    const response = await useCase.execute(request);
    expect(response.success).toBe(false);
    expect(response.message).toBe('Contact ID is required');
  });

  it('should return failure when contact is not found', async () => {
    mockContactRepository.findById.mockResolvedValue(null);
    const request: GetContactRequest = { id: 'not-found-id' };
    const response = await useCase.execute(request);
    expect(response.success).toBe(false);
    expect(response.message).toBe('Contact not found');
  });

  it('should return basic contact data when found', async () => {
    const mockContact = {
      id: '123',
      getName: () => 'John Doe',
      personalInfo: { email: 'j.doe@example.com', phone: '123456' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockContactRepository.findById.mockResolvedValue(mockContact as any);
    const request: GetContactRequest = { id: '123' };
    const response = await useCase.execute(request);
    expect(response.success).toBe(true);
    expect(response.contact?.id).toBe('123');
    expect(response.contact?.name).toBe('John Doe');
    expect(response.contact?.ontologyData).toBeUndefined();
  });

  it('should include ontology data when requested', async () => {
    const mockContact = {
      id: '123',
      getName: () => 'John Doe',
      personalInfo: { email: 'j.doe@example.com' },
      createdAt: new Date(),
      updatedAt: new Date(),
      knowledgeElements: [],
      activities: [],
      ontologyMetadata: { validationStatus: 'valid' },
    };
    mockContactRepository.findById.mockResolvedValue(mockContact as any);
    (oCreamV2.getEntity as jest.Mock).mockReturnValue(mockContact);
    const request: GetContactRequest = { id: '123', includeOntologyData: true };
    const response = await useCase.execute(request);
    expect(response.success).toBe(true);
    expect(response.contact?.ontologyData).toBeDefined();
    expect(response.contact?.ontologyData?.ontologyHealth.validationStatus).toBe('valid');
  });
});

