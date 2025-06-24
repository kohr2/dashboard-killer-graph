// Create Contact Use Case - Application Layer
// Use case for creating a new contact with O-CREAM-v2 integration

import { ContactRepository } from '../../../domain/repositories/contact-repository';
import { Contact } from '../../../domain/entities/contact';
import { OCreamContactEntity, createOCreamContact } from '../../../domain/entities/contact-ontology';
import { oCreamV2, ActivityType, DOLCECategory } from '../../../domain/ontology/o-cream-v2';

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

export class CreateContactUseCase {
  constructor(
    private contactRepository: ContactRepository
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

      // Create the basic contact entity
      const fullName = `${request.firstName.trim()} ${request.lastName.trim()}`;
      const contact = new Contact({
        name: fullName,
        email: request.email.trim(),
        phone: request.phone
      });

      // Save to repository
      const savedContact = await this.contactRepository.save(contact);

      // Create O-CREAM-v2 ontological representation
      let ontologyStatus: 'registered' | 'error' = 'registered';
      
      try {
        const oCreamContact = createOCreamContact({
          firstName: request.firstName.trim(),
          lastName: request.lastName.trim(),
          email: request.email.trim(),
          phone: request.phone,
          organizationId: request.organizationId,
          title: request.title,
          address: request.address,
          preferences: request.preferences || {}
        });

        // Override the ID to match the saved contact
        (oCreamContact as any).id = savedContact.getId();

        // Register with global ontology
        oCreamV2.addEntity(oCreamContact);

        // Create initial activity
        const creationActivity: any = {
          id: this.generateId(),
          category: DOLCECategory.PERDURANT,
          type: ActivityType.IDENTIFY,
          name: 'Contact Created',
          description: `Contact ${fullName} was created in the system`,
          participants: [savedContact.getId()],
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

        oCreamV2.addEntity(creationActivity);
        oCreamContact.addActivity(creationActivity.id);

      } catch (ontologyError) {
        console.warn('Failed to register contact with O-CREAM-v2 ontology:', ontologyError);
        ontologyStatus = 'error';
      }

      return {
        id: savedContact.getId(),
        success: true,
        message: 'Contact created successfully',
        contact: {
          id: savedContact.getId(),
          name: savedContact.getName(),
          email: savedContact.getEmail(),
          phone: savedContact.getPhone(),
          createdAt: savedContact.getCreatedAt(),
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