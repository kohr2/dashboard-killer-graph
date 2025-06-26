import { DOLCEEntity, InformationElement, CRMActivity, DOLCECategory } from '../ontology/o-cream-v2';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export const PersonalInfoSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    additionalEmails: z.array(z.string().email()).optional(),
    phone: z.string().optional(),
    title: z.string().optional(),
    address: z.any().optional(),
});

export const OCreamContactEntitySchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().optional(),
    personalInfo: PersonalInfoSchema,
    organizationId: z.string().optional(),
    activities: z.array(z.string()),
    knowledgeElements: z.array(z.string()),
    ontologyMetadata: z.object({
        validationStatus: z.enum(['valid', 'invalid', 'unchecked']),
    }),
    createdAt: z.date(),
    updatedAt: z.date(),
    category: z.nativeEnum(DOLCECategory),
    preferences: z.record(z.string(), z.any()).optional(),
});

export interface PersonalInfo extends z.infer<typeof PersonalInfoSchema> {}

export interface OCreamContactEntity extends DOLCEEntity, Omit<z.infer<typeof OCreamContactEntitySchema>, 'category'> {
    getId(): string;
    getName(): string;
    addActivity(activityId: string): void;
    addKnowledgeElement(elementId: string): void;
    updatePersonalInfo(info: Partial<PersonalInfo>): void;
    updatePreferences(prefs: any): void;
    updateStatus(status: any): void;
    markAsModified(): void;
}

export const ContactOntology = {
  OCreamContactEntitySchema,
  createOCreamContact(
    data: Partial<PersonalInfo> & {
      id?: string;
      organizationId?: string;
      preferences?: Record<string, any>;
    },
  ): OCreamContactEntity {
    const contactId = data.id || uuidv4();
    const now = new Date();
    const contact: OCreamContactEntity = {
      id: contactId,
      category: DOLCECategory.ENDURANT,
      name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      description: `Contact entity for ${data.email}`,
      createdAt: now,
      updatedAt: now,
      personalInfo: {
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phone: data.phone,
        title: data.title,
        address: data.address,
      },
      organizationId: data.organizationId,
      activities: [],
      knowledgeElements: [],
      ontologyMetadata: {
        validationStatus: 'unchecked',
      },
      preferences: data.preferences,
      getId() {
        return this.id;
      },
      getName() {
        return this.name;
      },
      addActivity(activityId: string) {
        this.activities.push(activityId);
      },
      addKnowledgeElement(elementId: string) {
        this.knowledgeElements.push(elementId);
      },
      updatePersonalInfo(info: Partial<PersonalInfo>) {
        this.personalInfo = { ...this.personalInfo, ...info };
      },
      updatePreferences(prefs: any) {
        this.preferences = { ...this.preferences, ...prefs };
      },
      updateStatus(status: any) {
        // Placeholder
      },
      markAsModified() {
        this.updatedAt = new Date();
      },
    };
    return contact;
  },
}; 