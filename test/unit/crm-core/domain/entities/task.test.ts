// CRM Core Task Entity Tests
// These tests drive the development of the Task domain model

describe('Task Entity', () => {
  describe('Task Creation', () => {
    it('should create task with valid data', () => {
      // Arrange
      const taskData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Follow up with client',
        description: 'Call client to discuss project requirements',
        priority: 'high',
        status: 'pending',
        dueDate: new Date('2024-02-15T10:00:00Z'),
        contactId: 'contact-123',
        organizationId: 'org-456'
      };

      // Act
      const task = new Task(taskData);

      // Assert
      expect(task.getId()).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(task.getTitle()).toBe('Follow up with client');
      expect(task.getDescription()).toBe('Call client to discuss project requirements');
      expect(task.getPriority()).toBe('high');
      expect(task.getStatus()).toBe('pending');
      expect(task.getDueDate()).toEqual(new Date('2024-02-15T10:00:00Z'));
      expect(task.getContactId()).toBe('contact-123');
      expect(task.getOrganizationId()).toBe('org-456');
    });

    it('should create task with minimal required data', () => {
      // Arrange
      const taskData = {
        title: 'Simple Task',
        contactId: 'contact-789'
      };

      // Act
      const task = new Task(taskData);

      // Assert
      expect(task.getTitle()).toBe('Simple Task');
      expect(task.getContactId()).toBe('contact-789');
      expect(task.getPriority()).toBe('medium'); // default
      expect(task.getStatus()).toBe('pending'); // default
      expect(task.getDescription()).toBeUndefined();
      expect(task.getDueDate()).toBeUndefined();
    });

    it('should generate ID if not provided', () => {
      // Arrange
      const taskData = {
        title: 'Auto ID Task',
        contactId: 'contact-123'
      };

      // Act
      const task = new Task(taskData);

      // Assert
      expect(task.getId()).toBeDefined();
      expect(task.getId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  describe('Task Validation', () => {
    it('should throw error for empty title', () => {
      // Arrange
      const invalidData = {
        title: '',
        contactId: 'contact-123'
      };

      // Act & Assert
      expect(() => new Task(invalidData)).toThrow('Title is required');
    });

    it('should throw error for missing title', () => {
      // Arrange
      const invalidData = {
        contactId: 'contact-123'
      };

      // Act & Assert
      expect(() => new Task(invalidData as any)).toThrow('Title is required');
    });

    it('should throw error for missing contact ID', () => {
      // Arrange
      const invalidData = {
        title: 'Test Task'
      };

      // Act & Assert
      expect(() => new Task(invalidData as any)).toThrow('Contact ID is required');
    });

    it('should throw error for invalid priority', () => {
      // Arrange
      const invalidData = {
        title: 'Test Task',
        contactId: 'contact-123',
        priority: 'invalid-priority'
      };

      // Act & Assert
      expect(() => new Task(invalidData)).toThrow('Invalid task priority');
    });

    it('should throw error for invalid status', () => {
      // Arrange
      const invalidData = {
        title: 'Test Task',
        contactId: 'contact-123',
        status: 'invalid-status'
      };

      // Act & Assert
      expect(() => new Task(invalidData)).toThrow('Invalid task status');
    });
  });

  describe('Task Updates', () => {
    it('should update task title', () => {
      // Arrange
      const task = new Task({
        title: 'Original Title',
        contactId: 'contact-123'
      });

      // Act
      task.updateTitle('Updated Title');

      // Assert
      expect(task.getTitle()).toBe('Updated Title');
    });

    it('should update task description', () => {
      // Arrange
      const task = new Task({
        title: 'Test Task',
        contactId: 'contact-123'
      });

      // Act
      task.updateDescription('Updated description');

      // Assert
      expect(task.getDescription()).toBe('Updated description');
    });

    it('should update task priority with validation', () => {
      // Arrange
      const task = new Task({
        title: 'Test Task',
        contactId: 'contact-123'
      });

      // Act
      task.updatePriority('urgent');

      // Assert
      expect(task.getPriority()).toBe('urgent');
    });

    it('should throw error when updating to invalid priority', () => {
      // Arrange
      const task = new Task({
        title: 'Test Task',
        contactId: 'contact-123'
      });

      // Act & Assert
      expect(() => task.updatePriority('invalid')).toThrow('Invalid task priority');
    });

    it('should update due date', () => {
      // Arrange
      const task = new Task({
        title: 'Test Task',
        contactId: 'contact-123'
      });
      const newDueDate = new Date('2024-03-01T09:00:00Z');

      // Act
      task.updateDueDate(newDueDate);

      // Assert
      expect(task.getDueDate()).toEqual(newDueDate);
    });
  });

  describe('Task Status Management', () => {
    it('should mark task as in progress', () => {
      // Arrange
      const task = new Task({
        title: 'Test Task',
        contactId: 'contact-123'
      });

      // Act
      task.markAsInProgress();

      // Assert
      expect(task.getStatus()).toBe('in_progress');
      expect(task.getStartedAt()).toBeInstanceOf(Date);
    });

    it('should mark task as completed', () => {
      // Arrange
      const task = new Task({
        title: 'Test Task',
        contactId: 'contact-123'
      });

      // Act
      task.markAsCompleted();

      // Assert
      expect(task.getStatus()).toBe('completed');
      expect(task.getCompletedAt()).toBeInstanceOf(Date);
    });

    it('should mark task as cancelled', () => {
      // Arrange
      const task = new Task({
        title: 'Test Task',
        contactId: 'contact-123'
      });

      // Act
      task.markAsCancelled('Client cancelled project');

      // Assert
      expect(task.getStatus()).toBe('cancelled');
      expect(task.getCancellationReason()).toBe('Client cancelled project');
    });

    it('should update status directly with validation', () => {
      // Arrange
      const task = new Task({
        title: 'Test Task',
        contactId: 'contact-123'
      });

      // Act
      task.updateStatus('completed');

      // Assert
      expect(task.getStatus()).toBe('completed');
    });
  });

  describe('Task Priority and Due Date Logic', () => {
    it('should check if task is overdue', () => {
      // Arrange
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const task = new Task({
        title: 'Overdue Task',
        contactId: 'contact-123',
        dueDate: pastDate
      });

      // Act & Assert
      expect(task.isOverdue()).toBe(true);
    });

    it('should check if task is not overdue', () => {
      // Arrange
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const task = new Task({
        title: 'Future Task',
        contactId: 'contact-123',
        dueDate: futureDate
      });

      // Act & Assert
      expect(task.isOverdue()).toBe(false);
    });

    it('should return false for overdue when no due date', () => {
      // Arrange
      const task = new Task({
        title: 'No Due Date Task',
        contactId: 'contact-123'
      });

      // Act & Assert
      expect(task.isOverdue()).toBe(false);
    });

    it('should check if task is high priority', () => {
      // Arrange
      const task = new Task({
        title: 'High Priority Task',
        contactId: 'contact-123',
        priority: 'urgent'
      });

      // Act & Assert
      expect(task.isHighPriority()).toBe(true);
    });
  });

  describe('Task Metadata', () => {
    it('should track creation timestamp', () => {
      // Arrange
      const beforeCreation = new Date();
      
      // Act
      const task = new Task({
        title: 'Timestamp Test',
        contactId: 'contact-123'
      });
      
      const afterCreation = new Date();

      // Assert
      expect(task.getCreatedAt()).toBeInstanceOf(Date);
      expect(task.getCreatedAt().getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(task.getCreatedAt().getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });

    it('should track last updated timestamp', () => {
      // Arrange
      const task = new Task({
        title: 'Update Test',
        contactId: 'contact-123'
      });
      const originalUpdatedAt = task.getUpdatedAt();

      // Wait a bit to ensure timestamp difference
      jest.advanceTimersByTime(100);

      // Act
      task.updateTitle('Updated Title');

      // Assert
      expect(task.getUpdatedAt()).toBeInstanceOf(Date);
      expect(task.getUpdatedAt().getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Task Serialization', () => {
    it('should serialize to plain object', () => {
      // Arrange
      const taskData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Serialize Test',
        description: 'Test serialization',
        priority: 'high',
        status: 'pending',
        dueDate: new Date('2024-02-15T10:00:00Z'),
        contactId: 'contact-123',
        organizationId: 'org-456'
      };
      const task = new Task(taskData);
      task.markAsCompleted();

      // Act
      const serialized = task.toJSON();

      // Assert
      expect(serialized).toMatchObject({
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Serialize Test',
        description: 'Test serialization',
        priority: 'high',
        status: 'completed',
        dueDate: new Date('2024-02-15T10:00:00Z'),
        contactId: 'contact-123',
        organizationId: 'org-456',
        isOverdue: expect.any(Boolean),
        isHighPriority: expect.any(Boolean),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        completedAt: expect.any(Date)
      });
    });
  });
});

// Import statements (these will fail initially)
import { Task } from '@crm-core/domain/entities/task'; 