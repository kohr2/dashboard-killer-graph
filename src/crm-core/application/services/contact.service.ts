/// <reference types="node" />

// Contact Service - Application Layer
// Business logic for contact operations with O-CREAM-v2 integration

import { ContactRepository } from '../../domain/repositories/contact-repository';
import { OCreamContactEntity, createOCreamContact } from '../../domain/entities/contact-ontology';
import { oCreamV2, DOLCECategory, KnowledgeType, ActivityType, RelationshipType, OCreamRelationship, InformationElement, CRMActivity } from '../../domain/ontology/o-cream-v2';
import {
  CreateContactDto,
  UpdateContactDto,
  ContactResponseDto,
  ContactSearchDto,
  ContactListResponseDto,
  AddContactRelationshipDto,
  AddContactActivityDto,
  ContactOntologyInsightsDto
} from '../dto/contact.dto';
import { Contact } from '../../domain/entities/contact'; // Assuming this might still be needed for repo layer

export class ContactService {
  constructor(
    private contactRepository: ContactRepository
  ) {}

  async createContact(dto: CreateContactDto): Promise<ContactResponseDto> {
    const oCreamContact = createOCreamContact({
      firstName: dto.firstName,
      lastName:dto.lastName,
      email: dto.email,
      phone: dto.phone,
      organizationId: dto.organizationId,
      title: dto.title,
      address: dto.address,
      preferences: dto.preferences || {}
    });

    // Add tags as knowledge elements
    if (dto.tags && dto.tags.length > 0) {
      const tagsKnowledge: InformationElement = {
        id: this.generateId(),
        type: KnowledgeType.CUSTOMER_PROFILE,
        category: DOLCECategory.ABSTRACT,
        title: `${oCreamContact.personalInfo.firstName} ${oCreamContact.personalInfo.lastName} - Tags`,
        content: { tags: dto.tags },
        format: 'json',
        source: 'application',
        reliability: 0.9,
        confidentiality: 'internal',
        version: '1.0',
        relatedEntities: [oCreamContact.id],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      oCreamV2.addEntity(tagsKnowledge);
      oCreamContact.addKnowledgeElement(tagsKnowledge.id);
    }
    
    // Create initial activity
    const creationActivity: CRMActivity = {
      id: this.generateId(),
      type: ActivityType.IDENTIFY,
      category: DOLCECategory.PERDURANT,
      name: 'Contact Created',
      description: `Contact ${oCreamContact.personalInfo.firstName} ${oCreamContact.personalInfo.lastName} was created in the system`,
      participants: [oCreamContact.id],
      status: 'completed',
      success: true,
      context: { source: 'application', action: 'create' },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    oCreamV2.addEntity(creationActivity);
    oCreamContact.addActivity(creationActivity.id);

    oCreamV2.addEntity(oCreamContact);

    // This part needs reconciliation between O-CREAM and a persistent Contact model if needed.
    // For now, let's assume O-CREAM is the source of truth and repository handles it.
    await this.contactRepository.save(oCreamContact as any); // Casting to `any` to bypass strict type checks for now.

    return this.mapToResponseDto(oCreamContact);
  }

  async updateContact(id: string, dto: UpdateContactDto): Promise<ContactResponseDto> {
    let oCreamContact = oCreamV2.getEntity(id) as OCreamContactEntity;
    if (!oCreamContact) {
      throw new Error(`Contact with id ${id} not found`);
    }

    // Update O-CREAM contact
    oCreamContact.updatePersonalInfo({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      title: dto.title,
      address: dto.address
    });

    if (dto.preferences) {
      oCreamContact.updatePreferences(dto.preferences);
    }
    if (dto.status) {
      oCreamContact.updateStatus(dto.status);
    }
    if(dto.organizationId) {
        oCreamContact.organizationId = dto.organizationId;
    }

    // Update tags
    if (dto.tags) {
      const tagsKnowledge: InformationElement = {
        id: this.generateId(),
        type: KnowledgeType.CUSTOMER_PROFILE,
        category: DOLCECategory.ABSTRACT,
        title: `${oCreamContact.personalInfo.firstName} ${oCreamContact.personalInfo.lastName} - Tags`,
        content: { tags: dto.tags },
        format: 'json',
        source: 'application',
        reliability: 0.9,
        confidentiality: 'internal',
        version: '1.0',
        relatedEntities: [oCreamContact.id],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      oCreamV2.addEntity(tagsKnowledge);
      oCreamContact.addKnowledgeElement(tagsKnowledge.id);
    }

    // Create update activity
    const updateActivity: CRMActivity = {
      id: this.generateId(),
      type: ActivityType.DEVELOP,
      category: DOLCECategory.PERDURANT,
      name: 'Contact Updated',
      description: `Contact ${oCreamContact.personalInfo.firstName} ${oCreamContact.personalInfo.lastName} was updated`,
      participants: [oCreamContact.id],
      status: 'completed',
      success: true,
      context: { source: 'application', action: 'update', changes: Object.keys(dto) },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    oCreamV2.addEntity(updateActivity);
    oCreamContact.addActivity(updateActivity.id);

    await this.contactRepository.save(oCreamContact as any); // Casting to `any` to bypass strict type checks for now.
    return this.mapToResponseDto(oCreamContact);
  }

  async getContactById(id: string): Promise<ContactResponseDto | null> {
    const oCreamContact = oCreamV2.getEntity(id) as OCreamContactEntity;
    if (!oCreamContact) {
      // Fallback to repository if not in memory
      const contactFromRepo = await this.contactRepository.findById(id);
      if(!contactFromRepo) return null;
      return this.mapToResponseDto(this.createOCreamFromContact(contactFromRepo));
    }

    return this.mapToResponseDto(oCreamContact);
  }

  async searchContacts(dto: ContactSearchDto): Promise<ContactListResponseDto> {
    // This search needs to be implemented against the ontology or a synced repository
    // For now, this is a simplified placeholder implementation.
    const allContacts = oCreamV2.getEntitiesByType(DOLCECategory.AGENTIVE_PHYSICAL_OBJECT)
      .filter(e => (e as any).personalInfo) as OCreamContactEntity[];

    // Filtering logic here based on dto ...

    const responseDtos = allContacts.map(c => this.mapToResponseDto(c));
    
    return {
      contacts: responseDtos,
      pagination: {
        page: dto.page || 1,
        limit: dto.limit || 20,
        total: responseDtos.length,
        totalPages: Math.ceil(responseDtos.length / (dto.limit || 20)),
      }
    };
  }

  async deleteContact(id: string): Promise<void> {
    const oCreamContact = oCreamV2.getEntity(id) as OCreamContactEntity;
    if (!oCreamContact) {
      throw new Error(`Contact with id ${id} not found`);
    }
    
    const deletionActivity: CRMActivity = {
      id: this.generateId(),
      type: ActivityType.DATA_COLLECTION, // No 'delete' type, using a generic one
      category: DOLCECategory.PERDURANT,
      name: 'Contact Deleted',
      description: `Contact ${oCreamContact.personalInfo.firstName} ${oCreamContact.personalInfo.lastName} was marked for deletion`,
      participants: [id],
      status: 'completed',
      success: true,
      context: { source: 'application', action: 'delete' },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    oCreamV2.addEntity(deletionActivity);
    oCreamContact.addActivity(deletionActivity.id);
    oCreamV2.removeEntity(id); // Assumes oCreamV2 has removeEntity
    await this.contactRepository.delete(id);
  }

  async addRelationship(dto: AddContactRelationshipDto): Promise<void> {
    const { contactId, relationshipId, relationshipType, metadata } = dto;
    
    const sourceContact = oCreamV2.getEntity(contactId);
    const targetContact = oCreamV2.getEntity(relationshipId);

    if (!sourceContact || !targetContact) {
      throw new Error('Source or target contact not found');
    }

    const relationship: OCreamRelationship = {
      id: this.generateId(),
      relationshipType: relationshipType,
      sourceEntityId: contactId,
      targetEntityId: relationshipId,
      context: metadata?.context,
      strength: metadata?.strength,
      temporal: { startTime: new Date() },
      properties: metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    oCreamV2.addRelationship(relationship);

    const activity: CRMActivity = {
      id: this.generateId(),
      type: ActivityType.DEVELOP,
      category: DOLCECategory.PERDURANT,
      name: 'Relationship Added',
      description: `Relationship of type ${relationshipType} added between ${contactId} and ${relationshipId}`,
      participants: [contactId, relationshipId],
      status: 'completed',
      success: true,
      context: { relationshipId: relationship.id },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    oCreamV2.addEntity(activity);
    (oCreamV2.getEntity(contactId) as OCreamContactEntity).addActivity(activity.id);
    (oCreamV2.getEntity(relationshipId) as OCreamContactEntity).addActivity(activity.id);
  }

  async getOntologyInsights(contactId: string): Promise<ContactOntologyInsightsDto> {
    const oCreamContact = oCreamV2.getEntity(contactId) as OCreamContactEntity;
    if (!oCreamContact) {
      throw new Error(`Contact with id ${contactId} not found`);
    }

    const relationships = oCreamV2.getRelationshipsForEntity(contactId);
    const activities = (oCreamContact.activities || []).map(id => oCreamV2.getEntity(id)).filter(Boolean) as CRMActivity[];
    const knowledgeElements = (oCreamContact.knowledgeElements || []).map(id => oCreamV2.getEntity(id)).filter(Boolean) as InformationElement[];

    const completenessScore = this.calculateCompletenessScore(oCreamContact);
    const consistencyScore = this.calculateConsistencyScore(oCreamContact);
    const recommendations = this.generateRecommendations(oCreamContact, completenessScore, consistencyScore);

    return {
      contactId: oCreamContact.id,
      knowledgeElementsSummary: {
        total: knowledgeElements.length,
        byType: this.groupAndCount(knowledgeElements, 'type'),
        recentlyUpdated: knowledgeElements.slice(0, 5).map(ke => ({ id: ke.id, type: ke.type, title: ke.title, updatedAt: ke.updatedAt })),
      },
      relationshipInsights: {
        total: relationships.length,
        byType: this.groupAndCount(relationships, 'relationshipType'),
        strongestRelationships: relationships.sort((a,b) => (b.strength || 0) - (a.strength || 0)).slice(0, 5).map(r => ({ id: r.id, type: r.relationshipType, strength: r.strength || 0 })),
      },
      activityInsights: {
        total: activities.length,
        byType: this.groupAndCount(activities, 'type'),
        recentActivities: activities.slice(0, 10).map(a => ({ id: a.id, type: a.type, timestamp: a.createdAt })),
      },
      ontologyHealth: {
        validationStatus: oCreamContact.ontologyMetadata.validationStatus,
        completenessScore,
        consistencyScore,
        recommendations,
      },
    } as any; // Bypassing DTO type check for now due to complexity
  }
  
  private createOCreamFromContact(contact: Contact): OCreamContactEntity {
    // This is a bridge from a legacy/repository entity to the O-CREAM entity
    const [firstName, ...lastNameParts] = (contact.getName() || '').split(' ');
    const lastName = lastNameParts.join(' ');
    
    const oCreamContact = createOCreamContact({
      firstName,
      lastName,
      email: contact.getEmail(),
      phone: contact.getPhone(),
      organizationId: contact.organizationId,
    });

    (oCreamContact as any).id = contact.getId();
    oCreamV2.addEntity(oCreamContact);
    return oCreamContact;
  }

  private mapToResponseDto(oCreamContact: OCreamContactEntity): ContactResponseDto {
    const { id, personalInfo, organizationId, status, preferences, ontologyMetadata, communicationHistory } = oCreamContact;
    return {
      id,
      personalInfo,
      organizationId,
      preferences,
      tags: this.extractTagsFromKnowledge((oCreamContact.knowledgeElements || []).map(id => oCreamV2.getEntity(id)).filter(Boolean) as InformationElement[]),
      status,
      createdAt: oCreamContact.createdAt,
      updatedAt: oCreamContact.updatedAt,
      ontology: {
        category: oCreamContact.category,
        knowledgeElements: (oCreamContact.knowledgeElements || []).map(id => oCreamV2.getEntity(id)).filter(Boolean).map((ke: any) => ({
          id: ke.id,
          type: ke.type,
          title: ke.title,
          content: ke.content,
          reliability: ke.reliability,
          confidentiality: ke.confidentiality,
          createdAt: ke.createdAt,
        })),
        relationships: oCreamContact.relationships,
        activities: oCreamContact.activities,
        communicationHistory: oCreamContact.communicationHistory || [],
        validationStatus: ontologyMetadata.validationStatus,
        validationErrors: ontologyMetadata.validationErrors || [],
      },
    };
  }

  private extractTagsFromKnowledge(knowledgeElements: InformationElement[]): string[] {
    const tags: string[] = [];
    for (const ke of knowledgeElements) {
      if (ke.type === KnowledgeType.CUSTOMER_PROFILE && ke.content.tags) {
        tags.push(...ke.content.tags);
      }
    }
    return tags;
  }

  private generateOntologyStats(contacts: OCreamContactEntity[]) {
    // ... (implementation can be added here if needed)
  }

  private calculateCompletenessScore(contact: OCreamContactEntity): number {
    const fields = [
      contact.personalInfo.firstName,
      contact.personalInfo.lastName,
      contact.personalInfo.email,
      contact.personalInfo.phone,
      contact.organizationId,
      contact.personalInfo.title,
    ];
    const filledFields = fields.filter(f => f).length;
    return (filledFields / fields.length) * 100;
  }

  private calculateConsistencyScore(contact: OCreamContactEntity): number {
     // Check for email validity as a simple consistency check
     const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
     if (contact.personalInfo.email && !emailRegex.test(contact.personalInfo.email)) {
       return 50; // Low score for invalid email
     }
     return 100; // High score if consistent
  }

  private generateRecommendations(contact: OCreamContactEntity, completenessScore: number, consistencyScore: number): string[] {
    const recommendations: string[] = [];
    if (completenessScore < 80) {
      recommendations.push('Complete contact profile (e.g., add phone, organization, title).');
    }
    if (consistencyScore < 90) {
      recommendations.push('Review contact information for consistency (e.g., check email format).');
    }
    if (oCreamV2.getRelationshipsForEntity(contact.id).length === 0) {
      recommendations.push('Add relationships to other contacts or organizations.');
    }
    return recommendations;
  }

  private groupAndCount(items: any[], property: string): any {
    return items.reduce((acc, item) => {
      const key = item[property];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  private generateId(): string {
    return `urn:ocream:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  }
} 