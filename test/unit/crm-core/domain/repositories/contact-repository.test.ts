// CRM Core Contact Repository Tests
// These tests drive the development of the Contact repository pattern

import { Contact } from '@crm-core/domain/entities/contact';

describe('ContactRepository', () => {
  let repository: ContactRepository;

  beforeEach(() => {
    repository = new InMemoryContactRepository();
  });

  describe('Contact Creation', () => {
    it('should save a new contact', async () => {
      // Arrange
      const contact = new Contact({
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-123-4567'
      });

      // Act
      const savedContact = await repository.save(contact);

      // Assert
      expect(savedContact).toBeDefined();
      expect(savedContact.getId()).toBe(contact.getId());
      expect(savedContact.getName()).toBe('John Doe');
      expect(savedContact.getEmail()).toBe('john.doe@example.com');
    });

    it('should update an existing contact', async () => {
      // Arrange
      const contact = new Contact({
        id: 'existing-contact-id',
        name: 'Original Name',
        email: 'original@example.com'
      });
      await repository.save(contact);

      // Act
      contact.updateName('Updated Name');
      const updatedContact = await repository.save(contact);

      // Assert
      expect(updatedContact.getName()).toBe('Updated Name');
      expect(updatedContact.getId()).toBe('existing-contact-id');
    });
  });

  describe('Contact Retrieval', () => {
    it('should find contact by ID', async () => {
      // Arrange
      const contact = new Contact({
        id: 'find-test-id',
        name: 'Find Test',
        email: 'find@example.com'
      });
      await repository.save(contact);

      // Act
      const foundContact = await repository.findById('find-test-id');

      // Assert
      expect(foundContact).toBeDefined();
      expect(foundContact!.getId()).toBe('find-test-id');
      expect(foundContact!.getName()).toBe('Find Test');
    });

    it('should return undefined for non-existent contact', async () => {
      // Act
      const foundContact = await repository.findById('non-existent-id');

      // Assert
      expect(foundContact).toBeUndefined();
    });

    it('should find contact by email', async () => {
      // Arrange
      const contact = new Contact({
        name: 'Email Test',
        email: 'unique@example.com'
      });
      await repository.save(contact);

      // Act
      const foundContact = await repository.findByEmail('unique@example.com');

      // Assert
      expect(foundContact).toBeDefined();
      expect(foundContact!.getEmail()).toBe('unique@example.com');
      expect(foundContact!.getName()).toBe('Email Test');
    });

    it('should return undefined for non-existent email', async () => {
      // Act
      const foundContact = await repository.findByEmail('nonexistent@example.com');

      // Assert
      expect(foundContact).toBeUndefined();
    });
  });

  describe('Contact Listing', () => {
    it('should find all contacts', async () => {
      // Arrange
      const contact1 = new Contact({
        name: 'Contact One',
        email: 'one@example.com'
      });
      const contact2 = new Contact({
        name: 'Contact Two',
        email: 'two@example.com'
      });
      await repository.save(contact1);
      await repository.save(contact2);

      // Act
      const allContacts = await repository.findAll();

      // Assert
      expect(allContacts).toHaveLength(2);
      expect(allContacts.map(c => c.getName())).toContain('Contact One');
      expect(allContacts.map(c => c.getName())).toContain('Contact Two');
    });

    it('should find contacts by organization', async () => {
      // Arrange
      const contact1 = new Contact({
        name: 'Org Contact 1',
        email: 'org1@example.com'
      });
      const contact2 = new Contact({
        name: 'Org Contact 2', 
        email: 'org2@example.com'
      });
      const contact3 = new Contact({
        name: 'Other Contact',
        email: 'other@example.com'
      });
      
      await repository.save(contact1);
      await repository.save(contact2);
      await repository.save(contact3);

      // Act
      const orgContacts = await repository.findByOrganizationId('target-org-id');

      // Assert
      // Note: This test will need organization relationship logic
      expect(orgContacts).toBeDefined();
      expect(Array.isArray(orgContacts)).toBe(true);
    });

    it('should support pagination', async () => {
      // Arrange
      for (let i = 1; i <= 10; i++) {
        const contact = new Contact({
          name: `Contact ${i}`,
          email: `contact${i}@example.com`
        });
        await repository.save(contact);
      }

      // Act
      const page1 = await repository.findAll({ page: 1, limit: 3 });
      const page2 = await repository.findAll({ page: 2, limit: 3 });

      // Assert
      expect(page1).toHaveLength(3);
      expect(page2).toHaveLength(3);
      // Ensure different contacts on different pages
      const page1Ids = page1.map(c => c.getId());
      const page2Ids = page2.map(c => c.getId());
      expect(page1Ids).not.toEqual(page2Ids);
    });
  });

  describe('Contact Search', () => {
    it('should search contacts by name', async () => {
      // Arrange
      const contact1 = new Contact({
        name: 'John Smith',
        email: 'john.smith@example.com'
      });
      const contact2 = new Contact({
        name: 'Jane Doe',
        email: 'jane.doe@example.com'
      });
      const contact3 = new Contact({
        name: 'John Johnson',
        email: 'john.johnson@example.com'
      });
      
      await repository.save(contact1);
      await repository.save(contact2);
      await repository.save(contact3);

      // Act
      const results = await repository.search('John');

      // Assert
      expect(results).toHaveLength(2);
      expect(results.map(c => c.getName())).toContain('John Smith');
      expect(results.map(c => c.getName())).toContain('John Johnson');
      expect(results.map(c => c.getName())).not.toContain('Jane Doe');
    });

    it('should search contacts by email', async () => {
      // Arrange
      const contact = new Contact({
        name: 'Email Search Test',
        email: 'unique.email@company.com'
      });
      await repository.save(contact);

      // Act
      const results = await repository.search('unique.email');

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].getEmail()).toBe('unique.email@company.com');
    });

    it('should return empty array for no matches', async () => {
      // Act
      const results = await repository.search('nonexistent');

      // Assert
      expect(results).toHaveLength(0);
    });
  });

  describe('Contact Deletion', () => {
    it('should delete contact by ID', async () => {
      // Arrange
      const contact = new Contact({
        id: 'delete-test-id',
        name: 'Delete Test',
        email: 'delete@example.com'
      });
      await repository.save(contact);

      // Act
      const deleted = await repository.delete('delete-test-id');

      // Assert
      expect(deleted).toBe(true);
      const foundContact = await repository.findById('delete-test-id');
      expect(foundContact).toBeUndefined();
    });

    it('should return false for non-existent contact deletion', async () => {
      // Act
      const deleted = await repository.delete('non-existent-id');

      // Assert
      expect(deleted).toBe(false);
    });
  });

  describe('Repository State', () => {
    it('should count total contacts', async () => {
      // Arrange
      for (let i = 1; i <= 5; i++) {
        const contact = new Contact({
          name: `Count Test ${i}`,
          email: `count${i}@example.com`
        });
        await repository.save(contact);
      }

      // Act
      const count = await repository.count();

      // Assert
      expect(count).toBe(5);
    });

    it('should check if contact exists', async () => {
      // Arrange
      const contact = new Contact({
        id: 'exists-test-id',
        name: 'Exists Test',
        email: 'exists@example.com'
      });
      await repository.save(contact);

      // Act
      const exists = await repository.exists('exists-test-id');
      const notExists = await repository.exists('does-not-exist');

      // Assert
      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });
  });
});

// Import statements (these will fail initially)
import { ContactRepository } from '@crm-core/domain/repositories/contact-repository';
import { InMemoryContactRepository } from '@crm-core/infrastructure/repositories/in-memory-contact-repository'; 