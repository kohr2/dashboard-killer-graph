// CRM Core Communication Entity Tests
// These tests drive the development of the Communication domain model

describe('Communication Entity', () => {
  describe('Communication Creation', () => {
    it('should create email communication with valid data', () => {
      // Arrange
      const commData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'email',
        subject: 'Project Discussion',
        content: 'Let\'s discuss the upcoming project requirements.',
        direction: 'outbound',
        contactId: 'contact-123',
        organizationId: 'org-456'
      };

      // Act
      const communication = new Communication(commData);

      // Assert
      expect(communication.getId()).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(communication.getType()).toBe('email');
      expect(communication.getSubject()).toBe('Project Discussion');
      expect(communication.getContent()).toBe('Let\'s discuss the upcoming project requirements.');
      expect(communication.getDirection()).toBe('outbound');
      expect(communication.getContactId()).toBe('contact-123');
      expect(communication.getOrganizationId()).toBe('org-456');
    });

    it('should create phone call communication', () => {
      // Arrange
      const commData = {
        type: 'call',
        subject: 'Follow-up Call',
        direction: 'inbound',
        contactId: 'contact-789',
        duration: 1800 // 30 minutes in seconds
      };

      // Act
      const communication = new Communication(commData);

      // Assert
      expect(communication.getType()).toBe('call');
      expect(communication.getSubject()).toBe('Follow-up Call');
      expect(communication.getDirection()).toBe('inbound');
      expect(communication.getDuration()).toBe(1800);
    });

    it('should create meeting communication', () => {
      // Arrange
      const commData = {
        type: 'meeting',
        subject: 'Quarterly Review',
        direction: 'outbound',
        contactId: 'contact-999',
        scheduledAt: new Date('2024-02-15T10:00:00Z'),
        location: 'Conference Room A'
      };

      // Act
      const communication = new Communication(commData);

      // Assert
      expect(communication.getType()).toBe('meeting');
      expect(communication.getSubject()).toBe('Quarterly Review');
      expect(communication.getScheduledAt()).toEqual(new Date('2024-02-15T10:00:00Z'));
      expect(communication.getLocation()).toBe('Conference Room A');
    });

    it('should generate ID if not provided', () => {
      // Arrange
      const commData = {
        type: 'email',
        subject: 'Test Email',
        direction: 'outbound',
        contactId: 'contact-123'
      };

      // Act
      const communication = new Communication(commData);

      // Assert
      expect(communication.getId()).toBeDefined();
      expect(communication.getId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  describe('Communication Validation', () => {
    it('should throw error for invalid communication type', () => {
      // Arrange
      const invalidData = {
        type: 'invalid-type',
        subject: 'Test',
        direction: 'outbound',
        contactId: 'contact-123'
      };

      // Act & Assert
      expect(() => new Communication(invalidData)).toThrow('Invalid communication type');
    });

    it('should throw error for invalid direction', () => {
      // Arrange
      const invalidData = {
        type: 'email',
        subject: 'Test',
        direction: 'invalid-direction',
        contactId: 'contact-123'
      };

      // Act & Assert
      expect(() => new Communication(invalidData)).toThrow('Invalid communication direction');
    });

    it('should throw error for missing subject', () => {
      // Arrange
      const invalidData = {
        type: 'email',
        direction: 'outbound',
        contactId: 'contact-123'
      };

      // Act & Assert
      expect(() => new Communication(invalidData as any)).toThrow('Subject is required');
    });

    it('should throw error for empty subject', () => {
      // Arrange
      const invalidData = {
        type: 'email',
        subject: '',
        direction: 'outbound',
        contactId: 'contact-123'
      };

      // Act & Assert
      expect(() => new Communication(invalidData)).toThrow('Subject is required');
    });

    it('should throw error for missing contact ID', () => {
      // Arrange
      const invalidData = {
        type: 'email',
        subject: 'Test',
        direction: 'outbound'
      };

      // Act & Assert
      expect(() => new Communication(invalidData as any)).toThrow('Contact ID is required');
    });
  });

  describe('Communication Updates', () => {
    it('should update communication subject', () => {
      // Arrange
      const communication = new Communication({
        type: 'email',
        subject: 'Original Subject',
        direction: 'outbound',
        contactId: 'contact-123'
      });

      // Act
      communication.updateSubject('Updated Subject');

      // Assert
      expect(communication.getSubject()).toBe('Updated Subject');
    });

    it('should update communication content', () => {
      // Arrange
      const communication = new Communication({
        type: 'email',
        subject: 'Test Email',
        direction: 'outbound',
        contactId: 'contact-123'
      });

      // Act
      communication.updateContent('Updated content');

      // Assert
      expect(communication.getContent()).toBe('Updated content');
    });

    it('should update communication status', () => {
      // Arrange
      const communication = new Communication({
        type: 'email',
        subject: 'Test Email',
        direction: 'outbound',
        contactId: 'contact-123'
      });

      // Act
      communication.updateStatus('completed');

      // Assert
      expect(communication.getStatus()).toBe('completed');
    });

    it('should throw error for invalid status', () => {
      // Arrange
      const communication = new Communication({
        type: 'email',
        subject: 'Test Email',
        direction: 'outbound',
        contactId: 'contact-123'
      });

      // Act & Assert
      expect(() => communication.updateStatus('invalid-status')).toThrow('Invalid communication status');
    });
  });

  describe('Communication Status Management', () => {
    it('should start with pending status by default', () => {
      // Arrange & Act
      const communication = new Communication({
        type: 'email',
        subject: 'Test Email',
        direction: 'outbound',
        contactId: 'contact-123'
      });

      // Assert
      expect(communication.getStatus()).toBe('pending');
    });

    it('should mark communication as completed', () => {
      // Arrange
      const communication = new Communication({
        type: 'call',
        subject: 'Customer Call',
        direction: 'outbound',
        contactId: 'contact-123'
      });

      // Act
      communication.markAsCompleted();

      // Assert
      expect(communication.getStatus()).toBe('completed');
      expect(communication.getCompletedAt()).toBeInstanceOf(Date);
    });

    it('should mark communication as failed', () => {
      // Arrange
      const communication = new Communication({
        type: 'email',
        subject: 'Test Email',
        direction: 'outbound',
        contactId: 'contact-123'
      });

      // Act
      communication.markAsFailed('Email bounced');

      // Assert
      expect(communication.getStatus()).toBe('failed');
      expect(communication.getFailureReason()).toBe('Email bounced');
    });
  });

  describe('Communication Metadata', () => {
    it('should track creation timestamp', () => {
      // Arrange
      const beforeCreation = new Date();
      
      // Act
      const communication = new Communication({
        type: 'email',
        subject: 'Timestamp Test',
        direction: 'outbound',
        contactId: 'contact-123'
      });
      
      const afterCreation = new Date();

      // Assert
      expect(communication.getCreatedAt()).toBeInstanceOf(Date);
      expect(communication.getCreatedAt().getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(communication.getCreatedAt().getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });

    it('should track last updated timestamp', () => {
      // Arrange
      const communication = new Communication({
        type: 'email',
        subject: 'Update Test',
        direction: 'outbound',
        contactId: 'contact-123'
      });
      const originalUpdatedAt = communication.getUpdatedAt();

      // Wait a bit to ensure timestamp difference
      jest.advanceTimersByTime(100);

      // Act
      communication.updateSubject('Updated Subject');

      // Assert
      expect(communication.getUpdatedAt()).toBeInstanceOf(Date);
      expect(communication.getUpdatedAt().getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Communication Serialization', () => {
    it('should serialize to plain object', () => {
      // Arrange
      const commData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'email',
        subject: 'Serialize Test',
        content: 'Test content',
        direction: 'outbound',
        contactId: 'contact-123',
        organizationId: 'org-456',
        duration: 1200
      };
      const communication = new Communication(commData);
      communication.markAsCompleted();

      // Act
      const serialized = communication.toJSON();

      // Assert
      expect(serialized).toMatchObject({
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'email',
        subject: 'Serialize Test',
        content: 'Test content',
        direction: 'outbound',
        contactId: 'contact-123',
        organizationId: 'org-456',
        duration: 1200,
        status: 'completed',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        completedAt: expect.any(Date)
      });
    });
  });
});

// Import statements (these will fail initially)
import { Communication } from '@crm-core/domain/entities/communication'; 