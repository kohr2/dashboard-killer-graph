// Communication Entity - CRM Core Domain
// This class represents a communication record (email, call, meeting, etc.) in the CRM system

// Simple UUID generator for testing purposes
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface CommunicationData {
  id?: string;
  type: CommunicationType;
  subject: string;
  content?: string;
  direction: CommunicationDirection;
  contactId: string;
  organizationId?: string;
  duration?: number;
  scheduledAt?: Date;
  location?: string;
  status?: CommunicationStatus;
}

// Valid communication types
const VALID_TYPES = ['email', 'call', 'meeting', 'sms', 'note'] as const;
export type CommunicationType = typeof VALID_TYPES[number];

// Valid communication directions
const VALID_DIRECTIONS = ['inbound', 'outbound'] as const;
export type CommunicationDirection = typeof VALID_DIRECTIONS[number];

// Valid communication statuses
const VALID_STATUSES = ['pending', 'completed', 'failed', 'cancelled'] as const;
export type CommunicationStatus = typeof VALID_STATUSES[number];

export class Communication {
  private id: string;
  private type: CommunicationType;
  private subject: string;
  private content?: string;
  private direction: CommunicationDirection;
  private contactId: string;
  private organizationId?: string;
  private duration?: number;
  private scheduledAt?: Date;
  private location?: string;
  private status: CommunicationStatus;
  private completedAt?: Date;
  private failureReason?: string;
  private createdAt: Date;
  private updatedAt: Date;
  
  constructor(data: CommunicationData) {
    // Validate required fields
    if (!data.subject || data.subject.trim().length === 0) {
      throw new Error('Subject is required');
    }
    
    if (!data.contactId) {
      throw new Error('Contact ID is required');
    }
    
    // Validate enums
    this.validateType(data.type);
    this.validateDirection(data.direction);
    
    if (data.status) {
      this.validateStatus(data.status);
    }
    
    // Set properties
    this.id = data.id || generateUUID();
    this.type = data.type;
    this.subject = data.subject.trim();
    this.content = data.content?.trim();
    this.direction = data.direction;
    this.contactId = data.contactId;
    this.organizationId = data.organizationId;
    this.duration = data.duration;
    this.scheduledAt = data.scheduledAt;
    this.location = data.location?.trim();
    this.status = data.status || 'pending';
    
    // Set timestamps
    const now = new Date();
    this.createdAt = now;
    this.updatedAt = now;
  }
  
  getId(): string {
    return this.id;
  }
  
  getType(): CommunicationType {
    return this.type;
  }
  
  getSubject(): string {
    return this.subject;
  }
  
  getContent(): string | undefined {
    return this.content;
  }
  
  getDirection(): CommunicationDirection {
    return this.direction;
  }
  
  getContactId(): string {
    return this.contactId;
  }
  
  getOrganizationId(): string | undefined {
    return this.organizationId;
  }
  
  getDuration(): number | undefined {
    return this.duration;
  }
  
  getScheduledAt(): Date | undefined {
    return this.scheduledAt;
  }
  
  getLocation(): string | undefined {
    return this.location;
  }
  
  getStatus(): CommunicationStatus {
    return this.status;
  }
  
  getCompletedAt(): Date | undefined {
    return this.completedAt;
  }
  
  getFailureReason(): string | undefined {
    return this.failureReason;
  }
  
  updateSubject(subject: string): void {
    if (!subject || subject.trim().length === 0) {
      throw new Error('Subject is required');
    }
    
    this.subject = subject.trim();
    this.updatedAt = new Date();
  }
  
  updateContent(content: string): void {
    this.content = content.trim();
    this.updatedAt = new Date();
  }
  
  updateStatus(status: CommunicationStatus): void {
    this.validateStatus(status);
    this.status = status;
    this.updatedAt = new Date();
  }
  
  markAsCompleted(): void {
    this.status = 'completed';
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }
  
  markAsFailed(reason: string): void {
    this.status = 'failed';
    this.failureReason = reason;
    this.updatedAt = new Date();
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
      type: this.type,
      subject: this.subject,
      content: this.content,
      direction: this.direction,
      contactId: this.contactId,
      organizationId: this.organizationId,
      duration: this.duration,
      scheduledAt: this.scheduledAt,
      location: this.location,
      status: this.status,
      completedAt: this.completedAt,
      failureReason: this.failureReason,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
  
  private validateType(type: string): void {
    if (!VALID_TYPES.includes(type as CommunicationType)) {
      throw new Error('Invalid communication type');
    }
  }
  
  private validateDirection(direction: string): void {
    if (!VALID_DIRECTIONS.includes(direction as CommunicationDirection)) {
      throw new Error('Invalid communication direction');
    }
  }
  
  private validateStatus(status: string): void {
    if (!VALID_STATUSES.includes(status as CommunicationStatus)) {
      throw new Error('Invalid communication status');
    }
  }
} 