import 'reflect-metadata';
import { ContactService } from '@crm/application/services/contact.service';
import { ContactRepository } from '@crm/domain/repositories/contact-repository';
import { CreateContactDto, UpdateContactDto, SearchContactsDto } from '@crm/application/dto/contact.dto';
import { OCreamV2Ontology } from '@crm/domain/ontology/o-cream-v2';
import { OCreamContactEntity } from '@crm/domain/entities/contact-ontology';
import { AccessControlService } from '@platform/security/application/services/access-control.service';
import { User } from '@platform/security/domain/user';
import { GUEST_ROLE, ANALYST_ROLE } from '@platform/security/domain/role';
import { createContactDTO } from '@platform/enrichment/dto-aliases';

// Mock dependencies
jest.mock('@crm/domain/repositories/contact-repository');
jest.mock('@platform/security/application/services/access-control.service');
jest.mock('@crm/domain/ontology/o-cream-v2');

const mockPerson: OCreamContactEntity = {
  id: 'contact-123',
  name: 'John Doe',
  personalInfo: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
  },
  category: 'PhysicalObject' as any,
  createdAt: new Date(),
  updatedAt: new Date(),
  activities: [],
  knowledgeElements: [],
  ontologyMetadata: { validationStatus: 'valid' },
  getId: () => 'contact-123',
  getName: () => 'John Doe',
  addActivity: jest.fn(),
  addKnowledgeElement: jest.fn(),
  updatePersonalInfo: jest.fn(),
  updatePreferences: jest.fn(),
  updateStatus: jest.fn(),
  markAsModified: jest.fn(),
};

describe('ContactService', () => {
  let contactService: ContactService;
  let mockContactRepository: jest.Mocked<ContactRepository>;
  let mockAccessControlService: jest.Mocked<AccessControlService>;
  let mockOntology: jest.Mocked<OCreamV2Ontology>;

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

    mockAccessControlService = new AccessControlService() as jest.Mocked<AccessControlService>;
    mockOntology = new OCreamV2Ontology() as jest.Mocked<OCreamV2Ontology>;

    // Mock the getInstance static method to return our mock instance
    jest.mocked(OCreamV2Ontology.getInstance).mockReturnValue(mockOntology);

    contactService = new ContactService(mockContactRepository, mockAccessControlService);
  });

  describe('getContactById', () => {
    it('should return a contact DTO if user has "read" permission', async () => {
      mockAccessControlService.can.mockReturnValue(true);
      mockContactRepository.findById.mockResolvedValue(mockPerson);
      const result = await contactService.getContactById(analystUser, 'contact-123');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('contact-123');
      expect(mockAccessControlService.can).toHaveBeenCalledWith(analystUser, 'read', 'Contact');
      expect(mockContactRepository.findById).toHaveBeenCalledWith('contact-123');
    });

    it('should throw an error if user lacks "read" permission', async () => {
      mockAccessControlService.can.mockReturnValue(false);
      await expect(contactService.getContactById(guestUser, 'contact-123')).rejects.toThrow('Access denied');
      expect(mockContactRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('createContact', () => {
    it('should create a contact if user has "create" permission', async () => {
        mockAccessControlService.can.mockReturnValue(true);
        const contactDto: CreateContactDto = { firstName: 'Jane', lastName: 'Doe', email: 'jane.doe@example.com' };
        
        // Mock the DTO factory
        const createdDTO = { id: 'new-contact', name: 'Jane Doe', type: 'Contact' } as any;
        jest.spyOn(createContactDTO).mockReturnValue(createdDTO);

        mockContactRepository.save.mockResolvedValue(createdDTO);

        const result = await contactService.createContact(analystUser, contactDto);
        
        expect(mockAccessControlService.can).toHaveBeenCalledWith(analystUser, 'create', 'Contact');
        expect(createContactDTO).toHaveBeenCalledWith(contactDto);
        expect(mockOntology.addEntity).toHaveBeenCalledWith(createdEntity);
        expect(mockContactRepository.save).toHaveBeenCalledWith(createdEntity);
        expect(result.id).toBe('new-contact');
    });
  });
  
  describe('searchContacts', () => {
    it('should search contacts by name if provided', async () => {
        mockAccessControlService.can.mockReturnValue(true);
        const searchDto: SearchContactsDto = { name: 'John' };
        mockContactRepository.search.mockResolvedValue([mockPerson]);
        
        const results = await contactService.searchContacts(analystUser, searchDto);
        
        expect(mockContactRepository.search).toHaveBeenCalledWith('John');
        expect(results.length).toBe(1);
        expect(results[0].firstName).toBe('John');
    });
  });

  // Add more tests for update, delete, addNoteToContact, etc. following the same pattern.
}); 