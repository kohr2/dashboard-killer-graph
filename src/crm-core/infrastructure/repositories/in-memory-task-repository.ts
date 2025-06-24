// In-Memory Task Repository Implementation
// Provides in-memory storage for testing and development

import { Task, TaskPriority, TaskStatus } from '../../domain/entities/task';
import { TaskRepository, PaginationOptions } from '../../domain/repositories/task-repository';

export class InMemoryTaskRepository implements TaskRepository {
  private tasks: Map<string, Task> = new Map();

  async save(task: Task): Promise<Task> {
    this.tasks.set(task.getId(), task);
    return task;
  }

  async findById(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async findAll(options?: PaginationOptions): Promise<Task[]> {
    const allTasks = Array.from(this.tasks.values());
    
    if (!options) {
      return allTasks;
    }

    const { page, limit } = options;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return allTasks.slice(startIndex, endIndex);
  }

  async delete(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async findByStatus(status: TaskStatus): Promise<Task[]> {
    const results: Task[] = [];

    for (const task of this.tasks.values()) {
      if (task.getStatus() === status) {
        results.push(task);
      }
    }

    return results;
  }

  async findByPriority(priority: TaskPriority): Promise<Task[]> {
    const results: Task[] = [];

    for (const task of this.tasks.values()) {
      if (task.getPriority() === priority) {
        results.push(task);
      }
    }

    return results;
  }

  async findOverdue(): Promise<Task[]> {
    const results: Task[] = [];

    for (const task of this.tasks.values()) {
      if (task.isOverdue()) {
        results.push(task);
      }
    }

    return results;
  }

  async findHighPriority(): Promise<Task[]> {
    const results: Task[] = [];

    for (const task of this.tasks.values()) {
      if (task.isHighPriority()) {
        results.push(task);
      }
    }

    return results;
  }

  async search(query: string): Promise<Task[]> {
    const searchTerm = query.toLowerCase();
    const results: Task[] = [];

    for (const task of this.tasks.values()) {
      const title = task.getTitle().toLowerCase();
      const description = task.getDescription()?.toLowerCase() || '';
      
      if (title.includes(searchTerm) || description.includes(searchTerm)) {
        results.push(task);
      }
    }

    return results;
  }

  async count(): Promise<number> {
    return this.tasks.size;
  }

  async exists(id: string): Promise<boolean> {
    return this.tasks.has(id);
  }
} 