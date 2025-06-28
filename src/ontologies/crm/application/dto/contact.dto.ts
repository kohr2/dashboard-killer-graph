export interface CreateContactDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title?: string;
}

export interface UpdateContactDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
}

export interface ContactResponseDto {
  id: string;
  firstName: string;
  lastName:string;
  email: string;
  phone?: string;
  title?: string;
  preferences?: unknown;
  status?: unknown;
  validationStatus: 'valid' | 'invalid';
  errors?: unknown[];
  knowledgeElements: string[];
  activities: string[];
  ontologyMetadata: unknown;
}

export interface ContactSearchResponseDto {
  contacts: ContactResponseDto[];
}

export interface AddNoteDto {
  content: string;
  authorId: string;
  source?: string;
}

export interface SearchContactsDto {
    name?: string;
    email?: string;
    company?: string;
}

