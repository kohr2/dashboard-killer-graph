// CRM Core Organization Entity Tests
// These tests drive the development of the Organization domain model

describe('Organization Entity', () => {
  describe('Organization Creation', () => {
    it('should create organization with valid data', () => {
      // Arrange
      const orgData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Acme Corporation',
        industry: 'Technology',
        size: 'Medium',
        website: 'https://acme.com',
        description: 'Leading technology solutions provider'
      };

      // Act
      const organization = new Organization(orgData);

      // Assert
      expect(organization.getId()).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(organization.getName()).toBe('Acme Corporation');
      expect(organization.getIndustry()).toBe('Technology');
      expect(organization.getSize()).toBe('Medium');
      expect(organization.getWebsite()).toBe('https://acme.com');
      expect(organization.getDescription()).toBe('Leading technology solutions provider');
    });

    it('should create organization with minimal required data', () => {
      // Arrange
      const orgData = {
        id: '456e7890-e89b-12d3-a456-426614174001',
        name: 'Simple Corp'
      };

      // Act
      const organization = new Organization(orgData);

      // Assert
      expect(organization.getId()).toBe('456e7890-e89b-12d3-a456-426614174001');
      expect(organization.getName()).toBe('Simple Corp');
      expect(organization.getIndustry()).toBeUndefined();
      expect(organization.getSize()).toBeUndefined();
      expect(organization.getWebsite()).toBeUndefined();
      expect(organization.getDescription()).toBeUndefined();
    });

    it('should generate ID if not provided', () => {
      // Arrange
      const orgData = {
        name: 'Auto ID Organization'
      };

      // Act
      const organization = new Organization(orgData);

      // Assert
      expect(organization.getId()).toBeDefined();
      expect(organization.getId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  describe('Organization Validation', () => {
    it('should throw error for empty name', () => {
      // Arrange
      const invalidData = {
        name: ''
      };

      // Act & Assert
      expect(() => new Organization(invalidData)).toThrow('Organization name is required');
    });

    it('should throw error for missing name', () => {
      // Arrange
      const invalidData = {};

      // Act & Assert
      expect(() => new Organization(invalidData as any)).toThrow('Organization name is required');
    });

    it('should validate website URL format', () => {
      // Arrange
      const invalidData = {
        name: 'Test Corp',
        website: 'not-a-url'
      };

      // Act & Assert
      expect(() => new Organization(invalidData)).toThrow('Invalid website URL format');
    });

    it('should validate organization size enum', () => {
      // Arrange
      const invalidData = {
        name: 'Test Corp',
        size: 'Invalid Size'
      };

      // Act & Assert
      expect(() => new Organization(invalidData)).toThrow('Invalid organization size');
    });
  });

  describe('Organization Updates', () => {
    it('should update organization name', () => {
      // Arrange
      const organization = new Organization({
        name: 'Original Name'
      });

      // Act
      organization.updateName('Updated Name');

      // Assert
      expect(organization.getName()).toBe('Updated Name');
    });

    it('should update organization industry', () => {
      // Arrange
      const organization = new Organization({
        name: 'Test Corp'
      });

      // Act
      organization.updateIndustry('Healthcare');

      // Assert
      expect(organization.getIndustry()).toBe('Healthcare');
    });

    it('should update organization size with validation', () => {
      // Arrange
      const organization = new Organization({
        name: 'Test Corp'
      });

      // Act
      organization.updateSize('Large');

      // Assert
      expect(organization.getSize()).toBe('Large');
    });

    it('should throw error when updating to invalid size', () => {
      // Arrange
      const organization = new Organization({
        name: 'Test Corp'
      });

      // Act & Assert
      expect(() => organization.updateSize('Invalid')).toThrow('Invalid organization size');
    });

    it('should update website with validation', () => {
      // Arrange
      const organization = new Organization({
        name: 'Test Corp'
      });

      // Act
      organization.updateWebsite('https://updated.com');

      // Assert
      expect(organization.getWebsite()).toBe('https://updated.com');
    });

    it('should update description', () => {
      // Arrange
      const organization = new Organization({
        name: 'Test Corp'
      });

      // Act
      organization.updateDescription('Updated description');

      // Assert
      expect(organization.getDescription()).toBe('Updated description');
    });
  });

  describe('Contact Management', () => {
    it('should add contact to organization', () => {
      // Arrange
      const organization = new Organization({
        name: 'Test Corp'
      });
      const contactId = '123e4567-e89b-12d3-a456-426614174000';

      // Act
      organization.addContact(contactId);

      // Assert
      expect(organization.getContacts()).toContain(contactId);
      expect(organization.getContactCount()).toBe(1);
    });

    it('should remove contact from organization', () => {
      // Arrange
      const organization = new Organization({
        name: 'Test Corp'
      });
      const contactId = '123e4567-e89b-12d3-a456-426614174000';
      organization.addContact(contactId);

      // Act
      organization.removeContact(contactId);

      // Assert
      expect(organization.getContacts()).not.toContain(contactId);
      expect(organization.getContactCount()).toBe(0);
    });

    it('should prevent duplicate contacts', () => {
      // Arrange
      const organization = new Organization({
        name: 'Test Corp'
      });
      const contactId = '123e4567-e89b-12d3-a456-426614174000';
      organization.addContact(contactId);

      // Act
      organization.addContact(contactId);

      // Assert
      expect(organization.getContactCount()).toBe(1);
    });

    it('should handle removing non-existent contact gracefully', () => {
      // Arrange
      const organization = new Organization({
        name: 'Test Corp'
      });
      const contactId = '123e4567-e89b-12d3-a456-426614174000';

      // Act & Assert
      expect(() => organization.removeContact(contactId)).not.toThrow();
      expect(organization.getContactCount()).toBe(0);
    });
  });

  describe('Organization Metadata', () => {
    it('should track creation timestamp', () => {
      // Arrange
      const beforeCreation = new Date();
      
      // Act
      const organization = new Organization({
        name: 'Timestamp Test Corp'
      });
      
      const afterCreation = new Date();

      // Assert
      expect(organization.getCreatedAt()).toBeInstanceOf(Date);
      expect(organization.getCreatedAt().getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(organization.getCreatedAt().getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });

    it('should track last updated timestamp', () => {
      // Arrange
      const organization = new Organization({
        name: 'Update Test Corp'
      });
      const originalUpdatedAt = organization.getUpdatedAt();

      // Wait a bit to ensure timestamp difference
      jest.advanceTimersByTime(100);

      // Act
      organization.updateName('Updated Name');

      // Assert
      expect(organization.getUpdatedAt()).toBeInstanceOf(Date);
      expect(organization.getUpdatedAt().getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Organization Serialization', () => {
    it('should serialize to plain object', () => {
      // Arrange
      const orgData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Serialize Corp',
        industry: 'Technology',
        size: 'Large',
        website: 'https://serialize.com',
        description: 'Test serialization'
      };
      const organization = new Organization(orgData);
      organization.addContact('contact-1');
      organization.addContact('contact-2');

      // Act
      const serialized = organization.toJSON();

      // Assert
      expect(serialized).toMatchObject({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Serialize Corp',
        industry: 'Technology',
        size: 'Large',
        website: 'https://serialize.com',
        description: 'Test serialization',
        contacts: ['contact-1', 'contact-2'],
        contactCount: 2,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });
  });
});

// Import statements (these will fail initially)
import { Organization } from '@crm-core/domain/entities/organization'; 