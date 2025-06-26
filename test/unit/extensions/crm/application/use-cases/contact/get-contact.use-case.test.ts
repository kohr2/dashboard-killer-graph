import { GetContactUseCase, GetContactRequest, GetContactResponse } from '@crm/application/use-cases/contact/get-contact.use-case';
import { ContactRepository } from '@crm/domain/repositories/contact-repository';
import { oCreamV2, KnowledgeType, ActivityType, OCreamContactEntity, Person } from '@crm/domain/ontology/o-cream-v2';

jest.mock('@crm/domain/repositories/contact-repository');

jest.mock('@crm/domain/ontology/o-cream-v2', () => {
  const originalModule = jest.requireActual('@crm/domain/ontology/o-cream-v2');
  return {
    ...originalModule,
    oCreamV2: {
      getEntity: jest.fn(),
      getRelationshipsForEntity: jest.fn(),
    },
  };
});

describe('GetContactUseCase', () => {
  let useCase: GetContactUseCase;
  let mockContactRepository: jest.Mocked<ContactRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContactRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
      findByEmail: jest.fn(),
    };
    useCase = new GetContactUseCase(mockContactRepository);
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
    const mockContact: any = {
      id: '123',
      getName: () => 'John Doe',
      personalInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'j.doe@example.com',
        phone: '123456',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockContactRepository.findById.mockResolvedValue(mockContact);
    const request: GetContactRequest = { id: '123' };
    const response = await useCase.execute(request);
    expect(response.success).toBe(true);
    expect(response.contact?.id).toBe('123');
    expect(response.contact?.name).toBe('John Doe');
    expect(response.contact?.ontologyData).toBeUndefined();
  });

  it('should include detailed ontology data and completeness score when requested', async () => {
    const mockContact: any = {
      id: '123',
      getName: () => 'John Doe',
      personalInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'j.doe@example.com',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      knowledgeElements: ['ke1'],
      activities: ['act1'],
      ontologyMetadata: { validationStatus: 'valid' },
    };
    const mockKnowledgeElement = {
      id: 'ke1',
      type: KnowledgeType.CUSTOMERPREFERENCES,
      title: 'Profile',
      reliability: 0.9,
      createdAt: new Date(),
    };
    const mockActivity = {
      id: 'act1',
      type: ActivityType.NEGOTIATION,
      name: 'Initial Meeting',
      startTime: new Date(),
      status: 'completed',
    };
    
    mockContactRepository.findById.mockResolvedValue(mockContact);
    (oCreamV2.getEntity as jest.Mock)
      .mockImplementation((id: string) => {
        if (id === 'ke1') return mockKnowledgeElement;
        if (id === 'act1') return mockActivity;
        return null;
      });

    const request: GetContactRequest = { id: '123', includeOntologyData: true };
    const response = await useCase.execute(request) as GetContactResponse;

    expect(response.success).toBe(true);
    expect(response.contact?.ontologyData).toBeDefined();
    expect(response.contact?.ontologyData?.knowledgeElements).toHaveLength(1);
    expect(response.contact?.ontologyData?.knowledgeElements[0].title).toBe('Profile');
    expect(response.contact?.ontologyData?.activities).toHaveLength(1);
    expect(response.contact?.ontologyData?.activities[0].name).toBe('Initial Meeting');
    expect(response.contact?.ontologyData?.ontologyHealth.completenessScore).toBeGreaterThan(0);
  });
}); 