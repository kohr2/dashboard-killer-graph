import { ContactService } from '../../../../../src/extensions/crm/application/services/contact.service';
import { ContactRepository } from '../../../../../src/extensions/crm/domain/repositories/contact-repository';
import {
  Person,
} from '../../../../../src/extensions/crm/domain/ontology/o-cream-v2';
import { CreateContactDto, UpdateContactDto } from '../../../../../src/extensions/crm/application/dto/contact.dto';
import { OCreamV2Ontology } from '../../../../../src/extensions/crm/domain/ontology/o-cream-v2';
import { ContactOntology } from '../../../../../src/extensions/crm/domain/entities/contact-ontology';

jest.mock('../../../../../src/extensions/crm/domain/repositories/contact-repository');

const mockPerson = {
  id: 'contact-123',
  name: 'John Doe',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  category: 'AGENTIVEPHYSICALOBJECT' as any,
  createdAt: new Date(),
  updatedAt: new Date(),
  activities: [],
  knowledgeElements: [],
  ontologyMetadata: {},
  personalInfo: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com'
  },
  addKnowledgeElement: jest.fn(),
  addActivity: jest.fn(),
  markAsModified: jest.fn(),
  getName: () => 'John Doe',
};

jest.mock('../../../../../src/extensions/crm/domain/ontology/o-cream-v2', () => ({
  ...jest.requireActual('../../../../../src/extensions/crm/domain/ontology/o-cream-v2'),
  OCreamV2Ontology: {
    getInstance: jest.fn().mockReturnValue({
      addEntity: jest.fn(),
      getEntity: jest.fn(),
      removeEntity: jest.fn(),
    }),
  },
}));

jest.mock('../../../../../src/extensions/crm/domain/entities/contact-ontology', () => ({
  ContactOntology: {
    createOCreamContact: jest.fn((dto) => ({
      ...mockPerson,
      id: 'new-id',
      ...dto,
      name: `${dto.firstName} ${dto.lastName}`,
      personalInfo: { ...dto },
    })),
    OCreamContactEntitySchema: {
      safeParse: jest.fn((c) => ({ success: true, data: c })),
    },
  },
}));

describe('ContactService', () => {
  let contactService: ContactService;
  let mockContactRepository: jest.Mocked<ContactRepository>;
  let mockOntology: jest.Mocked<ReturnType<typeof OCreamV2Ontology.getInstance>>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContactRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
      findAll: jest.fn(),
      findByEmail: jest.fn(),
    };
    contactService = new ContactService(mockContactRepository);
    // Get the mocked instance here
    mockOntology = OCreamV2Ontology.getInstance() as any;
  });

  describe('getContactById', () => {
    it('should return a contact DTO when a contact is found', async () => {
      const contactId = 'contact-123';
      mockContactRepository.findById.mockResolvedValue(mockPerson as any);
      const result = await contactService.getContactById(contactId);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(contactId);
      expect(result?.firstName).toBe('John');
      expect(mockContactRepository.findById).toHaveBeenCalledWith(contactId);
    });

    it('should return null when a contact is not found', async () => {
      mockContactRepository.findById.mockResolvedValue(null);
      const result = await contactService.getContactById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('createContact', () => {
    it('should create a contact and return a DTO', async () => {
      const contactData: CreateContactDto = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
      };
      const savedContact = { ...mockPerson, ...contactData, id: 'new-id' };
      mockContactRepository.save.mockResolvedValue(savedContact as any);
      const result = await contactService.createContact(contactData);
      expect(ContactOntology.createOCreamContact).toHaveBeenCalledWith(contactData);
      expect(mockOntology.addEntity).toHaveBeenCalled();
      expect(mockContactRepository.save).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result?.id).toBe('new-id');
      expect(result?.email).toBe('jane.doe@example.com');
    });
  });

  describe('updateContact', () => {
    it('should update a contact and return the updated DTO', async () => {
      const contactId = 'contact-123';
      const updates: UpdateContactDto = { firstName: 'Johnathan' };
      const updatedContact = { ...mockPerson, ...updates };
      
      mockOntology.getEntity.mockReturnValue(mockPerson);
      mockContactRepository.save.mockResolvedValue(updatedContact as any);

      const result = await contactService.updateContact(contactId, updates);
      
      expect(mockOntology.getEntity).toHaveBeenCalledWith(contactId);
      expect(mockContactRepository.save).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result?.firstName).toBe('Johnathan');
    });
  });

  describe('deleteContact', () => {
    it('should delete a contact', async () => {
      const contactId = 'contact-to-delete';
      mockOntology.getEntity.mockReturnValue(mockPerson);
      mockContactRepository.delete.mockResolvedValue(undefined);
      await contactService.deleteContact(contactId);
      expect(mockOntology.getEntity).toHaveBeenCalledWith(contactId);
      expect(mockContactRepository.delete).toHaveBeenCalledWith(contactId);
      expect(mockOntology.removeEntity).toHaveBeenCalledWith(contactId);
    });
  });
}); 