import { ContactService } from '../../../../../src/crm-core/application/services/contact.service';
import { ContactRepository } from '../../../../../src/crm-core/domain/repositories/i-contact-repository';
import * as ContactOntology from '../../../../../src/crm-core/domain/entities/contact-ontology';
import { oCreamV2 } from '../../../../../src/crm-core/domain/ontology/o-cream-v2';
import { CreateContactDto } from '../../../../../src/crm-core/application/dto/contact.dto';

jest.mock('../../../../../src/crm-core/domain/ontology/o-cream-v2', () => ({
  oCreamV2: {
    addRepository: jest.fn(),
    addEntity: jest.fn(),
    getEntity: jest.fn(),
    removeEntity: jest.fn(),
    addActivity: jest.fn(),
  },
}));

jest.mock('../../../../../src/crm-core/domain/entities/contact-ontology', () => ({
  ...jest.requireActual('../../../../../src/crm-core/domain/entities/contact-ontology'),
  createOCreamContact: jest.fn(),
}));

const { ContactService: ActualContactService } = jest.requireActual('../../../../../src/crm-core/application/services/contact.service');

describe('ContactService', () => {
  let service: ContactService;
  let mockContactRepository: jest.Mocked<ContactRepository>;

  beforeEach(() => {
    mockContactRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
      search: jest.fn(),
    } as any;
    
    service = new ActualContactService(mockContactRepository);
    jest.clearAllMocks();
  });

  describe('createContact', () => {
    it('should create a new contact, save it, and return a response DTO', async () => {
      // Arrange
      const createDto: CreateContactDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      };
      
      const mockContactEntity = {
        id: '123',
        personalInfo: { ...createDto },
        addKnowledgeElement: jest.fn(),
        addActivity: jest.fn(),
        // Mock a simple schema for the test
        constructor: {
          name: 'OCreamContactEntitySchema'
        }
      };
      
      (ContactOntology.createOCreamContact as jest.Mock).mockReturnValue(mockContactEntity);
      mockContactRepository.save.mockResolvedValue(mockContactEntity as any);

      // Act
      const result = await service.createContact(createDto);

      // Assert
      expect(ContactOntology.createOCreamContact).toHaveBeenCalledWith(createDto);
      expect(oCreamV2.addEntity).toHaveBeenCalledWith(mockContactEntity);
      expect(mockContactRepository.save).toHaveBeenCalledWith(mockContactEntity);
      expect(result.id).toBe('123');
      expect(result.firstName).toBe('John');
    });
  });

  describe('getContactById', () => {
    it('should return a contact DTO if found', async () => {
      // Arrange
      const mockContactEntity = {
        id: '123',
        personalInfo: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
        // Mock schema
        constructor: { name: 'OCreamContactEntitySchema' }
      };
      mockContactRepository.findById.mockResolvedValue(mockContactEntity as any);

      // Act
      const result = await service.getContactById('123');

      // Assert
      expect(mockContactRepository.findById).toHaveBeenCalledWith('123');
      expect(result).not.toBeNull();
      expect(result.id).toBe('123');
      expect(result.firstName).toBe('Jane');
    });

    it('should return null if contact is not found', async () => {
      // Arrange
      mockContactRepository.findById.mockResolvedValue(null);

      // Act
      const result = await service.getContactById('404');

      // Assert
      expect(mockContactRepository.findById).toHaveBeenCalledWith('404');
      expect(result).toBeNull();
    });
  });
});
