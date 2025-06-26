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

export class Communication {
  id: string;
  type: CommunicationType;
  status: CommunicationStatus;
  subject?: string;
  body: string;
  sender: string;
  recipients: string[];
  timestamp: Date;
  metadata?: Record<string, any>;

  constructor(data: {
    id: string;
    type: CommunicationType;
    status: CommunicationStatus;
    subject?: string;
    body: string;
    sender: string;
    recipients: string[];
    timestamp: Date;
    metadata?: Record<string, any>;
  }) {
    this.id = data.id;
    this.type = data.type;
    this.status = data.status;
    this.subject = data.subject;
    this.body = data.body;
    this.sender = data.sender;
    this.recipients = data.recipients;
    this.timestamp = data.timestamp;
    this.metadata = data.metadata;
  }
}
