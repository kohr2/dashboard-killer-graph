// CRM Core Contact Entity Tests
// These tests drive the development of the core CRM domain model

describe('Contact Entity', () => {
  describe('Contact Creation', () => {
    it('should create contact with valid data', () => {
      // Arrange
      const contactData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        email: 'john.doe@company.com',
        phone: '+1-555-123-4567'
      };

      // Act
      const contact = new Contact(contactData);

      // Assert
      expect(contact.getId()).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(contact.getName()).toBe('John Doe');
      expect(contact.getEmail()).toBe('john.doe@company.com');
      expect(contact.getPhone()).toBe('+1-555-123-4567');
    });

    it('should create contact with minimal required data', () => {
      // Arrange
      const contactData = {
        id: '456e7890-e89b-12d3-a456-426614174001',
        name: 'Jane Smith',
        email: 'jane.smith@company.com'
      };

      // Act
      const contact = new Contact(contactData);

      // Assert
      expect(contact.getId()).toBe('456e7890-e89b-12d3-a456-426614174001');
      expect(contact.getName()).toBe('Jane Smith');
      expect(contact.getEmail()).toBe('jane.smith@company.com');
      expect(contact.getPhone()).toBeUndefined();
    });

    it('should generate ID if not provided', () => {
      // Arrange
      const contactData = {
        name: 'Auto ID Contact',
        email: 'auto@example.com'
      };

      // Act
      const contact = new Contact(contactData);

      // Assert
      expect(contact.getId()).toBeDefined();
      expect(contact.getId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  describe('Contact Validation', () => {
    it('should throw error for invalid email format', () => {
      // Arrange
      const invalidContactData = {
        name: 'Invalid Email Contact',
        email: 'not-an-email'
      };

      // Act & Assert
      expect(() => new Contact(invalidContactData)).toThrow('Invalid email format');
    });

    it('should throw error for empty name', () => {
      // Arrange
      const invalidContactData = {
        name: '',
        email: 'valid@email.com'
      };

      // Act & Assert
      expect(() => new Contact(invalidContactData)).toThrow('Name is required');
    });

    it('should throw error for missing email', () => {
      // Arrange
      const invalidContactData = {
        name: 'No Email Contact'
      };

      // Act & Assert
      expect(() => new Contact(invalidContactData as any)).toThrow('Email is required');
    });

    it('should validate phone number format', () => {
      // Arrange
      const invalidContactData = {
        name: 'Invalid Phone Contact',
        email: 'valid@email.com',
        phone: '123' // Invalid phone format
      };

      // Act & Assert
      expect(() => new Contact(invalidContactData)).toThrow('Invalid phone format');
    });
  });

  describe('Contact Updates', () => {
    it('should update contact name', () => {
      // Arrange
      const contact = new Contact({
        name: 'Original Name',
        email: 'test@example.com'
      });

      // Act
      contact.updateName('Updated Name');

      // Assert
      expect(contact.getName()).toBe('Updated Name');
    });

    it('should update contact email with validation', () => {
      // Arrange
      const contact = new Contact({
        name: 'Test Contact',
        email: 'original@example.com'
      });

      // Act
      contact.updateEmail('updated@example.com');

      // Assert
      expect(contact.getEmail()).toBe('updated@example.com');
    });

    it('should throw error when updating to invalid email', () => {
      // Arrange
      const contact = new Contact({
        name: 'Test Contact',
        email: 'valid@example.com'
      });

      // Act & Assert
      expect(() => contact.updateEmail('invalid-email')).toThrow('Invalid email format');
    });

    it('should update contact phone', () => {
      // Arrange
      const contact = new Contact({
        name: 'Test Contact',
        email: 'test@example.com'
      });

      // Act
      contact.updatePhone('+1-555-987-6543');

      // Assert
      expect(contact.getPhone()).toBe('+1-555-987-6543');
    });
  });

  describe('Contact Metadata', () => {
    it('should track creation timestamp', () => {
      // Arrange
      const beforeCreation = new Date();
      
      // Act
      const contact = new Contact({
        name: 'Timestamp Test',
        email: 'timestamp@example.com'
      });
      
      const afterCreation = new Date();

      // Assert
      expect(contact.getCreatedAt()).toBeInstanceOf(Date);
      expect(contact.getCreatedAt().getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(contact.getCreatedAt().getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });

    it('should track last updated timestamp', () => {
      // Arrange
      const contact = new Contact({
        name: 'Update Test',
        email: 'update@example.com'
      });
      const originalUpdatedAt = contact.getUpdatedAt();

      // Wait a bit to ensure timestamp difference
      jest.advanceTimersByTime(100);

      // Act
      contact.updateName('Updated Name');

      // Assert
      expect(contact.getUpdatedAt()).toBeInstanceOf(Date);
      expect(contact.getUpdatedAt().getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Contact Serialization', () => {
    it('should serialize to plain object', () => {
      // Arrange
      const contactData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Serialize Test',
        email: 'serialize@example.com',
        phone: '+1-555-000-0000'
      };
      const contact = new Contact(contactData);

      // Act
      const serialized = contact.toJSON();

      // Assert
      expect(serialized).toMatchObject({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Serialize Test',
        email: 'serialize@example.com',
        phone: '+1-555-000-0000',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });
  });
});

// Import statements (these will fail initially)
import { Contact } from '@crm-core/domain/entities/contact'; 