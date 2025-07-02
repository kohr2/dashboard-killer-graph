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
import type { ContactRepository } from '../../domain/repositories/contact-repository';
import {
  OCreamContactEntity,
  ContactOntology,
} from '../../domain/entities/contact-ontology';
import {
  OCreamV2Ontology,
  OCreamRelationship,
  Person,
  Organization,
  InformationElement,
  Activity,
  createInformationElement,
  createActivity,
  isPerson,
  DOLCECategory,
  ActivityType,
  KnowledgeType,
} from '../../domain/ontology/o-cream-v2';
import { v4 as uuidv4 } from 'uuid';
import { AccessControlService } from '@platform/security/application/services/access-control.service';
import { User } from '@platform/security/domain/user';
import { injectable, inject } from 'tsyringe';

@injectable()
export class ContactService {
  constructor(
    @inject('ContactRepository') private contactRepository: ContactRepository,
    private accessControlService: AccessControlService,
  ) {}

  async getContactById(user: User, id: string): Promise<ContactResponseDto | null> {
    if (!this.accessControlService.can(user, 'read', 'Contact')) {
      throw new Error('Access denied');
    }
    const contact = await this.contactRepository.findById(id);
    if (!contact) {
      return null;
    }
    return this.toContactResponseDto(contact);
  }

  async createContact(user: User, contactDto: CreateContactDto): Promise<ContactResponseDto> {
    if (!this.accessControlService.can(user, 'create', 'Contact')) {
      throw new Error('Access denied');
    }
    const ocreamContact = ContactOntology.createOCreamContact(contactDto);
    
    // This is a temporary measure until the Ontology service is fully integrated
    const ontology = OCreamV2Ontology.getInstance();
    ontology.addEntity(ocreamContact);

    const savedContact = await this.contactRepository.save(ocreamContact);
    return this.toContactResponseDto(savedContact);
  }

  async updateContact(user: User, id: string, contactDto: UpdateContactDto): Promise<ContactResponseDto | null> {
    if (!this.accessControlService.can(user, 'update', 'Contact')) {
      throw new Error('Access denied');
    }
    const ontology = OCreamV2Ontology.getInstance();
    const existingContact = ontology.getEntity(id) as OCreamContactEntity;

    if (!existingContact) {
      throw new Error(`Contact with ID ${id} not found.`);
    }

    // Update properties
    Object.assign(existingContact, contactDto);
    if (isPerson(existingContact)) {
      Object.assign(existingContact.personalInfo, contactDto);
    }
    // existingContact.markAsModified();

    const updatedContact = await this.contactRepository.save(existingContact);
    return this.toContactResponseDto(updatedContact);
  }

  async deleteContact(user: User, id: string): Promise<void> {
    if (!this.accessControlService.can(user, 'delete', 'Contact')) {
      throw new Error('Access denied');
    }
    const ontology = OCreamV2Ontology.getInstance();
    const existingContact = ontology.getEntity(id);

    if (!existingContact) {
      throw new Error(`Contact with ID ${id} not found.`);
    }

    await this.contactRepository.delete(id);
    ontology.removeEntity(id);
  }

  async searchContacts(user: User, searchDto: SearchContactsDto): Promise<ContactResponseDto[]> {
    if (!this.accessControlService.can(user, 'read', 'Contact')) {
      throw new Error('Access denied');
    }
    // Implementation pending a more robust search than just by a single field
    const query = searchDto.name || searchDto.email || searchDto.company || '';
    const contacts = await this.contactRepository.search(query);
    return contacts.map(c => this.toContactResponseDto(c));
  }

  async addNoteToContact(user: User, contactId: string, noteDto: AddNoteDto): Promise<ContactResponseDto> {
    if (!this.accessControlService.can(user, 'update', 'Contact')) {
      throw new Error('Access denied');
    }
    
    const ontology = OCreamV2Ontology.getInstance();
    const contact = ontology.getEntity(contactId) as OCreamContactEntity;
    
    if (!contact) {
      throw new Error(`Contact with ID ${contactId} not found.`);
    }

    // Note: The erroneous code with DOLCECategory.PERDURANT was here.
    // It has been removed as it was invalid and part of a larger, commented-out block.
    // A proper implementation for adding notes/activities should be added here.
    
    const updatedContact = await this.contactRepository.save(contact);
    return this.toContactResponseDto(updatedContact);
  }

  private toContactResponseDto(contact: OCreamContactEntity): ContactResponseDto {
    const { id, personalInfo } = contact;

    const response: ContactResponseDto = {
      id,
      firstName: personalInfo.firstName,
      lastName: personalInfo.lastName,
      email: personalInfo.email,
      phone: personalInfo.phone,
      title: personalInfo.title,
      // Add default values for required fields
      validationStatus: 'valid',
      knowledgeElements: contact.knowledgeElements || [],
      activities: contact.activities || [],
      ontologyMetadata: contact.ontologyMetadata || {},
    };
    
    return response;
  }
} 