// Task Entity - CRM Core Domain
// This class represents a task/to-do item in the CRM system

// Simple UUID generator for testing purposes
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface TaskData {
  id?: string;
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  dueDate?: Date;
  contactId: string;
  organizationId?: string;
}

// Valid task priorities
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type TaskPriority = typeof VALID_PRIORITIES[number];

// Valid task statuses
const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const;
export type TaskStatus = typeof VALID_STATUSES[number];

// High priority levels
const HIGH_PRIORITY_LEVELS = ['high', 'urgent'];

export class Task {
  private id: string;
  private title: string;
  private description?: string;
  private priority: string;
  private status: string;
  private dueDate?: Date;
  private contactId: string;
  private organizationId?: string;
  private startedAt?: Date;
  private completedAt?: Date;
  private cancellationReason?: string;
  private createdAt: Date;
  private updatedAt: Date;
  
  constructor(data: TaskData) {
    // Validate required fields
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Title is required');
    }
    
    if (!data.contactId) {
      throw new Error('Contact ID is required');
    }
    
    // Validate optional enums if provided
    if (data.priority) {
      this.validatePriority(data.priority);
    }
    
    if (data.status) {
      this.validateStatus(data.status);
    }
    
    // Set properties
    this.id = data.id || generateUUID();
    this.title = data.title.trim();
    this.description = data.description?.trim();
    this.priority = data.priority || 'medium';
    this.status = data.status || 'pending';
    this.dueDate = data.dueDate;
    this.contactId = data.contactId;
    this.organizationId = data.organizationId;
    
    // Set timestamps
    const now = new Date();
    this.createdAt = now;
    this.updatedAt = now;
  }
  
  getId(): string {
    return this.id;
  }
  
  getTitle(): string {
    return this.title;
  }
  
  getDescription(): string | undefined {
    return this.description;
  }
  
  getPriority(): string {
    return this.priority;
  }
  
  getStatus(): string {
    return this.status;
  }
  
  getDueDate(): Date | undefined {
    return this.dueDate;
  }
  
  getContactId(): string {
    return this.contactId;
  }
  
  getOrganizationId(): string | undefined {
    return this.organizationId;
  }
  
  getStartedAt(): Date | undefined {
    return this.startedAt;
  }
  
  getCompletedAt(): Date | undefined {
    return this.completedAt;
  }
  
  getCancellationReason(): string | undefined {
    return this.cancellationReason;
  }
  
  updateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error('Title is required');
    }
    
    this.title = title.trim();
    this.updatedAt = new Date();
  }
  
  updateDescription(description: string): void {
    this.description = description.trim();
    this.updatedAt = new Date();
  }
  
  updatePriority(priority: string): void {
    this.validatePriority(priority);
    this.priority = priority;
    this.updatedAt = new Date();
  }
  
  updateStatus(status: string): void {
    this.validateStatus(status);
    this.status = status;
    this.updatedAt = new Date();
  }
  
  updateDueDate(dueDate: Date): void {
    this.dueDate = dueDate;
    this.updatedAt = new Date();
  }
  
  markAsInProgress(): void {
    this.status = 'in_progress';
    this.startedAt = new Date();
    this.updatedAt = new Date();
  }
  
  markAsCompleted(): void {
    this.status = 'completed';
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }
  
  markAsCancelled(reason: string): void {
    this.status = 'cancelled';
    this.cancellationReason = reason;
    this.updatedAt = new Date();
  }
  
  isOverdue(): boolean {
    if (!this.dueDate) {
      return false;
    }
    
    return new Date() > this.dueDate;
  }
  
  isHighPriority(): boolean {
    return HIGH_PRIORITY_LEVELS.includes(this.priority);
  }
  
  getCreatedAt(): Date {
    return this.createdAt;
  }
  
  getUpdatedAt(): Date {
    return this.updatedAt;
  }
  
  toJSON(): any {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      priority: this.priority,
      status: this.status,
      dueDate: this.dueDate,
      contactId: this.contactId,
      organizationId: this.organizationId,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      cancellationReason: this.cancellationReason,
      isOverdue: this.isOverdue(),
      isHighPriority: this.isHighPriority(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
  
  private validatePriority(priority: string): void {
    if (!VALID_PRIORITIES.includes(priority as TaskPriority)) {
      throw new Error('Invalid task priority');
    }
  }
  
  private validateStatus(status: string): void {
    if (!VALID_STATUSES.includes(status as TaskStatus)) {
      throw new Error('Invalid task status');
    }
  }
} 