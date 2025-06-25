// O-CREAM-v2 Ontology Tests
import * as Ontology from '../../../../../src/crm-core/domain/ontology/o-cream-v2';

describe('O-CREAM-v2 Ontology', () => {
  describe('DOLCE Categories', () => {
    test('should define all DOLCE foundational categories', () => {
      expect(Ontology.DOLCECategory.ENDURANT).toBe('Endurant');
      expect(Ontology.DOLCECategory.PERDURANT).toBe('Perdurant');
      expect(Ontology.DOLCECategory.QUALITY).toBe('Quality');
      expect(Ontology.DOLCECategory.ABSTRACT).toBe('Abstract');
      expect(Ontology.DOLCECategory.AGENTIVE_PHYSICAL_OBJECT).toBe('AgentivePhysicalObject');
      expect(Ontology.DOLCECategory.NON_AGENTIVE_PHYSICAL_OBJECT).toBe('NonAgentivePhysicalObject');
    });
  });

  describe('Relationship Module', () => {
    test('should define comprehensive relationship types', () => {
      // Business relationships
      expect(Ontology.RelationshipType.CUSTOMER_RELATIONSHIP).toBe('CustomerRelationship');
      expect(Ontology.RelationshipType.SUPPLIER_RELATIONSHIP).toBe('SupplierRelationship');
      expect(Ontology.RelationshipType.PARTNER_RELATIONSHIP).toBe('PartnerRelationship');
      expect(Ontology.RelationshipType.PROSPECT_RELATIONSHIP).toBe('ProspectRelationship');
      
      // Social relationships
      expect(Ontology.RelationshipType.EMPLOYMENT).toBe('Employment');
      expect(Ontology.RelationshipType.COLLABORATION).toBe('Collaboration');
      expect(Ontology.RelationshipType.MEMBERSHIP).toBe('Membership');
      
      // Temporal relationships
      expect(Ontology.RelationshipType.BEFORE).toBe('Before');
      expect(Ontology.RelationshipType.AFTER).toBe('After');
      expect(Ontology.RelationshipType.DURING).toBe('During');
      expect(Ontology.RelationshipType.OVERLAPS).toBe('Overlaps');
    });
  });

  describe('Knowledge Module', () => {
    test('should define comprehensive knowledge types', () => {
      // Customer knowledge
      expect(Ontology.KnowledgeType.CUSTOMER_PROFILE).toBe('CustomerProfile');
      expect(Ontology.KnowledgeType.CUSTOMER_PREFERENCES).toBe('CustomerPreferences');
      expect(Ontology.KnowledgeType.CUSTOMER_BEHAVIOR).toBe('CustomerBehavior');
      expect(Ontology.KnowledgeType.CUSTOMER_HISTORY).toBe('CustomerHistory');
      
      // Business knowledge
      expect(Ontology.KnowledgeType.MARKET_INTELLIGENCE).toBe('MarketIntelligence');
      expect(Ontology.KnowledgeType.COMPETITIVE_ANALYSIS).toBe('CompetitiveAnalysis');
      expect(Ontology.KnowledgeType.PRODUCT_KNOWLEDGE).toBe('ProductKnowledge');
      expect(Ontology.KnowledgeType.PROCESS_KNOWLEDGE).toBe('ProcessKnowledge');
      
      // Transactional knowledge
      expect(Ontology.KnowledgeType.TRANSACTION_DATA).toBe('TransactionData');
      expect(Ontology.KnowledgeType.INTERACTION_HISTORY).toBe('InteractionHistory');
      expect(Ontology.KnowledgeType.COMMUNICATION_LOG).toBe('CommunicationLog');
    });

    test('should create information element with all properties', () => {
      const info: Ontology.InformationElement = {
        id: 'info-1',
        category: Ontology.DOLCECategory.ABSTRACT,
        type: Ontology.KnowledgeType.CUSTOMER_PROFILE,
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

      expect(info.category).toBe(Ontology.DOLCECategory.ABSTRACT);
      expect(info.type).toBe(Ontology.KnowledgeType.CUSTOMER_PROFILE);
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
      expect(Ontology.ActivityType.IDENTIFY).toBe('Identify');
      expect(Ontology.ActivityType.ATTRACT).toBe('Attract');
      expect(Ontology.ActivityType.ACQUIRE).toBe('Acquire');
      expect(Ontology.ActivityType.DEVELOP).toBe('Develop');
      expect(Ontology.ActivityType.RETAIN).toBe('Retain');
      
      // Sales activities
      expect(Ontology.ActivityType.LEAD_QUALIFICATION).toBe('LeadQualification');
      expect(Ontology.ActivityType.OPPORTUNITY_MANAGEMENT).toBe('OpportunityManagement');
      expect(Ontology.ActivityType.PROPOSAL_PREPARATION).toBe('ProposalPreparation');
      expect(Ontology.ActivityType.NEGOTIATION).toBe('Negotiation');
      expect(Ontology.ActivityType.CLOSING).toBe('Closing');
      
      // Marketing activities
      expect(Ontology.ActivityType.CAMPAIGN_EXECUTION).toBe('CampaignExecution');
      expect(Ontology.ActivityType.CONTENT_CREATION).toBe('ContentCreation');
      expect(Ontology.ActivityType.MARKET_RESEARCH).toBe('MarketResearch');
      expect(Ontology.ActivityType.BRAND_MANAGEMENT).toBe('BrandManagement');
      
      // Service activities
      expect(Ontology.ActivityType.CUSTOMER_SUPPORT).toBe('CustomerSupport');
      expect(Ontology.ActivityType.ISSUE_RESOLUTION).toBe('IssueResolution');
      expect(Ontology.ActivityType.MAINTENANCE).toBe('Maintenance');
      expect(Ontology.ActivityType.TRAINING).toBe('Training');
      
      // Information management activities
      expect(Ontology.ActivityType.DATA_COLLECTION).toBe('DataCollection');
      expect(Ontology.ActivityType.DATA_ANALYSIS).toBe('DataAnalysis');
      expect(Ontology.ActivityType.REPORTING).toBe('Reporting');
      expect(Ontology.ActivityType.DOCUMENT_MANAGEMENT).toBe('DocumentManagement');
    });

    test('should create comprehensive CRM activity', () => {
      const activity: Ontology.CRMActivity = {
        id: 'activity-1',
        category: Ontology.DOLCECategory.PERDURANT,
        type: Ontology.ActivityType.OPPORTUNITY_MANAGEMENT,
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

      expect(activity.category).toBe(Ontology.DOLCECategory.PERDURANT);
      expect(activity.type).toBe(Ontology.ActivityType.OPPORTUNITY_MANAGEMENT);
      expect(activity.participants).toHaveLength(3);
      expect(activity.resources).toContain('crm-system');
      expect(activity.inputs).toContain('lead-info');
      expect(activity.outputs).toContain('proposal');
      expect(activity.duration).toBe(480);
      expect(activity.success).toBe(true);
      expect(activity.performanceMetrics?.conversionRate).toBe(0.85);
      expect(activity.context.dealSize).toBe(150000);
    });
  });

  describe('Software Module', () => {
    test('should define software types', () => {
      expect(Ontology.SoftwareType.CRM_PLATFORM).toBe('CRMPlatform');
      expect(Ontology.SoftwareType.SALES_AUTOMATION).toBe('SalesAutomation');
      expect(Ontology.SoftwareType.MARKETING_AUTOMATION).toBe('MarketingAutomation');
      expect(Ontology.SoftwareType.EMAIL_SYSTEM).toBe('EmailSystem');
      expect(Ontology.SoftwareType.KNOWLEDGE_GRAPH).toBe('KnowledgeGraph');
      expect(Ontology.SoftwareType.API).toBe('API');
    });

    test('should create software system entity', () => {
      const software: Ontology.SoftwareSystem = {
        id: 'crm-platform-1',
        category: Ontology.DOLCECategory.NON_AGENTIVE_PHYSICAL_OBJECT,
        type: Ontology.SoftwareType.CRM_PLATFORM,
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

      expect(software.category).toBe(Ontology.DOLCECategory.NON_AGENTIVE_PHYSICAL_OBJECT);
      expect(software.type).toBe(Ontology.SoftwareType.CRM_PLATFORM);
      expect(software.capabilities).toContain('contact-management');
      expect(software.status).toBe('active');
      expect(software.deployment).toBe('cloud');
    });
  });

  describe('OCreamV2Ontology Manager', () => {
    let ontology: Ontology.OCreamV2Ontology;

    beforeEach(() => {
      // Correctly reset the singleton instance before each test
      ontology = new Ontology.OCreamV2Ontology();
    });

    test('should create empty ontology with indices', () => {
      expect(ontology).toBeDefined();
      expect(ontology.getEntitiesByType(Ontology.DOLCECategory.ABSTRACT)).toHaveLength(0);
    });

    test('should add and retrieve entities', () => {
      const entity: Ontology.DOLCEEntity = {
        id: 'test-1',
        category: Ontology.DOLCECategory.ABSTRACT,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      ontology.addEntity(entity);
      const retrieved = ontology.getEntity('test-1');
      
      expect(retrieved).toEqual(entity);
      expect(ontology.getEntitiesByType(Ontology.DOLCECategory.ABSTRACT)).toHaveLength(1);
    });

    test('should return undefined for non-existent entity', () => {
      expect(ontology.getEntity('non-existent')).toBeUndefined();
    });

    test('should index entities by type', () => {
      const abstractEntity: Ontology.DOLCEEntity = {
        id: 'abstract-1',
        category: Ontology.DOLCECategory.ABSTRACT,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const perdurantEntity: Ontology.DOLCEEntity = {
        id: 'perdurant-1',
        category: Ontology.DOLCECategory.PERDURANT,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      ontology.addEntity(abstractEntity);
      ontology.addEntity(perdurantEntity);

      const abstractEntities = ontology.getEntitiesByType(Ontology.DOLCECategory.ABSTRACT);
      const perdurantEntities = ontology.getEntitiesByType(Ontology.DOLCECategory.PERDURANT);

      expect(abstractEntities).toHaveLength(1);
      expect(perdurantEntities).toHaveLength(1);
      expect(abstractEntities[0].id).toBe('abstract-1');
      expect(perdurantEntities[0].id).toBe('perdurant-1');
    });

    test('should not find entities of wrong type', () => {
      const qualityEntities = ontology.getEntitiesByType(Ontology.DOLCECategory.QUALITY);
      expect(qualityEntities).toHaveLength(0);
    });

    test('should manage relationships', () => {
      const relationship: Ontology.OCreamRelationship = {
        id: 'rel-1',
        relationshipType: Ontology.RelationshipType.CUSTOMER_RELATIONSHIP,
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
      expect(relationships[0].relationshipType).toBe(Ontology.RelationshipType.CUSTOMER_RELATIONSHIP);
      expect(relationships[0].strength).toBe(0.9);
    });

    test('should find related entities', () => {
      // Add entities
      const contact: Ontology.DOLCEEntity = {
        id: 'contact-1',
        category: Ontology.DOLCECategory.AGENTIVE_PHYSICAL_OBJECT,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const organization: Ontology.DOLCEEntity = {
        id: 'org-1',
        category: Ontology.DOLCECategory.AGENTIVE_PHYSICAL_OBJECT,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      ontology.addEntity(contact);
      ontology.addEntity(organization);

      // Add relationship
      const relationship: Ontology.OCreamRelationship = {
        id: 'rel-1',
        relationshipType: Ontology.RelationshipType.EMPLOYMENT,
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
      const employmentRelated = ontology.findRelatedEntities('contact-1', Ontology.RelationshipType.EMPLOYMENT);

      expect(related).toHaveLength(1);
      expect(related[0].id).toBe('org-1');
      expect(employmentRelated).toHaveLength(1);
      expect(employmentRelated[0].id).toBe('org-1');
    });

    test('should validate different entity categories', () => {
      const validEndurant: Ontology.DOLCEEntity = {
        id: 'endurant-1',
        category: Ontology.DOLCECategory.ENDURANT,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      };

      const validPerdurant: Ontology.CRMActivity = {
        id: 'perdurant-1',
        category: Ontology.DOLCECategory.PERDURANT,
        type: Ontology.ActivityType.CUSTOMER_SUPPORT,
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

      const invalidPerdurant: Ontology.CRMActivity = {
        id: 'invalid-perdurant-1',
        category: Ontology.DOLCECategory.PERDURANT,
        type: Ontology.ActivityType.CUSTOMER_SUPPORT,
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
      const entity: Ontology.DOLCEEntity = {
        id: 'test-entity',
        category: Ontology.DOLCECategory.ABSTRACT,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const relationship: Ontology.OCreamRelationship = {
        id: 'test-rel',
        relationshipType: Ontology.RelationshipType.COLLABORATION,
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
      expect(exported.typeDistribution[Ontology.DOLCECategory.ABSTRACT]).toBe(1);
    });
  });

  describe('Global Ontology Instance', () => {
    test('should provide a singleton instance', () => {
      const instance1 = Ontology.getOCreamV2Instance();
      const instance2 = Ontology.getOCreamV2Instance();
      expect(instance1).toBe(instance2);
    });
  });
});
