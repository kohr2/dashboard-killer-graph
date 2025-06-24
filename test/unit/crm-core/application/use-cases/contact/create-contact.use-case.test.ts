// Create Contact Use Case Tests
// Testing the application layer use case with O-CREAM-v2 integration

import { CreateContactUseCase, CreateContactRequest } from '../../../../../../src/crm-core/application/use-cases/contact/create-contact.use-case';
import { ContactRepository } from '../../../../../../src/crm-core/domain/repositories/contact-repository';
import { Contact } from '../../../../../../src/crm-core/domain/entities/contact';
import { oCreamV2 } from '../../../../../../src/crm-core/domain/ontology/o-cream-v2';

// Mock repository
class MockContactRepository implements ContactRepository {
  private contacts: Map<string, Contact> = new Map();

  async save(contact: Contact): Promise<Contact> {
    this.contacts.set(contact.getId(), contact);
    return contact;
  }

  async findById(id: string): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async findAll(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }

  async delete(id: string): Promise<boolean> {
    return this.contacts.delete(id);
  }

  async findByEmail(email: string): Promise<Contact | undefined> {
    return Array.from(this.contacts.values()).find(c => c.getEmail() === email);
  }

  async findByOrganizationId(organizationId: string): Promise<Contact[]> {
    return Array.from(this.contacts.values()).filter(c => (c as any).organizationId === organizationId);
  }

  async search(query: string): Promise<Contact[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.contacts.values()).filter(c => 
      c.getName().toLowerCase().includes(lowerQuery) ||
      c.getEmail().toLowerCase().includes(lowerQuery)
    );
  }

  async count(): Promise<number> {
    return this.contacts.size;
  }

  async exists(id: string): Promise<boolean> {
    return this.contacts.has(id);
  }
}

describe('CreateContactUseCase', () => {
  let useCase: CreateContactUseCase;
  let mockRepository: MockContactRepository;

  beforeEach(() => {
    mockRepository = new MockContactRepository();
    useCase = new CreateContactUseCase(mockRepository);
    
    // Clear the global ontology before each test
    (oCreamV2 as any).entities.clear();
    (oCreamV2 as any).typeIndex.clear();
    Object.values(require('../../../../../../src/crm-core/domain/ontology/o-cream-v2').DOLCECategory).forEach((category: any) => {
      (oCreamV2 as any).typeIndex.set(category, new Set());
    });
  });

  describe('Input Validation', () => {
    test('should reject request without firstName', async () => {
      const request: CreateContactRequest = {
        firstName: '',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };

      const result = await useCase.execute(request);

      expect(result.success).toBe(false);
      expect(result.message).toBe('First name is required');
      expect(result.contact).toBeUndefined();
    });

    test('should reject request without lastName', async () => {
      const request: CreateContactRequest = {
        firstName: 'John',
        lastName: '',
        email: 'john.doe@example.com'
      };

      const result = await useCase.execute(request);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Last name is required');
      expect(result.contact).toBeUndefined();
    });

    test('should reject request without email', async () => {
      const request: CreateContactRequest = {
        firstName: 'John',
        lastName: 'Doe',
        email: ''
      };

      const result = await useCase.execute(request);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Email is required');
      expect(result.contact).toBeUndefined();
    });

    test('should trim whitespace from required fields', async () => {
      const request: CreateContactRequest = {
        firstName: '  John  ',
        lastName: '  Doe  ',
        email: '  john.doe@example.com  '
      };

      const result = await useCase.execute(request);

      expect(result.success).toBe(true);
      expect(result.contact?.name).toBe('John Doe');
      expect(result.contact?.email).toBe('john.doe@example.com');
    });
  });

  describe('Contact Creation', () => {
    test('should create contact with minimal required data', async () => {
      const request: CreateContactRequest = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };

      const result = await useCase.execute(request);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Contact created successfully');
      expect(result.contact).toBeDefined();
      expect(result.contact!.name).toBe('John Doe');
      expect(result.contact!.email).toBe('john.doe@example.com');
      expect(result.contact!.phone).toBeUndefined();
      expect(result.contact!.createdAt).toBeInstanceOf(Date);
      expect(result.contact!.ontologyStatus).toBe('registered');
    });

    test('should create contact with full data', async () => {
      const request: CreateContactRequest = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@acme.com',
        phone: '+1-555-0123',
        organizationId: 'org-123',
        title: 'CTO',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'USA'
        },
        preferences: {
          communicationChannel: 'email',
          timezone: 'EST'
        },
        tags: ['vip', 'technical']
      };

      const result = await useCase.execute(request);

      expect(result.success).toBe(true);
      expect(result.contact!.name).toBe('Jane Smith');
      expect(result.contact!.email).toBe('jane.smith@acme.com');
      expect(result.contact!.phone).toBe('+1-555-0123');
      expect(result.contact!.ontologyStatus).toBe('registered');
    });

    test('should persist contact to repository', async () => {
      const request: CreateContactRequest = {
        firstName: 'Bob',
        lastName: 'Wilson',
        email: 'bob.wilson@test.com'
      };

      const result = await useCase.execute(request);

      expect(result.success).toBe(true);
      
      // Verify contact was saved to repository
      const savedContact = await mockRepository.findById(result.id);
      expect(savedContact).toBeDefined();
      expect(savedContact!.getName()).toBe('Bob Wilson');
      expect(savedContact!.getEmail()).toBe('bob.wilson@test.com');
    });
  });

  describe('O-CREAM-v2 Integration', () => {
    test('should register contact with global ontology', async () => {
      const request: CreateContactRequest = {
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@example.com'
      };

      const result = await useCase.execute(request);

      expect(result.success).toBe(true);
      expect(result.contact!.ontologyStatus).toBe('registered');

      // Check if contact was registered in global ontology
      const oCreamContact = oCreamV2.getEntity(result.id);
      expect(oCreamContact).toBeDefined();
      expect(oCreamContact!.id).toBe(result.id);
    });

    test('should create initial activity for contact creation', async () => {
      const request: CreateContactRequest = {
        firstName: 'Charlie',
        lastName: 'Brown',
        email: 'charlie.brown@example.com'
      };

      const result = await useCase.execute(request);

      expect(result.success).toBe(true);

      // Check if creation activity was created
      const oCreamContact = oCreamV2.getEntity(result.id);
      expect(oCreamContact).toBeDefined();
      
      // The contact should have activities
      const contactEntity = oCreamContact as any;
      expect(contactEntity.activities).toBeDefined();
      expect(contactEntity.activities.length).toBeGreaterThan(0);
    });

    test('should handle ontology registration errors gracefully', async () => {
      // Mock the ontology to throw an error
      const originalAddEntity = oCreamV2.addEntity;
      oCreamV2.addEntity = jest.fn().mockImplementation(() => {
        throw new Error('Ontology error');
      });

      const request: CreateContactRequest = {
        firstName: 'Error',
        lastName: 'Test',
        email: 'error.test@example.com'
      };

      const result = await useCase.execute(request);

      expect(result.success).toBe(true); // Contact creation should still succeed
      expect(result.contact!.ontologyStatus).toBe('error'); // But ontology status should be error

      // Restore original method
      oCreamV2.addEntity = originalAddEntity;
    });
  });

  describe('Error Handling', () => {
    test('should handle repository errors', async () => {
      // Mock repository to throw an error
      const errorRepository = {
        ...mockRepository,
        save: jest.fn().mockRejectedValue(new Error('Database error'))
      } as any;

      const errorUseCase = new CreateContactUseCase(errorRepository);

      const request: CreateContactRequest = {
        firstName: 'Error',
        lastName: 'Test',
        email: 'error@example.com'
      };

      const result = await errorUseCase.execute(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to create contact');
      expect(result.message).toContain('Database error');
    });

    test('should handle invalid email format', async () => {
      const request: CreateContactRequest = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email'
      };

      const result = await useCase.execute(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to create contact');
    });

    test('should handle invalid phone format', async () => {
      const request: CreateContactRequest = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: 'invalid-phone'
      };

      const result = await useCase.execute(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to create contact');
    });
  });

  describe('Response Format', () => {
    test('should return proper success response format', async () => {
      const request: CreateContactRequest = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@example.com'
      };

      const result = await useCase.execute(request);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('contact');
      
      expect(typeof result.id).toBe('string');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
      
      if (result.contact) {
        expect(result.contact).toHaveProperty('id');
        expect(result.contact).toHaveProperty('name');
        expect(result.contact).toHaveProperty('email');
        expect(result.contact).toHaveProperty('createdAt');
        expect(result.contact).toHaveProperty('ontologyStatus');
      }
    });

    test('should return proper error response format', async () => {
      const request: CreateContactRequest = {
        firstName: '',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };

      const result = await useCase.execute(request);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      
      expect(result.id).toBe('');
      expect(result.success).toBe(false);
      expect(typeof result.message).toBe('string');
      expect(result.contact).toBeUndefined();
    });
  });
}); 