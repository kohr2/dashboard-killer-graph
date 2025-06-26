import { ContactService } from '../../../../../src/ontologies/crm/application/services/contact.service';
import { ContactRepository } from '../../../../../src/ontologies/crm/domain/repositories/contact-repository';
import { Person } from '../../../../../src/ontologies/crm/domain/ontology/o-cream-v2';
import { CreateContactDto, UpdateContactDto } from '../../../../../src/ontologies/crm/application/dto/contact.dto';
import { OCreamV2Ontology } from '../../../../../src/ontologies/crm/domain/ontology/o-cream-v2';
import { ContactOntology } from '../../../../../src/ontologies/crm/domain/entities/contact-ontology';
import { AccessControlService } from '../../../../../src/platform/security/application/services/access-control.service';
import { User } from '../../../../../src/platform/security/domain/user';
import { GUEST_ROLE, ANALYST_ROLE } from '../../../../../src/platform/security/domain/role';

jest.mock('../../../../../src/ontologies/crm/domain/repositories/contact-repository');
jest.mock('../../../../../src/platform/security/application/services/access-control.service');

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
  let mockAccessControlService: jest.Mocked<AccessControlService>;

  const analystUser: User = { id: 'analyst-1', username: 'analyst', roles: [ANALYST_ROLE] };
  const guestUser: User = { id: 'guest-1', username: 'guest', roles: [GUEST_ROLE] };

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
    mockAccessControlService = new (AccessControlService as any)();
    contactService = new ContactService(mockContactRepository, mockAccessControlService);
    // Get the mocked instance here
    mockOntology = OCreamV2Ontology.getInstance() as any;
  });

  describe('getContactById with Access Control', () => {
    it('should return a contact DTO if the user has "read" permission', async () => {
        const contactId = 'contact-123';
        mockContactRepository.findById.mockResolvedValue(mockPerson as any);
        mockAccessControlService.can.mockReturnValue(true);

        const result = await contactService.getContactById(analystUser, contactId);
        
        expect(mockAccessControlService.can).toHaveBeenCalledWith(analystUser, 'read', 'Contact');
        expect(result).not.toBeNull();
        expect(result?.id).toBe(contactId);
    });

    it('should throw an error if the user does not have "read" permission', async () => {
        const contactId = 'contact-123';
        mockContactRepository.findById.mockResolvedValue(mockPerson as any);
        mockAccessControlService.can.mockReturnValue(false);

        await expect(contactService.getContactById(guestUser, contactId)).rejects.toThrow('Access denied');
        expect(mockAccessControlService.can).toHaveBeenCalledWith(guestUser, 'read', 'Contact');
        expect(mockContactRepository.findById).not.toHaveBeenCalled();
    });

    it('should return null if contact is not found, even with permission', async () => {
        const contactId = 'non-existent';
        mockContactRepository.findById.mockResolvedValue(null);
        mockAccessControlService.can.mockReturnValue(true);

        const result = await contactService.getContactById(analystUser, contactId);
        expect(result).toBeNull();
    });
  });

  describe('getContactById', () => {
    it('should return a contact DTO when a contact is found', async () => {
      const contactId = 'contact-123';
      mockContactRepository.findById.mockResolvedValue(mockPerson as any);
      const result = await contactService.getContactById(analystUser, contactId);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(contactId);
      expect(result?.firstName).toBe('John');
      expect(mockContactRepository.findById).toHaveBeenCalledWith(contactId);
    });

    it('should return null when a contact is not found', async () => {
      mockContactRepository.findById.mockResolvedValue(null);
      const result = await contactService.getContactById(analystUser, 'non-existent');
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
      mockAccessControlService.can.mockReturnValue(true);
      mockContactRepository.save.mockResolvedValue(savedContact as any);

      const result = await contactService.createContact(analystUser, contactData);
      
      expect(mockAccessControlService.can).toHaveBeenCalledWith(analystUser, 'create', 'Contact');
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
      
      mockAccessControlService.can.mockReturnValue(true);
      mockOntology.getEntity.mockReturnValue(mockPerson);
      mockContactRepository.save.mockResolvedValue(updatedContact as any);

      const result = await contactService.updateContact(analystUser, contactId, updates);
      
      expect(mockAccessControlService.can).toHaveBeenCalledWith(analystUser, 'update', 'Contact');
      expect(mockOntology.getEntity).toHaveBeenCalledWith(contactId);
      expect(mockContactRepository.save).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result?.firstName).toBe('Johnathan');
    });

    it('should throw an error if the contact to update is not found', async () => {
      const contactId = 'non-existent-id';
      const updates: UpdateContactDto = { firstName: 'Ghost' };

      mockOntology.getEntity.mockReturnValue(undefined);
      mockAccessControlService.can.mockReturnValue(true);

      await expect(
        contactService.updateContact(analystUser, contactId, updates),
      ).rejects.toThrow(`Contact with ID ${contactId} not found.`);

      expect(mockOntology.getEntity).toHaveBeenCalledWith(contactId);
      expect(mockContactRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('deleteContact', () => {
    it('should delete a contact', async () => {
      const contactId = 'contact-to-delete';
      mockAccessControlService.can.mockReturnValue(true);
      mockOntology.getEntity.mockReturnValue(mockPerson);
      mockContactRepository.delete.mockResolvedValue(undefined);

      await contactService.deleteContact(analystUser, contactId);

      expect(mockAccessControlService.can).toHaveBeenCalledWith(analystUser, 'delete', 'Contact');
      expect(mockOntology.getEntity).toHaveBeenCalledWith(contactId);
      expect(mockContactRepository.delete).toHaveBeenCalledWith(contactId);
      expect(mockOntology.removeEntity).toHaveBeenCalledWith(contactId);
    });
  });

  describe('searchContacts', () => {
    it('should return an array of contact DTOs matching the search criteria', async () => {
      const searchDto = { name: 'John' };
      const mockContacts = [mockPerson, { ...mockPerson, id: 'contact-456', name: 'Johnny' }];
      
      mockAccessControlService.can.mockReturnValue(true);
      mockContactRepository.search.mockResolvedValue(mockContacts as any[]);

      const results = await contactService.searchContacts(analystUser, searchDto);

      expect(mockAccessControlService.can).toHaveBeenCalledWith(analystUser, 'read', 'Contact');
      expect(mockContactRepository.search).toHaveBeenCalledWith(searchDto);
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('contact-123');
      expect(results[1].id).toBe('contact-456');
    });

    it('should return an empty array when no contacts match', async () => {
      const searchDto = { name: 'NonExistent' };
      mockAccessControlService.can.mockReturnValue(true);
      mockContactRepository.search.mockResolvedValue([]);

      const results = await contactService.searchContacts(analystUser, searchDto);

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

      mockAccessControlService.can.mockReturnValue(true);
      mockOntology.getEntity.mockReturnValue(mockPerson);
      mockContactRepository.save.mockResolvedValue(updatedContact as any);

      const result = await contactService.addNoteToContact(analystUser, contactId, noteDto);

      expect(mockAccessControlService.can).toHaveBeenCalledWith(analystUser, 'update', 'Contact');
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

      mockAccessControlService.can.mockReturnValue(true);
      mockOntology.getEntity.mockReturnValue(undefined);

      await expect(
        contactService.addNoteToContact(analystUser, contactId, noteDto),
      ).rejects.toThrow(`Contact with id ${contactId} not found`);

      expect(mockOntology.getEntity).toHaveBeenCalledWith(contactId);
      expect(mockContactRepository.save).not.toHaveBeenCalled();
    });
  });
}); 