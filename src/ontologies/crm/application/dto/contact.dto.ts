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
  preferences?: any;
  status?: any;
  validationStatus: 'valid' | 'invalid';
  errors?: any[];
  knowledgeElements: string[];
  activities: string[];
  ontologyMetadata: any;
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

