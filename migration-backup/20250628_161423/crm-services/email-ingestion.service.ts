// Email Ingestion Service - Application Layer
// Service for ingesting emails into the O-CREAM-v2 ontological system

import type { ContactRepository } from '../../domain/repositories/contact-repository';
import { EmailProcessingService } from './email-processing.service';
import { ContactOntology } from '../../domain/entities/contact-ontology';
import { User } from '@platform/security/domain/user';
import { AccessControlService } from '@platform/security/application/services/access-control.service';
import { inject, singleton } from 'tsyringe';

export interface IncomingEmail {
  messageId: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    content?: Buffer;
  }>;
  receivedAt: Date;
  headers: Record<string, string>;
  threadId?: string;
  inReplyTo?: string;
  references?: string[];
}

export interface EmailIngestionResult {
  success: boolean;
  message: string;
  communicationId?: string;
  contactsProcessed: number;
  knowledgeElementsCreated: number;
  activitiesCreated: number;
  // ontologyInsights: any;
}

@singleton()
export class EmailIngestionService {
  constructor(
    private emailProcessingService: EmailProcessingService,
    @inject('ContactRepository') private contactRepository: ContactRepository,
    private accessControlService: AccessControlService,
  ) {}

  async ingestEmail(user: User, email: IncomingEmail, emlFilePath?: string): Promise<EmailIngestionResult> {
    if (!this.accessControlService.can(user, 'create', 'Communication')) {
      throw new Error('Access denied');
    }

    if (emlFilePath) {
      await this.emailProcessingService.processEmlFile(emlFilePath);
      return {
        success: true,
        message: 'Email processed successfully.',
        contactsProcessed: 0,
        knowledgeElementsCreated: 0,
        activitiesCreated: 0,
      };
    }
    // Logique pour traiter un objet email directement
    // Pour l'instant, on retourne un échec
    return {
      success: false,
      message: 'Direct email object ingestion not implemented',
      contactsProcessed: 0,
      knowledgeElementsCreated: 0,
      activitiesCreated: 0,
    };
  }
} 