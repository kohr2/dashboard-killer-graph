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
} from '../dto/contact.dto';
import { ContactRepository } from '../../domain/repositories/contact-repository';
import {
  OCreamContactEntity,
  ContactOntology,
} from '../../domain/entities/contact-ontology';
import {
  OCreamV2Ontology,
  CRMActivity,
  ActivityType,
  InformationElement,
  KnowledgeType,
  DOLCECategory,
} from '../../domain/ontology/o-cream-v2';
import { v4 as uuidv4 } from 'uuid';

export class ContactService {
  private ontology: OCreamV2Ontology;

  constructor(private readonly contactRepository: ContactRepository) {
    this.ontology = OCreamV2Ontology.getInstance();
  }

  async createContact(dto: CreateContactDto): Promise<ContactResponseDto> {
    const newContact = ContactOntology.createOCreamContact(dto);
    this.ontology.addEntity(newContact);
    await this.contactRepository.save(newContact as any);
    const response = this.mapToResponseDto(newContact);
    if (!response) {
      throw new Error('Failed to create contact response DTO.');
    }
    return response;
  }

  async getContactById(id: string): Promise<ContactResponseDto | null> {
    const contact = await this.contactRepository.findById(id);
    return contact ? this.mapToResponseDto(contact as any) : null;
  }

  async updateContact(
    contactId: string,
    updates: UpdateContactDto,
  ): Promise<ContactResponseDto> {
    const oCreamContact = this.ontology.getEntity(
      contactId,
    ) as OCreamContactEntity;

    if (!oCreamContact) {
      throw new Error(`Contact with ID ${contactId} not found.`);
    }

    // Ensure personalInfo exists before patching
    if (!oCreamContact.personalInfo) {
      oCreamContact.personalInfo = {
        firstName: '',
        lastName: '',
        email: '',
      };
    }
    Object.assign(oCreamContact.personalInfo, updates);

    oCreamContact.markAsModified();

    await this.contactRepository.save(oCreamContact as any);

    const response = this.mapToResponseDto(oCreamContact);
    if (!response) {
      throw new Error('Failed to create contact response DTO after update.');
    }
    return response;
  }

  async deleteContact(id: string): Promise<void> {
    const oCreamContact = this.ontology.getEntity(id) as OCreamContactEntity;
    if (oCreamContact) {
      const activity: CRMActivity = {
        id: uuidv4(),
        category: DOLCECategory.PERDURANT,
        type: ActivityType.MAINTENANCE,
        name: 'Contact Deleted',
        description: `Contact ${oCreamContact.getName()} was deleted.`,
        participants: [],
        startTime: new Date(),
        status: 'completed',
        success: true,
        context: {
          deletedById: 'system', // Or user ID
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.ontology.addEntity(activity);
      oCreamContact.addActivity(activity.id);

      // We might want to save the contact one last time to record the deletion activity
      // await this.contactRepository.save(oCreamContact as any);
    }

    await this.contactRepository.delete(id);
    this.ontology.removeEntity(id);
  }

  async searchContacts(
    dto: SearchContactsDto,
  ): Promise<ContactResponseDto[]> {
    const contacts = await this.contactRepository.search(dto);
    return contacts
      .map(c => this.mapToResponseDto(c as OCreamContactEntity))
      .filter((c): c is ContactResponseDto => c !== null);
  }

  async addNoteToContact(
    contactId: string,
    dto: AddNoteDto,
  ): Promise<ContactResponseDto> {
    const oCreamContact = this.ontology.getEntity(
      contactId,
    ) as OCreamContactEntity;
    if (!oCreamContact) {
      throw new Error(`Contact with id ${contactId} not found`);
    }

    const note: InformationElement = {
      id: uuidv4(),
      category: DOLCECategory.ABSTRACT,
      type: KnowledgeType.INTERACTIONHISTORY,
      title: 'Note',
      content: dto.content,
      format: 'text',
      source: dto.source || 'manual',
      reliability: 0.95,
      confidentiality: 'internal',
      version: '1.0',
      relatedEntities: [contactId],
      metadata: {
        authorId: dto.authorId,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.ontology.addEntity(note);
    oCreamContact.addKnowledgeElement(note.id);
    await this.contactRepository.save(oCreamContact as any);

    const response = this.mapToResponseDto(oCreamContact);
    if (!response) {
      throw new Error('Failed to create contact response DTO after adding note.');
    }
    return response;
  }

  private mapToResponseDto(
    contact: OCreamContactEntity,
  ): ContactResponseDto | null {
    if (!contact) {
      return null;
    }

    const result = ContactOntology.OCreamContactEntitySchema.safeParse(contact);

    if (result.success) {
      const parsedContact = result.data;
      return {
        id: parsedContact.id,
        firstName: parsedContact.personalInfo.firstName,
        lastName: parsedContact.personalInfo.lastName,
        email: parsedContact.personalInfo.email,
        phone: parsedContact.personalInfo.phone,
        title: parsedContact.personalInfo.title,
        validationStatus: 'valid',
        knowledgeElements: parsedContact.knowledgeElements,
        activities: parsedContact.activities,
        ontologyMetadata: parsedContact.ontologyMetadata,
      };
    } else {
      console.error(
        `Validation failed for contact ${contact.id}:`,
        result.error,
      );
      return null;
    }
  }
} 