// O-CREAM-v2 Ontology Tests
import {
  DOLCECategory,
  DOLCEEntity,
  RelationshipType,
  KnowledgeType,
  ActivityType,
  SoftwareType,
  InformationElement,
  CRMActivity,
  SoftwareSystem,
  OCreamRelationship,
  OCreamV2Ontology,
  oCreamV2
} from '../../../../../src/crm-core/domain/ontology/o-cream-v2';

describe('O-CREAM-v2 Ontology', () => {
  describe('DOLCE Categories', () => {
    test('should define all DOLCE foundational categories', () => {
      expect(DOLCECategory.ENDURANT).toBe('Endurant');
      expect(DOLCECategory.PERDURANT).toBe('Perdurant');
      expect(DOLCECategory.QUALITY).toBe('Quality');
      expect(DOLCECategory.ABSTRACT).toBe('Abstract');
      expect(DOLCECategory.AGENTIVE_PHYSICAL_OBJECT).toBe('AgentivePhysicalObject');
      expect(DOLCECategory.NON_AGENTIVE_PHYSICAL_OBJECT).toBe('NonAgentivePhysicalObject');
    });
  });

  describe('Relationship Module', () => {
    test('should define comprehensive relationship types', () => {
      // Business relationships
      expect(RelationshipType.CUSTOMER_RELATIONSHIP).toBe('CustomerRelationship');
      expect(RelationshipType.SUPPLIER_RELATIONSHIP).toBe('SupplierRelationship');
      expect(RelationshipType.PARTNER_RELATIONSHIP).toBe('PartnerRelationship');
      expect(RelationshipType.PROSPECT_RELATIONSHIP).toBe('ProspectRelationship');
      
      // Social relationships
      expect(RelationshipType.EMPLOYMENT).toBe('Employment');
      expect(RelationshipType.COLLABORATION).toBe('Collaboration');
      expect(RelationshipType.MEMBERSHIP).toBe('Membership');
      
      // Temporal relationships
      expect(RelationshipType.BEFORE).toBe('Before');
      expect(RelationshipType.AFTER).toBe('After');
      expect(RelationshipType.DURING).toBe('During');
      expect(RelationshipType.OVERLAPS).toBe('Overlaps');
    });
  });

  describe('Knowledge Module', () => {
    test('should define comprehensive knowledge types', () => {
      // Customer knowledge
      expect(KnowledgeType.CUSTOMER_PROFILE).toBe('CustomerProfile');
      expect(KnowledgeType.CUSTOMER_PREFERENCES).toBe('CustomerPreferences');
      expect(KnowledgeType.CUSTOMER_BEHAVIOR).toBe('CustomerBehavior');
      expect(KnowledgeType.CUSTOMER_HISTORY).toBe('CustomerHistory');
      
      // Business knowledge
      expect(KnowledgeType.MARKET_INTELLIGENCE).toBe('MarketIntelligence');
      expect(KnowledgeType.COMPETITIVE_ANALYSIS).toBe('CompetitiveAnalysis');
      expect(KnowledgeType.PRODUCT_KNOWLEDGE).toBe('ProductKnowledge');
      expect(KnowledgeType.PROCESS_KNOWLEDGE).toBe('ProcessKnowledge');
      
      // Transactional knowledge
      expect(KnowledgeType.TRANSACTION_DATA).toBe('TransactionData');
      expect(KnowledgeType.INTERACTION_HISTORY).toBe('InteractionHistory');
      expect(KnowledgeType.COMMUNICATION_LOG).toBe('CommunicationLog');
    });

    test('should create information element with all properties', () => {
      const info: InformationElement = {
        id: 'info-1',
        category: DOLCECategory.ABSTRACT,
        type: KnowledgeType.CUSTOMER_PROFILE,
        title: 'Customer Profile: Acme Corp',
        content: { 
          name: 'Acme Corp', 
          industry: 'Technology',
          employees: 500,
          revenue: 10000000
        },
        format: 'json',
        source: 'CRM System',
        reliability: 0.95,
        confidentiality: 'internal',
        version: '2.1',
        relatedEntities: ['contact-1', 'org-1'],
        metadata: { 
          lastUpdated: '2024-01-15',
          verifiedBy: 'sales-team',
          tags: ['enterprise', 'technology']
        },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15')
      };

      expect(info.category).toBe(DOLCECategory.ABSTRACT);
      expect(info.type).toBe(KnowledgeType.CUSTOMER_PROFILE);
      expect(info.title).toBe('Customer Profile: Acme Corp');
      expect(info.content.name).toBe('Acme Corp');
      expect(info.reliability).toBe(0.95);
      expect(info.confidentiality).toBe('internal');
      expect(info.relatedEntities).toHaveLength(2);
      expect(info.metadata.tags).toContain('enterprise');
    });
  });

  describe('Activity Module', () => {
    test('should define comprehensive activity types', () => {
      // Customer relationship activities
      expect(ActivityType.IDENTIFY).toBe('Identify');
      expect(ActivityType.ATTRACT).toBe('Attract');
      expect(ActivityType.ACQUIRE).toBe('Acquire');
      expect(ActivityType.DEVELOP).toBe('Develop');
      expect(ActivityType.RETAIN).toBe('Retain');
      
      // Sales activities
      expect(ActivityType.LEAD_QUALIFICATION).toBe('LeadQualification');
      expect(ActivityType.OPPORTUNITY_MANAGEMENT).toBe('OpportunityManagement');
      expect(ActivityType.PROPOSAL_PREPARATION).toBe('ProposalPreparation');
      expect(ActivityType.NEGOTIATION).toBe('Negotiation');
      expect(ActivityType.CLOSING).toBe('Closing');
      
      // Marketing activities
      expect(ActivityType.CAMPAIGN_EXECUTION).toBe('CampaignExecution');
      expect(ActivityType.CONTENT_CREATION).toBe('ContentCreation');
      expect(ActivityType.MARKET_RESEARCH).toBe('MarketResearch');
      expect(ActivityType.BRAND_MANAGEMENT).toBe('BrandManagement');
      
      // Service activities
      expect(ActivityType.CUSTOMER_SUPPORT).toBe('CustomerSupport');
      expect(ActivityType.ISSUE_RESOLUTION).toBe('IssueResolution');
      expect(ActivityType.MAINTENANCE).toBe('Maintenance');
      expect(ActivityType.TRAINING).toBe('Training');
      
      // Information management activities
      expect(ActivityType.DATA_COLLECTION).toBe('DataCollection');
      expect(ActivityType.DATA_ANALYSIS).toBe('DataAnalysis');
      expect(ActivityType.REPORTING).toBe('Reporting');
      expect(ActivityType.DOCUMENT_MANAGEMENT).toBe('DocumentManagement');
    });

    test('should create comprehensive CRM activity', () => {
      const activity: CRMActivity = {
        id: 'activity-1',
        category: DOLCECategory.PERDURANT,
        type: ActivityType.OPPORTUNITY_MANAGEMENT,
        name: 'Manage Enterprise Opportunity - Acme Corp',
        description: 'Full opportunity management cycle for enterprise deal',
        participants: ['contact-1', 'sales-rep-1', 'sales-manager-1'],
        resources: ['crm-system', 'proposal-template', 'demo-environment'],
        inputs: ['lead-info', 'company-research', 'requirements-doc'],
        outputs: ['proposal', 'demo-recording', 'follow-up-plan'],
        startTime: new Date('2024-01-01T09:00:00Z'),
        endTime: new Date('2024-01-01T17:00:00Z'),
        duration: 480, // 8 hours in minutes
        status: 'completed',
        success: true,
        cost: 5000,
        outcome: 'Proposal accepted, moving to negotiation phase',
        performanceMetrics: {
          conversionRate: 0.85,
          timeToComplete: 8,
          customerSatisfaction: 4.5,
          revenueGenerated: 150000
        },
        location: 'Customer site - New York',
        channel: 'in-person',
        context: {
          priority: 'high',
          dealSize: 150000,
          competitorPresent: true,
          decisionMakers: ['CTO', 'CFO'],
          timeline: 'Q1 2024'
        },
        createdAt: new Date('2024-01-01T08:00:00Z'),
        updatedAt: new Date('2024-01-01T18:00:00Z')
      };

      expect(activity.category).toBe(DOLCECategory.PERDURANT);
      expect(activity.type).toBe(ActivityType.OPPORTUNITY_MANAGEMENT);
      expect(activity.participants).toHaveLength(3);
      expect(activity.resources).toContain('crm-system');
      expect(activity.inputs).toContain('lead-info');
      expect(activity.outputs).toContain('proposal');
      expect(activity.duration).toBe(480);
      expect(activity.success).toBe(true);
      expect(activity.performanceMetrics.conversionRate).toBe(0.85);
      expect(activity.context.dealSize).toBe(150000);
    });
  });

  describe('Software Module', () => {
    test('should define software types', () => {
      expect(SoftwareType.CRM_PLATFORM).toBe('CRMPlatform');
      expect(SoftwareType.SALES_AUTOMATION).toBe('SalesAutomation');
      expect(SoftwareType.MARKETING_AUTOMATION).toBe('MarketingAutomation');
      expect(SoftwareType.EMAIL_SYSTEM).toBe('EmailSystem');
      expect(SoftwareType.KNOWLEDGE_GRAPH).toBe('KnowledgeGraph');
      expect(SoftwareType.API).toBe('API');
    });

    test('should create software system entity', () => {
      const software: SoftwareSystem = {
        id: 'crm-platform-1',
        category: DOLCECategory.NON_AGENTIVE_PHYSICAL_OBJECT,
        type: SoftwareType.CRM_PLATFORM,
        name: 'Enterprise CRM Platform',
        version: '2.1.0',
        vendor: 'CRM Solutions Inc',
        capabilities: [
          'contact-management',
          'opportunity-tracking',
          'analytics',
          'reporting',
          'integration-api'
        ],
        status: 'active',
        deployment: 'cloud',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15')
      };

      expect(software.category).toBe(DOLCECategory.NON_AGENTIVE_PHYSICAL_OBJECT);
      expect(software.type).toBe(SoftwareType.CRM_PLATFORM);
      expect(software.capabilities).toContain('contact-management');
      expect(software.status).toBe('active');
      expect(software.deployment).toBe('cloud');
    });
  });

  describe('OCreamV2Ontology Manager', () => {
    let ontology: OCreamV2Ontology;

    beforeEach(() => {
      ontology = new OCreamV2Ontology();
    });

    test('should create empty ontology with indices', () => {
      expect(ontology).toBeDefined();
      expect(ontology.getEntitiesByType(DOLCECategory.ABSTRACT)).toHaveLength(0);
    });

    test('should add and retrieve entities', () => {
      const entity: DOLCEEntity = {
        id: 'test-1',
        category: DOLCECategory.ABSTRACT,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      ontology.addEntity(entity);
      const retrieved = ontology.getEntity('test-1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-1');
      expect(retrieved?.category).toBe(DOLCECategory.ABSTRACT);
    });

    test('should index entities by type', () => {
      const abstractEntity: DOLCEEntity = {
        id: 'abstract-1',
        category: DOLCECategory.ABSTRACT,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const perdurantEntity: DOLCEEntity = {
        id: 'perdurant-1',
        category: DOLCECategory.PERDURANT,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      ontology.addEntity(abstractEntity);
      ontology.addEntity(perdurantEntity);

      const abstractEntities = ontology.getEntitiesByType(DOLCECategory.ABSTRACT);
      const perdurantEntities = ontology.getEntitiesByType(DOLCECategory.PERDURANT);

      expect(abstractEntities).toHaveLength(1);
      expect(perdurantEntities).toHaveLength(1);
      expect(abstractEntities[0].id).toBe('abstract-1');
      expect(perdurantEntities[0].id).toBe('perdurant-1');
    });

    test('should manage relationships', () => {
      const relationship: OCreamRelationship = {
        id: 'rel-1',
        relationshipType: RelationshipType.CUSTOMER_RELATIONSHIP,
        sourceEntityId: 'contact-1',
        targetEntityId: 'org-1',
        sourceRole: 'customer',
        targetRole: 'vendor',
        temporal: {
          startTime: new Date('2024-01-01'),
          duration: 365 * 24 * 60 // 1 year in minutes
        },
        properties: {
          contractValue: 100000,
          serviceLevel: 'premium'
        },
        context: 'Annual service contract',
        strength: 0.9,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      ontology.addRelationship(relationship);
      const relationships = ontology.getRelationshipsForEntity('contact-1');

      expect(relationships).toHaveLength(1);
      expect(relationships[0].id).toBe('rel-1');
      expect(relationships[0].relationshipType).toBe(RelationshipType.CUSTOMER_RELATIONSHIP);
      expect(relationships[0].strength).toBe(0.9);
    });

    test('should find related entities', () => {
      // Add entities
      const contact: DOLCEEntity = {
        id: 'contact-1',
        category: DOLCECategory.AGENTIVE_PHYSICAL_OBJECT,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const organization: DOLCEEntity = {
        id: 'org-1',
        category: DOLCECategory.AGENTIVE_PHYSICAL_OBJECT,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      ontology.addEntity(contact);
      ontology.addEntity(organization);

      // Add relationship
      const relationship: OCreamRelationship = {
        id: 'rel-1',
        relationshipType: RelationshipType.EMPLOYMENT,
        sourceEntityId: 'contact-1',
        targetEntityId: 'org-1',
        temporal: {},
        properties: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      ontology.addRelationship(relationship);

      // Find related entities
      const related = ontology.findRelatedEntities('contact-1');
      const employmentRelated = ontology.findRelatedEntities('contact-1', RelationshipType.EMPLOYMENT);

      expect(related).toHaveLength(1);
      expect(related[0].id).toBe('org-1');
      expect(employmentRelated).toHaveLength(1);
      expect(employmentRelated[0].id).toBe('org-1');
    });

    test('should validate different entity categories', () => {
      const validEndurant: DOLCEEntity = {
        id: 'endurant-1',
        category: DOLCECategory.ENDURANT,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      };

      const validPerdurant: CRMActivity = {
        id: 'perdurant-1',
        category: DOLCECategory.PERDURANT,
        type: ActivityType.CUSTOMER_SUPPORT,
        name: 'Support Call',
        participants: [],
        status: 'completed',
        success: true,
        context: {},
        startTime: new Date('2024-01-01T09:00:00Z'),
        endTime: new Date('2024-01-01T10:00:00Z'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      const invalidPerdurant: CRMActivity = {
        id: 'invalid-perdurant-1',
        category: DOLCECategory.PERDURANT,
        type: ActivityType.CUSTOMER_SUPPORT,
        name: 'Invalid Support Call',
        participants: [],
        status: 'completed',
        success: true,
        context: {},
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T09:00:00Z'), // End before start
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      expect(ontology.validateEntity(validEndurant)).toBe(true);
      expect(ontology.validateEntity(validPerdurant)).toBe(true);
      expect(ontology.validateEntity(invalidPerdurant)).toBe(false);
    });

    test('should export ontology structure', () => {
      // Add some test data
      const entity: DOLCEEntity = {
        id: 'test-entity',
        category: DOLCECategory.ABSTRACT,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const relationship: OCreamRelationship = {
        id: 'test-rel',
        relationshipType: RelationshipType.COLLABORATION,
        sourceEntityId: 'entity-1',
        targetEntityId: 'entity-2',
        temporal: {},
        properties: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      ontology.addEntity(entity);
      ontology.addRelationship(relationship);

      const exported = ontology.exportOntology();

      expect(exported.metadata.name).toBe('O-CREAM-v2');
      expect(exported.metadata.version).toBe('2.0');
      expect(exported.metadata.foundation).toBe('DOLCE');
      expect(exported.metadata.modules).toContain('Relationships');
      expect(exported.metadata.modules).toContain('Knowledge');
      expect(exported.metadata.modules).toContain('Activities');
      expect(exported.metadata.modules).toContain('Software');
      expect(exported.metadata.entityCount).toBe(1);
      expect(exported.metadata.relationshipCount).toBe(1);
      expect(exported.entities).toHaveLength(1);
      expect(exported.relationships).toHaveLength(1);
      expect(exported.typeDistribution[DOLCECategory.ABSTRACT]).toBe(1);
    });
  });

  describe('Global Ontology Instance', () => {
    test('should provide global ontology instance', () => {
      expect(oCreamV2).toBeDefined();
      expect(oCreamV2).toBeInstanceOf(OCreamV2Ontology);
    });
  });
});
