// Get Contact Use Case - Application Layer
// Use case for retrieving a contact with ontological insights

import { ContactRepository } from '../../../repositories/contact-repository';
import { OCreamContactEntity } from '../../../domain/entities/contact-ontology';
import { oCreamV2, KnowledgeType, ActivityType, RelationshipType, InformationElement, Activity } from '../../../ontology/o-cream-v2';

// Temporary mapper function until import issues are resolved
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
  updatedAt: dto.updatedAt,
  knowledgeElements: dto.knowledgeElements ? dto.knowledgeElements.split(',').filter((s: string) => s.trim()) : [],
  activities: dto.activities ? dto.activities.split(',').filter((s: string) => s.trim()) : [],
  ontologyMetadata: { validationStatus: dto.validationStatus },
  getId: () => dto.id,
  getName: () => dto.name,
  addActivity: (id: string) => ({ id }),
  addKnowledgeElement: (id: string) => ({ id }),
  getActivities: () => dto.activities ? dto.activities.split(',').filter((s: string) => s.trim()) : [],
  getKnowledgeElements: () => dto.knowledgeElements ? dto.knowledgeElements.split(',').filter((s: string) => s.trim()) : [],
  getOntologyMetadata: () => ({ validationStatus: dto.validationStatus }),
});

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
      const contactDTO = await this.contactRepository.findById(request.id);
      if (!contactDTO) {
        return {
          success: false,
          message: 'Contact not found'
        };
      }

      // Convert DTO to legacy entity for processing
      const contact = mapDTOToContact(contactDTO);

      // Prepare basic response
      const response: GetContactResponse = {
        success: true,
        message: 'Contact retrieved successfully',
        contact: {
          id: contact.id,
          name: contact.getName(),
          email: contact.personalInfo.email,
          phone: contact.personalInfo.phone,
          createdAt: new Date(contact.createdAt),
          updatedAt: new Date(contact.updatedAt),
        }
      };

      // Add ontology data if requested
      if (request.includeOntologyData) {
        const oCreamContact = contact;
        
        const knowledgeElements = oCreamContact.getKnowledgeElements()
          .map((keId: string) => oCreamV2.getEntity(keId))
          .filter(Boolean) as InformationElement[];
        const activities = oCreamContact.getActivities()
          .map((actId: string) => oCreamV2.getEntity(actId))
          .filter(Boolean) as Activity[];
        const relationships: unknown[] = [];

        response.contact!.ontologyData = {
          knowledgeElements: knowledgeElements.map(ke => ({
            id: ke.id,
            type: ke.type,
            title: ke.title,
            reliability: ke.reliability,
            createdAt: ke.createdAt
          })),
          activities: activities.map(act => ({
            id: act.id,
            type: (act as any).type,
            name: act.name,
            timestamp: act.startTime || act.createdAt,
            status: act.status
          })),
          relationships: [],
          ontologyHealth: {
            validationStatus: oCreamContact.getOntologyMetadata().validationStatus,
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
        .filter(Boolean) as InformationElement[];
    if (knowledgeElements.length > 0) score += 15;
    if (knowledgeElements.length > 2) score += 10;
    if (knowledgeElements.some(ke => ke.type === KnowledgeType.CUSTOMERPREFERENCES)) score += 5;

    // Activities (10 points)
    if (contact.activities.length > 0) score += 5;
    if (contact.activities.length > 5) score += 5;

    return Math.min(score, maxScore);
  }

  private calculateConsistencyScore(contact: OCreamContactEntity): number {
    return 100;
  }
} 