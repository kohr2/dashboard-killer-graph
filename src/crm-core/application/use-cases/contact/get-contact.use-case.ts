// Get Contact Use Case - Application Layer
// Use case for retrieving a contact with ontological insights

import { ContactRepository } from '../../../domain/repositories/contact-repository';
import { OCreamContactEntity } from '../../../domain/entities/contact-ontology';
import { oCreamV2, KnowledgeType, ActivityType, RelationshipType } from '../../../domain/ontology/o-cream-v2';

export interface GetContactRequest {
  id: string;
  includeOntologyData?: boolean;
}

export interface GetContactResponse {
  success: boolean;
  message: string;
  contact?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    createdAt: Date;
    updatedAt: Date;
    ontologyData?: {
      knowledgeElements: Array<{
        id: string;
        type: KnowledgeType;
        title: string;
        reliability: number;
        createdAt: Date;
      }>;
      activities: Array<{
        id: string;
        type: ActivityType;
        name: string;
        timestamp: Date;
        status: string;
      }>;
      relationships: Array<{
        id: string;
        type: RelationshipType;
        targetId: string;
        strength?: number;
      }>;
      ontologyHealth: {
        validationStatus: string;
        completenessScore: number;
        consistencyScore: number;
      };
    };
  };
}

export class GetContactUseCase {
  constructor(
    private contactRepository: ContactRepository
  ) {}

  async execute(request: GetContactRequest): Promise<GetContactResponse> {
    try {
      // Validate request
      if (!request.id?.trim()) {
        return {
          success: false,
          message: 'Contact ID is required'
        };
      }

      // Get contact from repository
      const contact = await this.contactRepository.findById(request.id);
      if (!contact) {
        return {
          success: false,
          message: 'Contact not found'
        };
      }

      // Prepare basic response
      const response: GetContactResponse = {
        success: true,
        message: 'Contact retrieved successfully',
        contact: {
          id: contact.id,
          name: contact.getName(),
          email: contact.personalInfo.email,
          phone: contact.personalInfo.phone,
          createdAt: contact.createdAt,
          updatedAt: contact.updatedAt,
        }
      };

      // Add ontology data if requested
      if (request.includeOntologyData) {
        const oCreamContact = contact;
        
        const knowledgeElements = oCreamContact.knowledgeElements
          .map((keId: string) => oCreamV2.getEntity(keId))
          .filter(Boolean);
        const activities = oCreamContact.activities
          .map((actId: string) => oCreamV2.getEntity(actId))
          .filter(Boolean);
        const relationships: any[] = [];

        response.contact!.ontologyData = {
          knowledgeElements: knowledgeElements.map((ke: any) => ({
            id: ke.id,
            type: ke.type,
            title: ke.title,
            reliability: ke.reliability,
            createdAt: ke.createdAt
          })),
          activities: activities.map((act: any) => ({
            id: act.id,
            type: act.type,
            name: act.name,
            timestamp: act.startTime || act.createdAt,
            status: act.status
          })),
          relationships: [],
          ontologyHealth: {
            validationStatus: oCreamContact.ontologyMetadata.validationStatus,
            completenessScore: this.calculateCompletenessScore(oCreamContact),
            consistencyScore: 0
          }
        };
      }

      return response;

    } catch (error) {
      return {
        success: false,
        message: `Failed to retrieve contact: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private calculateCompletenessScore(contact: OCreamContactEntity): number {
    let score = 0;
    const maxScore = 100;

    // Basic info completeness (40 points)
    if (contact.personalInfo.firstName) score += 10;
    if (contact.personalInfo.lastName) score += 10;
    if (contact.personalInfo.email) score += 15;
    if (contact.personalInfo.phone) score += 5;

    // Knowledge elements (30 points)
    const knowledgeElements = contact.knowledgeElements
        .map((keId: string) => oCreamV2.getEntity(keId))
        .filter(Boolean);
    if (knowledgeElements.length > 0) score += 15;
    if (knowledgeElements.length > 2) score += 10;
    if (knowledgeElements.some((ke: any) => ke.type === KnowledgeType.CUSTOMER_PREFERENCES)) score += 5;

    // Activities (10 points)
    if (contact.activities.length > 0) score += 5;
    if (contact.activities.length > 5) score += 5;

    return Math.min(score, maxScore);
  }

  private calculateConsistencyScore(contact: OCreamContactEntity): number {
    return 100;
  }
} 