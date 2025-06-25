/// <reference types="node" />

// Contact Service - Application Layer
// Business logic for contact operations with O-CREAM-v2 integration

import {
  CreateContactDto,
  UpdateContactDto,
  ContactResponseDto,
  ContactSearchResponseDto,
  AddNoteDto,
  SearchContactsDto,
} from '@/crm-core/application/dto/contact.dto';
import { IContactRepository } from '@/crm-core/domain/repositories/i-contact-repository';
import * as ContactOntology from '@/crm-core/domain/entities/contact-ontology';
import {
  oCreamV2,
  KnowledgeType,
  ActivityType,
  InformationElement,
  CRMActivity,
} from '@/crm-core/domain/ontology/o-cream-v2';
import { OCreamContactEntity } from '@/crm-core/domain/entities/contact-ontology';
import { v4 as uuidv4 } from 'uuid';

export class ContactService {
  constructor(private readonly contactRepository: IContactRepository) {
    oCreamV2.addRepository('Contact', contactRepository as any);
  }

  async createContact(dto: CreateContactDto): Promise<ContactResponseDto> {
    const newContact = ContactOntology.createOCreamContact(dto);
    oCreamV2.addEntity(newContact);
    await this.contactRepository.save(newContact as any);
    return this.mapToResponseDto(newContact);
  }

  async getContactById(id: string): Promise<ContactResponseDto | null> {
    const contact = (await this.contactRepository.findById(
      id,
    )) as ContactOntology.OCreamContactEntity;
    return this.mapToResponseDto(contact);
  }

  async updateContact(
    contactId: string,
    updates: UpdateContactDto,
  ): Promise<ContactResponseDto> {
    const oCreamContact = oCreamV2.getEntity(
      contactId,
    ) as OCreamContactEntity;
    if (!oCreamContact) {
      throw new Error(`Contact with id ${contactId} not found`);
    }
    oCreamContact.updatePersonalInfo(updates);
    await this.contactRepository.save(oCreamContact as any);
    return this.mapToResponseDto(oCreamContact);
  }

  async deleteContact(id: string): Promise<void> {
    const oCreamContact = oCreamV2.getEntity(id) as OCreamContactEntity;
    if (oCreamContact) {
      const activity: CRMActivity = {
        id: `activity-${uuidv4()}`,
        ontology_type: ActivityType.OTHER,
        label: 'Contact Deleted',
        timestamp: new Date(),
        metadata: {
          reason: 'Deleted via API',
        },
      };
      oCreamV2.addActivity(activity);
      oCreamContact.addActivity(activity.id);

      await this.contactRepository.save(oCreamContact as any);
    }

    await this.contactRepository.delete(id);
    oCreamV2.removeEntity(id);
  }

  async searchContacts(
    query: SearchContactsDto,
  ): Promise<ContactSearchResponseDto> {
    const results = await this.contactRepository.search(query);
    return {
      contacts: results.map(c => this.mapToResponseDto(c as OCreamContactEntity)),
    };
  }

  async addNoteToContact(
    contactId: string,
    dto: AddNoteDto,
  ): Promise<ContactResponseDto> {
    const oCreamContact = oCreamV2.getEntity(
      contactId,
    ) as OCreamContactEntity;
    if (!oCreamContact) {
      throw new Error(`Contact with id ${contactId} not found`);
    }

    const note: InformationElement = {
      id: `note-${new Date().getTime()}`,
      ontology_type: KnowledgeType.NOTE,
      content: dto.content,
      created: new Date(),
      metadata: {
        author: dto.author,
      },
    };
    oCreamV2.addEntity(note);
    oCreamContact.addKnowledgeElement(note.id);
    await this.contactRepository.save(oCreamContact as any);
    return this.mapToResponseDto(oCreamContact);
  }

  private mapToResponseDto(
    contact: ContactOntology.OCreamContactEntity,
  ): ContactResponseDto {
    if (!contact) {
      return null;
    }

    const result = ContactOntology.OCreamContactEntitySchema.safeParse(contact);

    if (result.success) {
      return {
        id: contact.id,
        ...contact.personalInfo,
        preferences: contact.preferences,
        status: contact.status,
        validationStatus: 'valid',
        knowledgeElements: contact.knowledgeElements || [],
        activities: contact.activities || [],
        ontologyMetadata: contact.ontologyMetadata,
      };
    }

    // Handle validation errors
    console.error(`Validation error for contact ${contact.id}:`, result.error.errors);
    return {
      id: contact.id,
      ...contact.personalInfo,
      preferences: contact.preferences,
      status: contact.status,
      validationStatus: 'invalid',
      errors: result.error.errors,
      knowledgeElements: contact.knowledgeElements || [],
      activities: contact.activities || [],
      ontologyMetadata: contact.ontologyMetadata,
    };
  }
} 