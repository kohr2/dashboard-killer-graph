import { ContactService } from '@/crm-core/application/services/contact.service';
import { ContactRepository } from '@/crm-core/domain/repositories/i-contact-repository';
import { CreateContactDto, UpdateContactDto, ContactSearchDto } from '@/crm-core/application/dto/contact.dto';
import * as ContactOntology from '@/crm-core/domain/entities/contact-ontology';
import { oCreamV2 } from '@/crm-core/domain/ontology/o-cream-v2';
import { OCreamContactEntity } from '@/crm-core/domain/entities/contact-ontology';

jest.mock('@/crm-core/domain/entities/contact-ontology', () => ({
  __esModule: true,
  ...jest.requireActual('@/crm-core/domain/entities/contact-ontology'),
  OCreamContactEntitySchema: {
    safeParse: jest.fn().mockImplementation(contact => {
      if (contact.id.includes('invalid')) {
        return { success: false, error: { errors: ['Invalid contact'] } };
      }
      return { success: true, data: contact };
    }),
  },
  createOCreamContact: jest.fn((dto) => ({
    id: `contact-${new Date().getTime()}`,
    personalInfo: { ...dto },
    status: 'active',
    preferences: {},
    knowledgeElements: [],
    activities: [],
    ontologyMetadata: { validationStatus: 'valid' },
    updatePersonalInfo: jest.fn(),
    addKnowledgeElement: jest.fn(),
    addActivity: jest.fn(),
  })),
}));

jest.mock('@/crm-core/domain/ontology/o-cream-v2', () => ({
  oCreamV2: {
    addRepository: jest.fn(),
    addEntity: jest.fn(),
    getEntity: jest.fn(),
    removeEntity: jest.fn(),
    addActivity: jest.fn(),
  },
  ActivityType: {
    DEVELOP: 'DEVELOP',
    DATA_COLLECTION: 'DATA_COLLECTION',
  },
  DOLCECategory: {
    PERDURANT: 'PERDURANT',
  },
  KnowledgeType: {
    CUSTOMER_PROFILE: 'CUSTOMER_PROFILE',
    NOTE: 'Note',
  },
}));

describe('ContactService', () => {
  let contactService: ContactService;
  let contactRepository: jest.Mocked<ContactRepository>;
  let createContactSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    contactRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined),
      search: jest.fn().mockResolvedValue([]),
    };
    
    (oCreamV2.addRepository as jest.Mock).mockClear();
    (oCreamV2.addEntity as jest.Mock).mockClear();
    (oCreamV2.getEntity as jest.Mock).mockClear();
    (oCreamV2.removeEntity as jest.Mock).mockClear();
    (oCreamV2.addActivity as jest.Mock).mockClear();

    // Espionner la fonction 'createOCreamContact' du module importé
    createContactSpy = jest.spyOn(ContactOntology, 'createOCreamContact');

    contactService = new ContactService(contactRepository);
  });

  afterEach(() => {
    // Restaurer l'espion après chaque test
    createContactSpy.mockRestore();
  });

  describe('createContact', () => {
    it('should create a contact and save it via the repository', async () => {
      // Arrange
      const createDto: CreateContactDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      };
      
      const mockContactEntity = { id: '123', personalInfo: { firstName: 'John', lastName: 'Doe' } } as ContactOntology.OCreamContactEntity;
      createContactSpy.mockReturnValue(mockContactEntity);

      // Act
      await contactService.createContact(createDto);

      // Assert
      expect(createContactSpy).toHaveBeenCalledTimes(1);
      expect(createContactSpy).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      });
      
      expect(contactRepository.save).toHaveBeenCalledTimes(1);
      expect(contactRepository.save).toHaveBeenCalledWith(mockContactEntity);
    });
  });

  describe('getContactById', () => {
    it('should return the contact DTO when found', async () => {
      // Arrange
      const contactId = 'contact-123';
      const mockContactEntity = {
        id: contactId,
        personalInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '123-456-7890',
          title: 'Developer',
        },
        status: 'active',
        preferences: {},
        knowledgeElements: [],
        activities: [],
        ontologyMetadata: {},
      };
      const expectedDto = {
        id: contactId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      };

      (contactRepository.findById as jest.Mock).mockResolvedValue(mockContactEntity);

      // Act
      const result = await contactService.getContactById(contactId);

      // Assert
      expect(result).toMatchObject(expectedDto);
      expect(contactRepository.findById).toHaveBeenCalledWith(contactId);
    });

    it('should return null when contact is not found', async () => {
      // Arrange
      const contactId = 'non-existent-id';
      contactRepository.findById.mockResolvedValue(null);

      // Act
      const result = await contactService.getContactById(contactId);

      // Assert
      expect(result).toBeNull();
      expect(contactRepository.findById).toHaveBeenCalledWith(contactId);
    });
  });

  describe('updateContact', () => {
    it('should update the contact and return the updated DTO', async () => {
      // Arrange
      const contactId = 'contact-123';
      const updateDto: UpdateContactDto = {
        firstName: 'Johnathan',
        email: 'john.doe.new@example.com',
      };

      const existingContact: ContactOntology.OCreamContactEntity = {
        id: contactId,
        personalInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
        },
        ontology_type: 'Contact',
        activities: [],
        knowledgeElements: [],
        ontologyMetadata: { validationStatus: 'valid' },
        addActivity: jest.fn(),
        addKnowledgeElement: jest.fn(),
        updatePersonalInfo: jest.fn(),
        updatePreferences: jest.fn(),
        updateStatus: jest.fn(),
      };

      // Simuler le comportement de mise à jour
      existingContact.updatePersonalInfo.mockImplementation(function(this: ContactOntology.OCreamContactEntity, updates) {
        this.personalInfo = { ...this.personalInfo, ...updates };
      });

      (oCreamV2.getEntity as jest.Mock).mockReturnValue(existingContact);
      contactRepository.save.mockResolvedValue(undefined);

      // Act
      const result = await contactService.updateContact(contactId, updateDto);

      // Assert
      expect(oCreamV2.getEntity).toHaveBeenCalledWith(contactId);
      expect(existingContact.updatePersonalInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Johnathan',
          email: 'john.doe.new@example.com',
        })
      );
      expect(contactRepository.save).toHaveBeenCalledWith(existingContact);
      expect(result.firstName).toBe('Johnathan');
      expect(result.email).toBe('john.doe.new@example.com');
    });

    it('should throw an error if the contact to update is not found', async () => {
      // Arrange
      const contactId = 'non-existent-id';
      const updateDto: UpdateContactDto = { firstName: 'Any' };

      (oCreamV2.getEntity as jest.Mock).mockReturnValue(undefined);

      // Act & Assert
      await expect(contactService.updateContact(contactId, updateDto)).rejects.toThrow(
        `Contact with id ${contactId} not found`
      );
    });
  });

  describe('deleteContact', () => {
    it('should call the repository to delete the contact', async () => {
      // Arrange
      const contactId = 'contact-to-delete-123';
      const mockContact = {
        id: contactId,
        personalInfo: {},
        addActivity: jest.fn(),
      };
      (oCreamV2.getEntity as jest.Mock).mockReturnValue(mockContact);
      contactRepository.delete.mockResolvedValue(undefined);

      // Act
      await contactService.deleteContact(contactId);

      // Assert
      expect(oCreamV2.getEntity).toHaveBeenCalledWith(contactId);
      expect(contactRepository.delete).toHaveBeenCalledWith(contactId);
    });
  });

  describe('searchContacts', () => {
    it('should return a list of contact DTOs matching the search', async () => {
      // Arrange
      const searchDto = { query: 'John' };
      const mockedContacts: ContactOntology.OCreamContactEntity[] = [
        {
          id: 'contact-123',
          personalInfo: { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
          ontology_type: 'Contact',
          activities: [],
          knowledgeElements: [],
          ontologyMetadata: { validationStatus: 'valid' },
          addActivity: jest.fn(),
          addKnowledgeElement: jest.fn(),
          updatePersonalInfo: jest.fn(),
          updatePreferences: jest.fn(),
          updateStatus: jest.fn(),
        }
      ];

      contactRepository.search.mockResolvedValue(mockedContacts);

      // Act
      const result = await contactService.searchContacts(searchDto);

      // Assert
      expect(contactRepository.search).toHaveBeenCalledWith(searchDto);
      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].firstName).toBe('John');
    });
  });

  describe('addNoteToContact', () => {
    it('should add a note to a contact and save it', async () => {
      // Arrange
      const contactId = 'contact-123';
      const addNoteDto = { content: 'This is a test note.', author: 'Test Author' };

      const existingContact: jest.Mocked<ContactOntology.OCreamContactEntity> = {
        id: contactId,
        personalInfo: { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
        ontology_type: 'Contact',
        activities: [],
        knowledgeElements: [],
        ontologyMetadata: { validationStatus: 'valid' },
        addActivity: jest.fn(),
        addKnowledgeElement: jest.fn(),
        updatePersonalInfo: jest.fn(),
        updatePreferences: jest.fn(),
        updateStatus: jest.fn(),
      };

      (oCreamV2.getEntity as jest.Mock).mockReturnValue(existingContact);
      
      // Act
      const result = await contactService.addNoteToContact(contactId, addNoteDto);

      // Assert
      expect(oCreamV2.getEntity).toHaveBeenCalledWith(contactId);
      expect(oCreamV2.addEntity).toHaveBeenCalled();
      expect(existingContact.addKnowledgeElement).toHaveBeenCalled();
      expect(contactRepository.save).toHaveBeenCalledWith(existingContact);
      expect(result.id).toBe(contactId);
    });
  });
}); 