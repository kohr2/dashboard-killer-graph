// Contact DTOs - Application Layer
// Data Transfer Objects for Contact operations with O-CREAM-v2 support

import { DOLCECategory, KnowledgeType, ActivityType, RelationshipType } from '../../domain/ontology/o-cream-v2';

export interface CreateContactDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  organizationId?: string;
  title?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  preferences?: Record<string, any>;
  tags?: string[];
}

export interface UpdateContactDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  organizationId?: string;
  title?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  preferences?: Record<string, any>;
  tags?: string[];
  status?: 'active' | 'inactive' | 'blocked';
}

export interface ContactResponseDto {
  id: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    title?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    };
  };
  organizationId?: string;
  preferences: Record<string, any>;
  tags: string[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
  
  // O-CREAM-v2 Ontological Data
  ontology: {
    category: DOLCECategory;
    knowledgeElements: Array<{
      id: string;
      type: KnowledgeType;
      title: string;
      content: any;
      reliability: number;
      confidentiality: 'public' | 'internal' | 'confidential' | 'restricted';
      createdAt: Date;
    }>;
    relationships: string[];
    activities: string[];
    communicationHistory: string[];
    validationStatus: 'valid' | 'invalid' | 'pending';
    validationErrors: string[];
  };
}

export interface ContactSearchDto {
  query?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  organizationId?: string;
  status?: 'active' | 'inactive' | 'blocked';
  tags?: string[];
  
  // O-CREAM-v2 Ontological Search
  ontologyCategory?: DOLCECategory;
  knowledgeType?: KnowledgeType;
  relationshipType?: RelationshipType;
  activityType?: ActivityType;
  hasKnowledgeElements?: boolean;
  validationStatus?: 'valid' | 'invalid' | 'pending';
  
  // Pagination
  page?: number;
  limit?: number;
  sortBy?: 'firstName' | 'lastName' | 'email' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ContactListResponseDto {
  contacts: ContactResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  ontologyStats?: {
    totalWithKnowledgeElements: number;
    knowledgeTypeDistribution: Record<KnowledgeType, number>;
    relationshipTypeDistribution: Record<RelationshipType, number>;
    validationStatusDistribution: Record<string, number>;
  };
}

export interface AddContactRelationshipDto {
  contactId: string;
  relationshipId: string;
  relationshipType: RelationshipType;
  metadata?: Record<string, any>;
}

export interface AddContactActivityDto {
  contactId: string;
  activityId: string;
  activityType: ActivityType;
  description?: string;
  metadata?: Record<string, any>;
}

export interface ContactOntologyInsightsDto {
  contactId: string;
  knowledgeElementsSummary: {
    total: number;
    byType: Record<KnowledgeType, number>;
    recentlyUpdated: Array<{
      id: string;
      type: KnowledgeType;
      title: string;
      updatedAt: Date;
    }>;
  };
  relationshipInsights: {
    total: number;
    byType: Record<RelationshipType, number>;
    strongestRelationships: Array<{
      id: string;
      type: RelationshipType;
      strength: number;
    }>;
  };
  activityInsights: {
    total: number;
    byType: Record<ActivityType, number>;
    recentActivities: Array<{
      id: string;
      type: ActivityType;
      timestamp: Date;
    }>;
  };
  ontologyHealth: {
    validationStatus: 'valid' | 'invalid' | 'pending';
    completenessScore: number; // 0-100
    consistencyScore: number; // 0-100
    recommendations: string[];
  };
} 