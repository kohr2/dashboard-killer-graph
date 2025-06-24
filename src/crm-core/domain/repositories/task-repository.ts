// Task Repository Interface
// Defines the contract for task data access operations

import { Task, TaskPriority, TaskStatus } from '../entities/task';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface TaskRepository {
  // Core CRUD operations
  save(task: Task): Promise<Task>;
  findById(id: string): Promise<Task | undefined>;
  findAll(options?: PaginationOptions): Promise<Task[]>;
  delete(id: string): Promise<boolean>;

  // Specialized queries
  findByStatus(status: TaskStatus): Promise<Task[]>;
  findByPriority(priority: TaskPriority): Promise<Task[]>;
  findOverdue(): Promise<Task[]>;
  findHighPriority(): Promise<Task[]>;
  search(query: string): Promise<Task[]>;

  // Repository state operations
  count(): Promise<number>;
  exists(id: string): Promise<boolean>;
} 