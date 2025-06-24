// CRM Core Task Repository Tests
// These tests drive the development of the Task repository pattern

import { Task } from '@crm-core/domain/entities/task';

describe('TaskRepository', () => {
  let repository: TaskRepository;

  beforeEach(() => {
    repository = new InMemoryTaskRepository();
  });

  describe('Task Creation', () => {
    it('should save a new task', async () => {
      // Arrange
      const task = new Task({
        title: 'Follow up with client',
        description: 'Call client to discuss project status',
        priority: 'high',
        dueDate: new Date('2024-03-15'),
        contactId: 'contact-123'
      });

      // Act
      const savedTask = await repository.save(task);

      // Assert
      expect(savedTask).toBeDefined();
      expect(savedTask.getId()).toBe(task.getId());
      expect(savedTask.getTitle()).toBe('Follow up with client');
      expect(savedTask.getPriority()).toBe('high');
      expect(savedTask.getStatus()).toBe('pending');
    });

    it('should update an existing task', async () => {
      // Arrange
      const task = new Task({
        id: 'existing-task-id',
        title: 'Original Task',
        priority: 'low',
        contactId: 'contact-456'
      });
      await repository.save(task);

      // Act
      task.updateTitle('Updated Task');
      task.updatePriority('urgent');
      const updatedTask = await repository.save(task);

      // Assert
      expect(updatedTask.getTitle()).toBe('Updated Task');
      expect(updatedTask.getPriority()).toBe('urgent');
      expect(updatedTask.getId()).toBe('existing-task-id');
    });
  });

  describe('Task Retrieval', () => {
    it('should find task by ID', async () => {
      // Arrange
      const task = new Task({
        id: 'find-test-id',
        title: 'Find Test Task',
        priority: 'medium',
        contactId: 'contact-789'
      });
      await repository.save(task);

      // Act
      const foundTask = await repository.findById('find-test-id');

      // Assert
      expect(foundTask).toBeDefined();
      expect(foundTask!.getId()).toBe('find-test-id');
      expect(foundTask!.getTitle()).toBe('Find Test Task');
      expect(foundTask!.getPriority()).toBe('medium');
    });

    it('should return undefined for non-existent task', async () => {
      // Act
      const foundTask = await repository.findById('non-existent-id');

      // Assert
      expect(foundTask).toBeUndefined();
    });
  });

  describe('Task Listing', () => {
    it('should find all tasks', async () => {
      // Arrange
      const task1 = new Task({
        title: 'Task One',
        priority: 'high',
        contactId: 'contact-1'
      });
      const task2 = new Task({
        title: 'Task Two',
        priority: 'low',
        contactId: 'contact-2'
      });
      await repository.save(task1);
      await repository.save(task2);

      // Act
      const allTasks = await repository.findAll();

      // Assert
      expect(allTasks).toHaveLength(2);
      expect(allTasks.map(t => t.getTitle())).toContain('Task One');
      expect(allTasks.map(t => t.getTitle())).toContain('Task Two');
    });

    it('should find tasks by status', async () => {
      // Arrange
      const pendingTask = new Task({
        title: 'Pending Task',
        priority: 'medium',
        contactId: 'contact-1'
      });
      const inProgressTask = new Task({
        title: 'In Progress Task',
        priority: 'high',
        contactId: 'contact-2'
      });
      const completedTask = new Task({
        title: 'Completed Task',
        priority: 'low',
        contactId: 'contact-3'
      });
      
      await repository.save(pendingTask);
      await repository.save(inProgressTask);
      await repository.save(completedTask);
      
      // Update statuses
      inProgressTask.markAsInProgress();
      completedTask.markAsCompleted();
      await repository.save(inProgressTask);
      await repository.save(completedTask);

      // Act
      const pendingTasks = await repository.findByStatus('pending');
      const inProgressTasks = await repository.findByStatus('in_progress');
      const completedTasks = await repository.findByStatus('completed');

      // Assert
      expect(pendingTasks).toHaveLength(1);
      expect(pendingTasks[0].getTitle()).toBe('Pending Task');
      expect(inProgressTasks).toHaveLength(1);
      expect(inProgressTasks[0].getTitle()).toBe('In Progress Task');
      expect(completedTasks).toHaveLength(1);
      expect(completedTasks[0].getTitle()).toBe('Completed Task');
    });

    it('should find tasks by priority', async () => {
      // Arrange
      const highTask1 = new Task({
        title: 'High Priority Task 1',
        priority: 'high',
        contactId: 'contact-1'
      });
      const highTask2 = new Task({
        title: 'High Priority Task 2',
        priority: 'urgent',
        contactId: 'contact-2'
      });
      const lowTask = new Task({
        title: 'Low Priority Task',
        priority: 'low',
        contactId: 'contact-3'
      });
      
      await repository.save(highTask1);
      await repository.save(highTask2);
      await repository.save(lowTask);

      // Act
      const highPriorityTasks = await repository.findByPriority('high');
      const urgentTasks = await repository.findByPriority('urgent');

      // Assert
      expect(highPriorityTasks).toHaveLength(1);
      expect(highPriorityTasks[0].getTitle()).toBe('High Priority Task 1');
      expect(urgentTasks).toHaveLength(1);
      expect(urgentTasks[0].getTitle()).toBe('High Priority Task 2');
    });

    it('should find overdue tasks', async () => {
      // Arrange
      const pastDate = new Date('2020-01-01');
      const futureDate = new Date('2030-01-01');
      
      const overdueTask = new Task({
        title: 'Overdue Task',
        priority: 'high',
        dueDate: pastDate,
        contactId: 'contact-1'
      });
      const futureTask = new Task({
        title: 'Future Task',
        priority: 'medium',
        dueDate: futureDate,
        contactId: 'contact-2'
      });
      const noDateTask = new Task({
        title: 'No Date Task',
        priority: 'low',
        contactId: 'contact-3'
      });
      
      await repository.save(overdueTask);
      await repository.save(futureTask);
      await repository.save(noDateTask);

      // Act
      const overdueTasks = await repository.findOverdue();

      // Assert
      expect(overdueTasks).toHaveLength(1);
      expect(overdueTasks[0].getTitle()).toBe('Overdue Task');
      expect(overdueTasks[0].isOverdue()).toBe(true);
    });

    it('should find high priority tasks', async () => {
      // Arrange
      const urgentTask = new Task({
        title: 'Urgent Task',
        priority: 'urgent',
        contactId: 'contact-1'
      });
      const highTask = new Task({
        title: 'High Task',
        priority: 'high',
        contactId: 'contact-2'
      });
      const mediumTask = new Task({
        title: 'Medium Task',
        priority: 'medium',
        contactId: 'contact-3'
      });
      
      await repository.save(urgentTask);
      await repository.save(highTask);
      await repository.save(mediumTask);

      // Act
      const highPriorityTasks = await repository.findHighPriority();

      // Assert
      expect(highPriorityTasks).toHaveLength(2);
      expect(highPriorityTasks.map(t => t.getTitle())).toContain('Urgent Task');
      expect(highPriorityTasks.map(t => t.getTitle())).toContain('High Task');
      expect(highPriorityTasks.map(t => t.getTitle())).not.toContain('Medium Task');
    });

    it('should support pagination', async () => {
      // Arrange
      for (let i = 1; i <= 15; i++) {
        const task = new Task({
          title: `Task ${i}`,
          priority: 'medium',
          contactId: `contact-${i}`
        });
        await repository.save(task);
      }

      // Act
      const page1 = await repository.findAll({ page: 1, limit: 5 });
      const page2 = await repository.findAll({ page: 2, limit: 5 });

      // Assert
      expect(page1).toHaveLength(5);
      expect(page2).toHaveLength(5);
      // Ensure different tasks on different pages
      const page1Ids = page1.map(t => t.getId());
      const page2Ids = page2.map(t => t.getId());
      expect(page1Ids).not.toEqual(page2Ids);
    });
  });

  describe('Task Search', () => {
    it('should search tasks by title', async () => {
      // Arrange
      const task1 = new Task({
        title: 'Important client meeting',
        priority: 'high',
        contactId: 'contact-1'
      });
      const task2 = new Task({
        title: 'Review project documents',
        priority: 'medium',
        contactId: 'contact-2'
      });
      const task3 = new Task({
        title: 'Important deadline preparation',
        priority: 'urgent',
        contactId: 'contact-3'
      });
      
      await repository.save(task1);
      await repository.save(task2);
      await repository.save(task3);

      // Act
      const results = await repository.search('Important');

      // Assert
      expect(results).toHaveLength(2);
      expect(results.map(t => t.getTitle())).toContain('Important client meeting');
      expect(results.map(t => t.getTitle())).toContain('Important deadline preparation');
      expect(results.map(t => t.getTitle())).not.toContain('Review project documents');
    });

    it('should search tasks by description', async () => {
      // Arrange
      const task = new Task({
        title: 'Generic Task',
        description: 'This task has unique search term abc789',
        priority: 'medium',
        contactId: 'contact-1'
      });
      await repository.save(task);

      // Act
      const results = await repository.search('abc789');

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].getDescription()).toContain('abc789');
    });

    it('should return empty array for no matches', async () => {
      // Act
      const results = await repository.search('nonexistentterm');

      // Assert
      expect(results).toHaveLength(0);
    });
  });

  describe('Task Deletion', () => {
    it('should delete task by ID', async () => {
      // Arrange
      const task = new Task({
        id: 'delete-test-id',
        title: 'Delete Test Task',
        priority: 'low',
        contactId: 'contact-delete'
      });
      await repository.save(task);

      // Act
      const deleted = await repository.delete('delete-test-id');

      // Assert
      expect(deleted).toBe(true);
      const foundTask = await repository.findById('delete-test-id');
      expect(foundTask).toBeUndefined();
    });

    it('should return false for non-existent task deletion', async () => {
      // Act
      const deleted = await repository.delete('non-existent-id');

      // Assert
      expect(deleted).toBe(false);
    });
  });

  describe('Repository State', () => {
    it('should count total tasks', async () => {
      // Arrange
      for (let i = 1; i <= 9; i++) {
        const task = new Task({
          title: `Count Test Task ${i}`,
          priority: 'medium',
          contactId: `contact-${i}`
        });
        await repository.save(task);
      }

      // Act
      const count = await repository.count();

      // Assert
      expect(count).toBe(9);
    });

    it('should check if task exists', async () => {
      // Arrange
      const task = new Task({
        id: 'exists-test-id',
        title: 'Exists Test Task',
        priority: 'high',
        contactId: 'contact-exists'
      });
      await repository.save(task);

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
import { TaskRepository } from '@crm-core/domain/repositories/task-repository';
import { InMemoryTaskRepository } from '@crm-core/infrastructure/repositories/in-memory-task-repository'; 