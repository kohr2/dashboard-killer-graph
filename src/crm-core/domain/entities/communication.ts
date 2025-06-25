export enum CommunicationStatus {
  RECEIVED = 'received',
  PROCESSED = 'processed',
  ARCHIVED = 'archived',
  FAILED = 'failed',
}

export enum CommunicationType {
  EMAIL = 'email',
  CALL = 'call',
  MEETING = 'meeting',
}

export interface Communication {
  id: string;
  type: CommunicationType;
  status: CommunicationStatus;
  subject?: string;
  body: string;
  sender: string;
  recipients: string[];
  timestamp: Date;
  metadata?: Record<string, any>;
}
