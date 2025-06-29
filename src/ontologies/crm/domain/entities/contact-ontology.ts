import { DOLCEEntity, InformationElement, Activity, DOLCECategory } from '../ontology/o-cream-v2';
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
    metadata: z.record(z.string(), z.any()).optional(),
    enrichedData: z.record(z.string(), z.any()).optional(),
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
    updatePreferences(prefs: Record<string, any>): void;
    updateStatus(status: unknown): void;
    markAsModified(): void;
    get label(): string;
}

export const ContactOntology = {
  OCreamContactEntitySchema,
  createOCreamContact(
    data: unknown,
  ): OCreamContactEntity {

    const validation = PersonalInfoSchema.partial().and(z.object({
      id: z.string().uuid().optional(),
      organizationId: z.string().optional(),
      preferences: z.record(z.string(), z.any()).optional(),
    })).safeParse(data);

    if (!validation.success) {
      throw new Error(`Invalid data for OCreamContactEntity: ${validation.error.message}`);
    }
    const validatedData = validation.data;

    const contactId = validatedData.id || uuidv4();
    const now = new Date();
    const contact: OCreamContactEntity = {
      id: contactId,
      category: DOLCECategory.PhysicalObject,
      name: `${validatedData.firstName || ''} ${validatedData.lastName || ''}`.trim(),
      description: `Contact entity for ${validatedData.email}`,
      createdAt: now,
      updatedAt: now,
      personalInfo: {
        firstName: validatedData.firstName || '',
        lastName: validatedData.lastName || '',
        email: validatedData.email || '',
        phone: validatedData.phone,
        title: validatedData.title,
        address: validatedData.address,
      },
      organizationId: validatedData.organizationId,
      activities: [],
      knowledgeElements: [],
      ontologyMetadata: {
        validationStatus: 'unchecked',
      },
      metadata: {},
      enrichedData: {},
      preferences: validatedData.preferences,
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
      updatePreferences(prefs: Record<string, any>) {
        this.preferences = { ...this.preferences, ...prefs };
      },
      updateStatus(status: unknown) {
        // Placeholder
      },
      markAsModified() {
        this.updatedAt = new Date();
      },
      get label() {
        return 'Contact';
      },
    };
    return contact;
  },
}; 