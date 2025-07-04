import axios from 'axios';

// Simple logger for scripts context
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
  debug: (message: string, ...args: any[]) => console.debug(`[DEBUG] ${message}`, ...args)
};

/**
 * Ontology-agnostic entity importance analysis service.
 *
 * This service analyzes the importance of entities and relationships using LLMs or fallback heuristics.
 * It is designed to work with any ontology, schema, or entity set, regardless of domain.
 *
 * Usage:
 *   - Pass in any array of entities/relationships with at least a name and optional description/properties.
 *   - Optionally provide a domain/context string to guide the LLM (e.g., 'financial', 'procurement', etc.),
 *     or leave blank for generic analysis.
 */
export interface EntityImportanceAnalysis {
  entityName: string;
  importanceScore: number;
  reasoning: string;
  businessRelevance: string;
  domainSignificance: string;
}

export interface RelationshipImportanceAnalysis {
  relationshipName: string;
  importanceScore: number;
  reasoning: string;
  businessRelevance: string;
}

export class EntityImportanceAnalyzer {
  private nlpServiceUrl: string;

  constructor() {
    this.nlpServiceUrl = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
  }

  /**
   * Analyze entity importance using LLM (ontology-agnostic)
   */
  async analyzeEntityImportance(
    entities: Array<{ name: string; description?: string; properties?: Record<string, any> }>,
    context?: string,
    maxEntities: number = 100
  ): Promise<EntityImportanceAnalysis[]> {
    try {
      logger.info(`Analyzing importance of ${entities.length} entities${context ? ` for context: ${context}` : ''}`);

      // Prepare entity data for LLM analysis
      const entityData = entities.map(entity => ({
        name: entity.name,
        description: entity.description || 'No description available',
        properties: entity.properties || {}
      }));

      // Create prompt for LLM analysis
      const prompt = this.createEntityAnalysisPrompt(entityData, context, maxEntities);

      // Call LLM service for analysis
      const response = await axios.post(
        `${this.nlpServiceUrl}/analyze-entity-importance`,
        {
          prompt,
          context,
          max_entities: maxEntities,
          entities: entityData
        },
        { timeout: 120000 }
      );

      const analysis = response.data.analysis as EntityImportanceAnalysis[];
      
      // Sort by importance score (descending)
      analysis.sort((a, b) => b.importanceScore - a.importanceScore);

      logger.info(`Completed importance analysis for ${analysis.length} entities`);
      return analysis;

    } catch (error) {
      logger.error('Error analyzing entity importance:', error);
      
      // Fallback: return entities with basic scoring based on generic heuristics
      return this.fallbackEntityAnalysis(entities, context, maxEntities);
    }
  }

  /**
   * Analyze relationship importance using LLM (ontology-agnostic)
   */
  async analyzeRelationshipImportance(
    relationships: Array<{ name: string; description?: string; sourceType?: string; targetType?: string }>,
    context?: string,
    maxRelationships: number = 100
  ): Promise<RelationshipImportanceAnalysis[]> {
    try {
      logger.info(`Analyzing importance of ${relationships.length} relationships${context ? ` for context: ${context}` : ''}`);

      // Prepare relationship data for LLM analysis
      const relationshipData = relationships.map(rel => ({
        name: rel.name,
        description: rel.description || 'No description available',
        sourceType: rel.sourceType || 'Unknown',
        targetType: rel.targetType || 'Unknown'
      }));

      // Create prompt for LLM analysis
      const prompt = this.createRelationshipAnalysisPrompt(relationshipData, context, maxRelationships);

      // Call LLM service for analysis
      const response = await axios.post(
        `${this.nlpServiceUrl}/analyze-relationship-importance`,
        {
          prompt,
          context,
          max_relationships: maxRelationships,
          relationships: relationshipData
        },
        { timeout: 120000 }
      );

      const analysis = response.data.analysis as RelationshipImportanceAnalysis[];
      
      // Sort by importance score (descending)
      analysis.sort((a, b) => b.importanceScore - a.importanceScore);

      logger.info(`Completed importance analysis for ${analysis.length} relationships`);
      return analysis;

    } catch (error) {
      logger.error('Error analyzing relationship importance:', error);
      
      // Fallback: return relationships with basic scoring based on generic heuristics
      return this.fallbackRelationshipAnalysis(relationships, context, maxRelationships);
    }
  }

  private createEntityAnalysisPrompt(
    entities: Array<{ name: string; description: string; properties: Record<string, any> }>,
    context: string | undefined,
    maxEntities: number
  ): string {
    const contextSection = context
      ? `**Domain/Context:** ${context}\n- Focus on entities fundamental to this context.\n- Consider business, operational, and conceptual significance.\n`
      : '**General Context:**\n- Focus on entities fundamental to the ontology or schema.\n- Consider business, operational, and conceptual significance.\n';
    
    return `You are an expert in ontology and knowledge graph analysis. Your task is to analyze the importance of entities in a given ontology or schema and rank them by business relevance and semantic significance.

${contextSection}

**CORE BUSINESS LOGIC PRIORITY:**
When analyzing entities, prioritize CORE BUSINESS CONCEPTS over administrative, regulatory, or peripheral entities. Core business entities are fundamental to the domain's primary operations and value creation.

**PRIMARY BUSINESS ENTITIES (HIGHEST PRIORITY):**
- **Project**: Any entity related to projects, initiatives, programs, campaigns, or planned activities
- **Organization**: Any entity representing organizational structures, companies, corporations, teams, departments
- **Person**: Any entity representing people, roles, participants, stakeholders, managers, employees
- **Business Workflow**: Any entity related to business processes, procedures, operations, activities, tasks

**Core Business Entity Examples:**
- **Project Domain**: Project, Initiative, Program, Campaign, Task, Milestone, Deliverable, Outcome
- **Organization Domain**: Organization, Corporation, Company, Team, Department, Division, Subsidiary, Branch
- **Person Domain**: Person, Manager, Employee, Director, Executive, Stakeholder, Participant, Owner
- **Workflow Domain**: Workflow, Process, Procedure, Activity, Operation, Strategy, Plan, Method
- **Financial Domain**: Fund, Investment, Portfolio, Deal, Transaction, Goal, Objective
- **Procurement Domain**: Contract, Supplier, Tender, Purchase, Order, Agreement, Vendor
- **CRM Domain**: Customer, Lead, Opportunity, Account, Contact, Sale

**Lower Priority Entity Examples:**
- Administrative: Registration, Identifier, Address, Date, Time, Documentation, Metadata
- Regulatory: Compliance, Regulation, Authority, License, Certificate, Permit
- Peripheral: History, Note, Record, File, Status, Version, Reference

**Analysis Criteria (in order of importance):**
1. **Core Business Relevance**: Is this entity fundamental to the domain's primary business operations and value creation?
2. **Operational Frequency**: How frequently would this entity be used in real-world business scenarios?
3. **Decision-Making Impact**: How critical is this entity for business decisions and strategic planning?
4. **Conceptual Foundation**: Is this entity a building block that other important entities depend on?
5. **Regulatory/Compliance Importance**: How important is this entity for compliance or reporting? (Lower priority)

**Priority Scoring Guidelines:**
- **0.9-1.0**: Core business entities fundamental to domain operations (Fund, Corporation, Goal, Project)
- **0.7-0.8**: Important operational entities (Branch, Objective, Investment, Deal)
- **0.5-0.6**: Supporting business entities (Supplier, Customer, Account)
- **0.3-0.4**: Administrative or regulatory entities (Registration, Identifier, Compliance)
- **0.1-0.2**: Peripheral or metadata entities (Documentation, History, Note)

**Entities to Analyze:**
${entities.map((entity, index) => `\n${index + 1}. **${entity.name}**\n   Description: ${entity.description}\n   Properties: ${Object.keys(entity.properties).join(', ') || 'None'}\n`).join('')}

**Instructions:**
- **PRIORITIZE CORE BUSINESS LOGIC**: Focus on entities that are fundamental to the domain's primary operations
- Analyze each entity based on the criteria above, with emphasis on core business relevance
- Assign an importance score from 0.0 to 1.0 (1.0 = most important)
- Provide clear reasoning focusing on business operations and value creation
- Select the top ${maxEntities} most important entities
- Consider the context and business use cases if provided
- **AVOID** prioritizing administrative, regulatory, or peripheral entities over core business concepts

**Output Format:**
Return a JSON array of objects with the following structure:
[
  {
    "entityName": "EntityName",
    "importanceScore": 0.95,
    "reasoning": "Detailed explanation focusing on core business relevance and operational importance",
    "businessRelevance": "Specific business use cases, operations, and value creation impact",
    "domainSignificance": "Role as a fundamental building block in the conceptual model"
  }
]`;
  }

  private createRelationshipAnalysisPrompt(
    relationships: Array<{ name: string; description: string; sourceType: string; targetType: string }>,
    context: string | undefined,
    maxRelationships: number
  ): string {
    const contextSection = context
      ? `**Domain/Context:** ${context}\n- Focus on relationships fundamental to this context.\n- Consider business, operational, and conceptual significance.\n`
      : '**General Context:**\n- Focus on relationships fundamental to the ontology or schema.\n- Consider business, operational, and conceptual significance.\n';
    
    return `You are an expert in ontology and knowledge graph analysis. Your task is to analyze the importance of relationships in a given ontology or schema and rank them by business relevance and semantic significance.

${contextSection}

**CORE BUSINESS LOGIC PRIORITY:**
When analyzing relationships, prioritize CORE BUSINESS RELATIONSHIPS over administrative, regulatory, or peripheral relationships. Core business relationships connect fundamental business entities and represent key operational flows.

**PRIMARY BUSINESS RELATIONSHIPS (HIGHEST PRIORITY):**
- **Project Relationships**: Any relationship involving projects, initiatives, programs, tasks, milestones, deliverables
- **Organization Relationships**: Any relationship involving organizational structures, management, ownership, membership
- **Person Relationships**: Any relationship involving people, roles, reporting, collaboration, participation
- **Business Workflow Relationships**: Any relationship involving processes, procedures, operations, activities, execution

**Core Business Relationship Examples:**
- **Project Domain**: hasProject, managesProject, ownsProject, participatesInProject, leadsProject, hasTask, hasMilestone
- **Organization Domain**: hasOrganization, managesOrganization, ownsOrganization, belongsTo, isPartOf, hasDepartment
- **Person Domain**: hasPerson, managesPerson, reportsTo, supervises, collaboratesWith, hasRole, hasStakeholder
- **Workflow Domain**: hasWorkflow, managesWorkflow, executesWorkflow, followsWorkflow, definesWorkflow, hasProcess
- **Financial Domain**: hasInvestment, managesFund, ownsCorporation, hasGoal, hasObjective
- **Procurement Domain**: awardsContract, suppliesTo, purchasesFrom, managesSupplier
- **CRM Domain**: hasCustomer, managesAccount, createsOpportunity, closesDeal

**Lower Priority Relationship Examples:**
- Administrative: hasRegistration, hasIdentifier, hasAddress, hasDate, hasDocumentation
- Regulatory: compliesWith, regulatedBy, licensedBy, authorizedBy, hasCertificate
- Peripheral: hasMetadata, hasHistory, hasNote, hasRecord, hasFile, hasStatus

**Analysis Criteria (in order of importance):**
1. **Core Business Relevance**: Does this relationship connect fundamental business entities and represent key operational flows?
2. **Operational Frequency**: How frequently would this relationship be used in real-world business scenarios?
3. **Decision-Making Impact**: How critical is this relationship for business decisions and strategic planning?
4. **Conceptual Foundation**: Is this relationship a building block that other important relationships depend on?
5. **Regulatory/Compliance Importance**: How important is this relationship for compliance or reporting? (Lower priority)

**Priority Scoring Guidelines:**
- **0.9-1.0**: Core business relationships fundamental to domain operations (hasInvestment, managesFund, hasGoal)
- **0.7-0.8**: Important operational relationships (ownsCorporation, hasObjective, hasProject)
- **0.5-0.6**: Supporting business relationships (suppliesTo, hasCustomer, managesAccount)
- **0.3-0.4**: Administrative or regulatory relationships (hasRegistration, compliesWith)
- **0.1-0.2**: Peripheral or metadata relationships (hasDocumentation, hasHistory)

**Relationships to Analyze:**
${relationships.map((rel, index) => `\n${index + 1}. **${rel.name}**\n   Description: ${rel.description}\n   Source Type: ${rel.sourceType}\n   Target Type: ${rel.targetType}\n`).join('')}

**Instructions:**
- **PRIORITIZE CORE BUSINESS LOGIC**: Focus on relationships that connect fundamental business entities and represent key operational flows
- Analyze each relationship based on the criteria above, with emphasis on core business relevance
- Assign an importance score from 0.0 to 1.0 (1.0 = most important)
- Provide clear reasoning focusing on business operations and value creation
- Select the top ${maxRelationships} most important relationships
- Consider the context and business use cases if provided
- **AVOID** prioritizing administrative, regulatory, or peripheral relationships over core business concepts

**Output Format:**
Return a JSON array of objects with the following structure:
[
  {
    "relationshipName": "RelationshipName",
    "importanceScore": 0.95,
    "reasoning": "Detailed explanation focusing on core business relevance and operational importance",
    "businessRelevance": "Specific business use cases, operations, and value creation impact"
  }
]`;
  }

  private fallbackEntityAnalysis(
    entities: Array<{ name: string; description?: string; properties?: Record<string, any> }>,
    context: string | undefined,
    maxEntities: number
  ): EntityImportanceAnalysis[] {
    logger.warn('Using fallback entity analysis due to LLM service unavailability');

    const analysis: EntityImportanceAnalysis[] = entities.map(entity => {
      let score = 0.5; // Base score
      
      // Core business entity keywords (high priority)
      const coreBusinessKeywords = [
        // Primary business entities (highest priority)
        'project', 'organization', 'person', 'workflow', 'business',
        'fund', 'corporation', 'branch', 'goal', 'objective', 'investment', 'portfolio', 'deal', 'transaction',
        'contract', 'supplier', 'tender', 'purchase', 'order', 'agreement', 'vendor',
        'customer', 'lead', 'opportunity', 'account', 'contact', 'sale',
        'patient', 'treatment', 'diagnosis', 'provider', 'facility', 'medication',
        'company', 'enterprise', 'firm', 'entity',
        // Direct connections to core concepts
        'manager', 'owner', 'stakeholder', 'participant', 'member', 'employee', 'director', 'executive',
        'team', 'department', 'unit', 'division', 'subsidiary', 'partner', 'client', 'investor',
        'strategy', 'plan', 'initiative', 'program', 'campaign', 'operation', 'process', 'procedure',
        'activity', 'task', 'milestone', 'deliverable', 'outcome', 'result', 'performance', 'metric'
      ];
      
      // Administrative/regulatory keywords (lower priority)
      const adminKeywords = [
        'registration', 'identifier', 'address', 'date', 'time', 'compliance', 'regulation', 'authority', 'license',
        'documentation', 'metadata', 'history', 'note', 'record', 'file', 'certificate', 'permit'
      ];
      
      const entityName = entity.name.toLowerCase();
      const description = (entity.description || '').toLowerCase();
      const fullText = `${entityName} ${description}`;
      
      // Check for core business keywords
      const coreMatches = coreBusinessKeywords.filter(keyword => 
        fullText.includes(keyword)
      ).length;
      
      // Check for administrative keywords
      const adminMatches = adminKeywords.filter(keyword => 
        fullText.includes(keyword)
      ).length;
      
      // Score based on keyword matches
      if (coreMatches > 0) {
        score += Math.min(coreMatches * 0.15, 0.4); // Boost for core business entities
      }
      
      if (adminMatches > 0) {
        score -= Math.min(adminMatches * 0.1, 0.3); // Penalty for administrative entities
      }
      
      // Boost score for entities with more properties (indicates complexity/importance)
      const propertyCount = Object.keys(entity.properties || {}).length;
      score += Math.min(propertyCount * 0.03, 0.15);
      
      // Boost score for entities with longer descriptions (indicates detailed documentation)
      const descriptionLength = entity.description?.length || 0;
      score += Math.min(descriptionLength / 2000, 0.1);
      
      // Cap score at 1.0
      score = Math.min(Math.max(score, 0.1), 1.0);

      const reasoning = `Fallback analysis: ${coreMatches} core business keywords, ${adminMatches} administrative keywords, ${propertyCount} properties, ${descriptionLength} chars description`;
      
      const businessRelevance = coreMatches > 0 
        ? `Core business entity with ${coreMatches} business keywords - fundamental to domain operations`
        : adminMatches > 0 
        ? `Administrative entity with ${adminMatches} admin keywords - lower business priority`
        : 'Standard entity - moderate business relevance';

      const domainSignificance = coreMatches > 0 
        ? `Fundamental building block in the conceptual model with strong business connections`
        : 'Supporting entity in the domain model';

      return {
        entityName: entity.name,
        importanceScore: score,
        reasoning,
        businessRelevance,
        domainSignificance
      };
    });

    // Sort by score and limit to maxEntities
    analysis.sort((a, b) => b.importanceScore - a.importanceScore);
    return analysis.slice(0, maxEntities);
  }

  private fallbackRelationshipAnalysis(
    relationships: Array<{ name: string; description?: string; sourceType?: string; targetType?: string }>,
    context: string | undefined,
    maxRelationships: number
  ): RelationshipImportanceAnalysis[] {
    logger.warn('Using fallback relationship analysis due to LLM service unavailability');

    const analysis: RelationshipImportanceAnalysis[] = relationships.map(rel => {
      let score = 0.5; // Base score
      
      // Core business relationship keywords (high priority)
      const coreBusinessKeywords = [
        // Primary business relationships (highest priority)
        'hasproject', 'managesproject', 'ownsproject', 'participatesinproject', 'leadsproject',
        'hasorganization', 'managesorganization', 'ownsorganization', 'belongsto', 'ispartof',
        'hasperson', 'managesperson', 'reports to', 'supervises', 'collaborateswith',
        'hasworkflow', 'managesworkflow', 'executesworkflow', 'followsworkflow', 'definesworkflow',
        // Core business operations
        'hasinvestment', 'managesfund', 'ownscorporation', 'hasgoal', 'hasobjective',
        'awardscontract', 'suppliesto', 'purchasesfrom', 'managessupplier',
        'hascustomer', 'managesaccount', 'createsopportunity', 'closesdeal',
        'treatspatient', 'prescribesmedication', 'operateson', 'diagnosescondition',
        // Direct business relationships
        'manages', 'owns', 'controls', 'operates', 'invests', 'trades', 'sells', 'buys',
        'leads', 'directs', 'supervises', 'coordinates', 'facilitates', 'enables',
        'implements', 'executes', 'performs', 'conducts', 'carriesout', 'delivers',
        'creates', 'develops', 'designs', 'plans', 'strategizes', 'decides', 'approves'
      ];
      
      // Administrative/regulatory keywords (lower priority)
      const adminKeywords = [
        'hasregistration', 'hasidentifier', 'hasaddress', 'hasdate', 'complieswith', 'regulatedby', 'licensedby', 'authorizedby',
        'hasdocumentation', 'hasmetadata', 'hashistory', 'hasnote', 'hasrecord', 'hasfile'
      ];
      
      const relName = rel.name.toLowerCase();
      const description = (rel.description || '').toLowerCase();
      const fullText = `${relName} ${description}`;
      
      // Check for core business keywords
      const coreMatches = coreBusinessKeywords.filter(keyword => 
        fullText.includes(keyword)
      ).length;
      
      // Check for administrative keywords
      const adminMatches = adminKeywords.filter(keyword => 
        fullText.includes(keyword)
      ).length;
      
      // Score based on keyword matches
      if (coreMatches > 0) {
        score += Math.min(coreMatches * 0.15, 0.4); // Boost for core business relationships
      }
      
      if (adminMatches > 0) {
        score -= Math.min(adminMatches * 0.1, 0.3); // Penalty for administrative relationships
      }
      
      // Boost score for relationships with longer descriptions (indicates detailed documentation)
      const descriptionLength = rel.description?.length || 0;
      score += Math.min(descriptionLength / 1000, 0.15);
      
      // Cap score at 1.0
      score = Math.min(Math.max(score, 0.1), 1.0);

      const reasoning = `Fallback analysis: ${coreMatches} core business keywords, ${adminMatches} administrative keywords, ${descriptionLength} chars description`;
      
      const businessRelevance = coreMatches > 0 
        ? `Core business relationship with ${coreMatches} business keywords - fundamental to domain operations`
        : adminMatches > 0 
        ? `Administrative relationship with ${adminMatches} admin keywords - lower business priority`
        : 'Standard relationship - moderate business relevance';

      return {
        relationshipName: rel.name,
        importanceScore: score,
        reasoning,
        businessRelevance
      };
    });

    // Sort by score and limit to maxRelationships
    analysis.sort((a, b) => b.importanceScore - a.importanceScore);
    return analysis.slice(0, maxRelationships);
  }
} 