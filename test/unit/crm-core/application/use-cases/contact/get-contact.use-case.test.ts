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
  const mockDate = new Date();

  beforeEach(() => {
    mockContactRepository = { findById: jest.fn() } as any;
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
      getId: () => '123',
      getName: () => 'John Doe',
      getEmail: () => 'j.doe@example.com',
      getPhone: () => '123456',
      getCreatedAt: () => mockDate,
      getUpdatedAt: () => mockDate,
    };
    mockContactRepository.findById.mockResolvedValue(mockContact as any);
    const request: GetContactRequest = { id: '123' };
    const response = await useCase.execute(request);
    expect(response.success).toBe(true);
    expect(response.contact?.id).toBe('123');
    expect(response.contact?.ontologyData).toBeUndefined();
  });

  it('should include ontology data when requested', async () => {
    const mockContact = {
        getId: () => '123',
        getName: () => 'John Doe',
        getEmail: () => 'j.doe@example.com',
        getPhone: () => undefined,
        getCreatedAt: () => mockDate,
        getUpdatedAt: () => mockDate,
    };
    const mockOCreamContact = {
        getKnowledgeElements: () => [],
        activities: [],
        relationships: [],
        ontologyMetadata: { validationStatus: 'valid' },
        validateOntology: () => true,
    };
    mockContactRepository.findById.mockResolvedValue(mockContact as any);
    (oCreamV2.getEntity as jest.Mock).mockReturnValue(mockOCreamContact);
    const request: GetContactRequest = { id: '123', includeOntologyData: true };
    const response = await useCase.execute(request);
    expect(response.success).toBe(true);
    expect(oCreamV2.getEntity).toHaveBeenCalledWith('123');
    expect(response.contact?.ontologyData).toBeDefined();
  });
});

