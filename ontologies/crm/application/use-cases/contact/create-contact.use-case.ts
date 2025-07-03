// Create Contact Use Case - Application Layer
// Use case for creating a new contact with O-CREAM-v2 integration

import { injectable, inject } from 'tsyringe';
import { ContactRepository } from '@crm/repositories/contact-repository';
import { ContactDTO } from '@generated/crm/ContactDTO';
import { OrganizationDTO } from '@generated/crm/OrganizationDTO';
import { PersonDTO } from '@generated/crm/PersonDTO';
import {
  OCreamContactEntity,
  ContactOntology,
} from '@crm/domain/entities/contact-ontology';
import { User } from '@platform/security/domain/user';
import { GUEST_ROLE, ANALYST_ROLE } from '@platform/security/domain/role';
import {
  OCreamV2Ontology,
  DOLCECategory,
  KnowledgeType,
  ActivityType,
  RelationshipType,
  InformationElement,
  Activity,
} from '@crm/ontology/o-cream-v2';
import { createContactDTO } from '@platform/enrichment/dto-aliases';
import { logger } from '@shared/utils/logger';

// Temporary mapper functions until import issues are resolved
const mapContactToDTO = (contact: any): any => ({
  id: contact.id,
  name: contact.getName(),
  type: 'Contact',
  label: contact.getName(),
  enrichedData: '',
  email: contact.personalInfo.email,
  title: contact.personalInfo.title || '',
  firstName: contact.personalInfo.firstName,
  lastName: contact.personalInfo.lastName,
  phone: contact.personalInfo.phone || '',
  description: '',
  organizationId: contact.organizationId || '',
  activities: '',
  knowledgeElements: '',
  validationStatus: 'VALID',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  additionalEmails: '',
  address: '',
  preferences: '',
});

const mapDTOToContact = (dto: any): any => ({
  id: dto.id,
  personalInfo: {
    firstName: dto.firstName,
    lastName: dto.lastName,
    email: dto.email,
    phone: dto.phone,
    title: dto.title,
  },
  organizationId: dto.organizationId,
  createdAt: dto.createdAt,
  getId: () => dto.id,
  getName: () => dto.name,
  addActivity: (id: string) => ({ id }),
  addKnowledgeElement: (id: string) => ({ id }),
  getActivities: () => [],
  getKnowledgeElements: () => [],
  getOntologyMetadata: () => ({ validationStatus: 'VALID' }),
});

export interface CreateContactRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  organizationId?: string;
  title?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  preferences?: Record<string, any>;
  tags?: string[];
}

export interface CreateContactResponse {
  id: string;
  success: boolean;
  message: string;
  contact?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    createdAt: Date;
    ontologyStatus: 'registered' | 'error';
  };
}

@injectable()
export class CreateContactUseCase {
  constructor(
    @inject(ContactRepository) private contactRepository: ContactRepository
  ) {}

  async execute(request: CreateContactRequest): Promise<CreateContactResponse> {
    try {
      // Validate required fields
      if (!request.firstName?.trim()) {
        return {
          id: '',
          success: false,
          message: 'First name is required'
        };
      }

      if (!request.lastName?.trim()) {
        return {
          id: '',
          success: false,
          message: 'Last name is required'
        };
      }

      if (!request.email?.trim()) {
        return {
          id: '',
          success: false,
          message: 'Email is required'
        };
      }

      const fullName = `${request.firstName.trim()} ${request.lastName.trim()}`;
      
      // Create DTO using the factory function and save directly
      const contactDTO = createContactDTO({
        firstName: request.firstName.trim(),
        lastName: request.lastName.trim(),
        email: request.email.trim(),
        phone: request.phone,
        title: request.title,
      });

      const savedContactDTO = await this.contactRepository.save(contactDTO);

      // Convert back to legacy entity for ontology operations
      const savedContact = mapDTOToContact(savedContactDTO);

      // Register with global ontology and create activity
      let ontologyStatus: 'registered' | 'error' = 'registered';
      try {
        // The entity now has an ID from the repository
        OCreamV2Ontology.addEntity(savedContact);

        // Create initial activity
        const creationActivity: any = {
          id: this.generateId(),
          category: DOLCECategory.PhysicalObject,
          type: ActivityType.IDENTIFY,
          name: 'Contact Created',
          description: `Contact ${fullName} was created in the system`,
          participants: [savedContact.id], // Use savedContact.id
          startTime: new Date(),
          endTime: new Date(),
          status: 'completed' as const,
          success: true,
          context: { 
            source: 'application', 
            action: 'create',
            userAgent: 'crm-system'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        OCreamV2Ontology.addEntity(creationActivity);
        savedContact.addActivity(creationActivity.id);

      } catch (ontologyError) {
        logger.warn('Failed to register contact with O-CREAM-v2 ontology:', ontologyError);
        ontologyStatus = 'error';
      }

      return {
        id: savedContact.id,
        success: true,
        message: 'Contact created successfully',
        contact: {
          id: savedContact.id,
          name: `${savedContact.personalInfo.firstName} ${savedContact.personalInfo.lastName}`,
          email: savedContact.personalInfo.email,
          phone: savedContact.personalInfo.phone,
          createdAt: new Date(savedContact.createdAt),
          ontologyStatus
        }
      };

    } catch (error) {
      return {
        id: '',
        success: false,
        message: `Failed to create contact: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
