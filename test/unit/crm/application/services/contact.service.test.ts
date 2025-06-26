import { ContactService } from '../../../../../src/ontologies/crm/application/services/contact.service';
import { ContactRepository } from '../../../../../src/ontologies/crm/domain/repositories/contact-repository';
import {
  Person,
} from '../../../../../src/ontologies/crm/domain/ontology/o-cream-v2';
import { CreateContactDto, UpdateContactDto } from '../../../../../src/ontologies/crm/application/dto/contact.dto';
import { OCreamV2Ontology } from '../../../../../src/ontologies/crm/domain/ontology/o-cream-v2';
import { ContactOntology } from '../../../../../src/ontologies/crm/domain/entities/contact-ontology';

jest.mock('../../../../../src/ontologies/crm/domain/repositories/contact-repository');

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

jest.mock('../../../../../src/ontologies/crm/domain/ontology/o-cream-v2', () => ({
  ...jest.requireActual('../../../../../src/ontologies/crm/domain/ontology/o-cream-v2'),
  OCreamV2Ontology: {
    getInstance: jest.fn().mockReturnValue({
      addEntity: jest.fn(),
      getEntity: jest.fn(),
      removeEntity: jest.fn(),
    }),
  },
}));

jest.mock('../../../../../src/ontologies/crm/domain/entities/contact-ontology', () => ({
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
      addEmailToContact: jest.fn(),
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

    it('should throw an error if the contact to update is not found', async () => {
      const contactId = 'non-existent-id';
      const updates: UpdateContactDto = { firstName: 'Ghost' };

      mockOntology.getEntity.mockReturnValue(undefined);

      await expect(
        contactService.updateContact(contactId, updates),
      ).rejects.toThrow(`Contact with ID ${contactId} not found.`);

      expect(mockOntology.getEntity).toHaveBeenCalledWith(contactId);
      expect(mockContactRepository.save).not.toHaveBeenCalled();
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

  describe('searchContacts', () => {
    it('should return an array of contact DTOs matching the search criteria', async () => {
      const searchDto = { name: 'John' };
      const mockContacts = [mockPerson, { ...mockPerson, id: 'contact-456', name: 'Johnny' }];
      
      mockContactRepository.search.mockResolvedValue(mockContacts as any[]);

      const results = await contactService.searchContacts(searchDto);

      expect(mockContactRepository.search).toHaveBeenCalledWith(searchDto);
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('contact-123');
      expect(results[1].id).toBe('contact-456');
    });

    it('should return an empty array when no contacts match', async () => {
      const searchDto = { name: 'NonExistent' };
      mockContactRepository.search.mockResolvedValue([]);

      const results = await contactService.searchContacts(searchDto);

      expect(mockContactRepository.search).toHaveBeenCalledWith(searchDto);
      expect(results).toHaveLength(0);
    });
  });

  describe('addNoteToContact', () => {
    it('should add a note to a contact and return the updated contact DTO', async () => {
      const contactId = 'contact-123';
      const noteDto = {
        content: 'This is a test note.',
        authorId: 'user-1',
      };
      const updatedContact = { ...mockPerson };

      mockOntology.getEntity.mockReturnValue(mockPerson);
      mockContactRepository.save.mockResolvedValue(updatedContact as any);

      const result = await contactService.addNoteToContact(contactId, noteDto);

      expect(mockOntology.getEntity).toHaveBeenCalledWith(contactId);
      expect(mockOntology.addEntity).toHaveBeenCalled();
      expect(mockPerson.addKnowledgeElement).toHaveBeenCalled();
      expect(mockContactRepository.save).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result?.id).toBe(contactId);
    });

    it('should throw an error if the contact to add a note to is not found', async () => {
      const contactId = 'non-existent-id';
      const noteDto = {
        content: 'This note will fail.',
        authorId: 'user-1',
      };

      mockOntology.getEntity.mockReturnValue(undefined);

      await expect(
        contactService.addNoteToContact(contactId, noteDto),
      ).rejects.toThrow(`Contact with id ${contactId} not found`);

      expect(mockOntology.getEntity).toHaveBeenCalledWith(contactId);
      expect(mockContactRepository.save).not.toHaveBeenCalled();
    });
  });
}); 