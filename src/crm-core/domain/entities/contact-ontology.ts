import { DOLCEEntity, InformationElement, CRMActivity } from '../ontology/o-cream-v2';

export interface PersonalInfo {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    title?: string;
    address?: any;
}

export interface OCreamContactEntity extends DOLCEEntity {
    personalInfo: PersonalInfo;
    organizationId?: string;
    activities: string[];
    knowledgeElements: string[];
    ontologyMetadata: {
        validationStatus: 'valid' | 'invalid' | 'unchecked';
    };
    getId(): string;
    getName(): string;
    addActivity(activityId: string): void;
    addKnowledgeElement(elementId: string): void;
    updatePersonalInfo(info: Partial<PersonalInfo>): void;
    updatePreferences(prefs: any): void;
    updateStatus(status: any): void;
}

export function createOCreamContact(data: Partial<PersonalInfo>): OCreamContactEntity {
    // Implementation placeholder
    return {} as OCreamContactEntity;
} 