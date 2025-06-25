// O-CREAM-v2 Ontology Tests
import { 
  OCreamV2Ontology,
  DOLCECategory,
  RelationshipType,
  KnowledgeType,
  ActivityType,
  SoftwareType,
  InformationElement,
  CRMActivity,
  SoftwareSystem,
  DOLCEEntity,
  OCreamRelationship
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
      expect(activity.performanceMetrics?.conversionRate).toBe(0.85);
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
      // Correctly reset the singleton instance before each test
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
      
      expect(retrieved).toEqual(entity);
      expect(ontology.getEntitiesByType(DOLCECategory.ABSTRACT)).toHaveLength(1);
    });

    test('should return undefined for non-existent entity', () => {
      expect(ontology.getEntity('non-existent')).toBeUndefined();
    });

    test('should index entities by type', () => {
      const entity1: DOLCEEntity = { id: 'abs-1', category: DOLCECategory.ABSTRACT, createdAt: new Date(), updatedAt: new Date() };
      const entity2: DOLCEEntity = { id: 'per-1', category: DOLCECategory.PERDURANT, createdAt: new Date(), updatedAt: new Date() };
      const entity3: DOLCEEntity = { id: 'abs-2', category: DOLCECategory.ABSTRACT, createdAt: new Date(), updatedAt: new Date() };

      ontology.addEntity(entity1);
      ontology.addEntity(entity2);
      ontology.addEntity(entity3);

      const abstractEntities = ontology.getEntitiesByType(DOLCECategory.ABSTRACT);
      const perdurantEntities = ontology.getEntitiesByType(DOLCECategory.PERDURANT);

      expect(abstractEntities).toHaveLength(2);
      expect(abstractEntities).toContain(entity1);
      expect(abstractEntities).toContain(entity3);
      expect(perdurantEntities).toHaveLength(1);
      expect(perdurantEntities).toContain(entity2);
    });

    test('should not find entities of wrong type', () => {
      const entity: DOLCEEntity = { id: 'test-1', category: DOLCECategory.ABSTRACT, createdAt: new Date(), updatedAt: new Date() };
      ontology.addEntity(entity);

      expect(ontology.getEntitiesByType(DOLCECategory.PERDURANT)).toHaveLength(0);
    });

    test('should manage relationships', () => {
      const entity1: DOLCEEntity = { id: 'e1', category: DOLCECategory.AGENTIVE_PHYSICAL_OBJECT, createdAt: new Date(), updatedAt: new Date() };
      const entity2: DOLCEEntity = { id: 'e2', category: DOLCECategory.AGENTIVE_PHYSICAL_OBJECT, createdAt: new Date(), updatedAt: new Date() };
      ontology.addEntity(entity1);
      ontology.addEntity(entity2);

      const rel: OCreamRelationship = {
        id: 'rel-1',
        relationshipType: RelationshipType.COLLABORATION,
        sourceEntityId: 'e1',
        targetEntityId: 'e2',
        temporal: {},
        properties: { project: 'Project X' },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      ontology.addRelationship(rel);
      const entity1Rels = ontology.getRelationshipsForEntity('e1');
      const entity2Rels = ontology.getRelationshipsForEntity('e2');

      expect(entity1Rels).toHaveLength(1);
      expect(entity1Rels[0]).toEqual(rel);
      expect(entity2Rels).toHaveLength(1);
      expect(entity2Rels[0]).toEqual(rel);
    });

    test('should find related entities', () => {
      const entity1: DOLCEEntity = { id: 'e1', category: DOLCECategory.AGENTIVE_PHYSICAL_OBJECT, createdAt: new Date(), updatedAt: new Date() };
      const entity2: DOLCEEntity = { id: 'e2', category: DOLCECategory.AGENTIVE_PHYSICAL_OBJECT, createdAt: new Date(), updatedAt: new Date() };
      const entity3: DOLCEEntity = { id: 'e3', category: DOLCECategory.AGENTIVE_PHYSICAL_OBJECT, createdAt: new Date(), updatedAt: new Date() };
      ontology.addEntity(entity1);
      ontology.addEntity(entity2);
      ontology.addEntity(entity3);

      const rel1: OCreamRelationship = {
        id: 'rel-1',
        relationshipType: RelationshipType.COLLABORATION,
        sourceEntityId: 'e1',
        targetEntityId: 'e2',
        temporal: {},
        properties: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const rel2: OCreamRelationship = {
        id: 'rel-2',
        relationshipType: RelationshipType.MEMBERSHIP,
        sourceEntityId: 'e1',
        targetEntityId: 'e3',
        temporal: {},
        properties: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      ontology.addRelationship(rel1);
      ontology.addRelationship(rel2);

      const relatedToE1 = ontology.findRelatedEntities('e1');
      expect(relatedToE1).toHaveLength(2);
      expect(relatedToE1).toContain(entity2);
      expect(relatedToE1).toContain(entity3);

      const collaboratorsOfE1 = ontology.findRelatedEntities('e1', RelationshipType.COLLABORATION);
      expect(collaboratorsOfE1).toHaveLength(1);
      expect(collaboratorsOfE1).toContain(entity2);
    });

    test('should validate different entity categories', () => {
      const endurant: DOLCEEntity = {
        id: 'end-1',
        category: DOLCECategory.ENDURANT,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const perdurant: DOLCEEntity = {
        id: 'per-1',
        category: DOLCECategory.PERDURANT,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const quality: DOLCEEntity = {
        id: 'qua-1',
        category: DOLCECategory.QUALITY,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const abstract: DOLCEEntity = {
        id: 'abs-1',
        category: DOLCECategory.ABSTRACT,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      expect(ontology.validateEntity(endurant)).toBe(true);
      expect(ontology.validateEntity(perdurant)).toBe(true);
      expect(ontology.validateEntity(quality)).toBe(true);
      expect(ontology.validateEntity(abstract)).toBe(true);
    });

    test('should export ontology structure', () => {
      const entity: DOLCEEntity = { id: 'test-1', category: DOLCECategory.ABSTRACT, createdAt: new Date(), updatedAt: new Date() };
      ontology.addEntity(entity);

      const exported = ontology.exportOntology();
      expect(exported.entities.length).toBe(1);
      expect(exported.entities[0].id).toBe('test-1');
    });
  });

  describe('Global Ontology Instance', () => {
    test('should provide a singleton instance', () => {
      const instance1 = OCreamV2Ontology.getInstance();
      const instance2 = OCreamV2Ontology.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});
