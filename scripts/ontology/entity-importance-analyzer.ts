import axios from 'axios';

// Simple logger for scripts context
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
  debug: (message: string, ...args: any[]) => console.debug(`[DEBUG] ${message}`, ...args)
};

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

  constructor(nlpServiceUrl: string = process.env.NLP_SERVICE_URL || 'http://localhost:8000') {
    this.nlpServiceUrl = nlpServiceUrl;
  }

  async analyzeEntityImportance(
    entities: Array<{ name: string; description?: string; properties?: Record<string, any> }>,
    context?: string,
    maxEntities: number = 100
  ): Promise<EntityImportanceAnalysis[]> {
    try {
      logger.info(`Analyzing importance of ${entities.length} entities${context ? ` for context: ${context}` : ''}`);

      const entityData = entities.map(entity => ({
        name: entity.name,
        description: entity.description || 'No description available',
        properties: entity.properties || {}
      }));

      const prompt = this.createEntityAnalysisPrompt(entityData, context, maxEntities);

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

      let analysis = response.data.analysis as EntityImportanceAnalysis[];

      analysis.forEach(item => {
        const spacedName = item.entityName.replace(/([a-z])([A-Z])/g, '$1 $2');
        const wordCount = spacedName.split(/[^A-Za-z0-9]+/).filter(Boolean).length;
        if (wordCount > 1) {
          const penalty = Math.min((wordCount - 1) * 0.07, 0.3);
          item.importanceScore = Math.max(0, item.importanceScore - penalty);
        } else {
          item.importanceScore = Math.min(1, item.importanceScore + 0.05);
        }
      });

      analysis.sort((a, b) => b.importanceScore - a.importanceScore);

      logger.info(`Completed importance analysis for ${analysis.length} entities`);
      return analysis;

    } catch (error) {
      logger.error('Error analyzing entity importance:', error);
      return this.fallbackEntityAnalysis(entities, context, maxEntities);
    }
  }

  async analyzeRelationshipImportance(
    relationships: Array<{ name: string; description?: string; sourceType?: string; targetType?: string }>,
    context?: string,
    maxRelationships: number = 100
  ): Promise<RelationshipImportanceAnalysis[]> {
    try {
      logger.info(`Analyzing importance of ${relationships.length} relationships${context ? ` for context: ${context}` : ''}`);

      const relationshipData = relationships.map(rel => ({
        name: rel.name,
        description: rel.description || 'No description available',
        sourceType: rel.sourceType || 'Unknown',
        targetType: rel.targetType || 'Unknown'
      }));

      const prompt = this.createRelationshipAnalysisPrompt(relationshipData, context, maxRelationships);

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

      let analysis = response.data.analysis as RelationshipImportanceAnalysis[];

      analysis.forEach(item => {
        const spacedName = item.relationshipName.replace(/([a-z])([A-Z])/g, '$1 $2');
        const wordCount = spacedName.split(/[^A-Za-z0-9]+/).filter(Boolean).length;
        if (wordCount > 1) {
          const penalty = Math.min((wordCount - 1) * 0.07, 0.3);
          item.importanceScore = Math.max(0, item.importanceScore - penalty);
        } else {
          item.importanceScore = Math.min(1, item.importanceScore + 0.05);
        }
      });

      analysis.sort((a, b) => b.importanceScore - a.importanceScore);

      logger.info(`Completed importance analysis for ${analysis.length} relationships`);
      return analysis;

    } catch (error) {
      logger.error('Error analyzing relationship importance:', error);
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
- **Second-Level Descriptive Entities**: Entities that primarily describe or classify other entities rather than being core business concepts themselves. These should be deprioritized:
  - Examples: MaturityLevel, EntityStatus, TechnicalAbilitySummary, ContractTerm, FundType, InvestmentFund, HedgeFund, MutualFund

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
- **0.2-0.3**: Second-level descriptive entities (MaturityLevel, EntityStatus, TechnicalAbilitySummary)
- **0.1-0.2**: Peripheral or metadata entities (Documentation, History, Note)

**Entities to Analyze:**
${entities.map(e => `- **${e.name}**: ${e.description}\n  Properties: ${JSON.stringify(e.properties, null, 2)}`).join('\n')}

**Task:**
- Analyze ALL entities listed above (up to ${maxEntities})
- For each entity, provide:
  - entityName: The name of the entity
  - importanceScore: A float between 0.1 and 1.0 based on the scoring guidelines
  - reasoning: 1-2 sentence explanation
  - businessRelevance: Short phrase describing business relevance
  - domainSignificance: Short phrase describing domain significance
- Output ONLY a JSON array of objects with these fields
- Sort the array by importanceScore descending`;
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
${relationships.map(r => `- **${r.name}**: ${r.description}\n  Source: ${r.sourceType}, Target: ${r.targetType}`).join('\n')}

**Task:**
- Analyze ALL relationships listed above (up to ${maxRelationships})
- For each relationship, provide:
  - relationshipName: The name of the relationship
  - importanceScore: A float between 0.1 and 1.0 based on the scoring guidelines
  - reasoning: 1-2 sentence explanation
  - businessRelevance: Short phrase describing business relevance
- Output ONLY a JSON array of objects with these fields
- Sort the array by importanceScore descending`;
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
        // Primary business entities (highest priority - 0.3 boost each)
        'project', 'organization', 'person', 'workflow', 'business', 'fund', 'program', 'law',
        // Secondary business entities (high priority - 0.2 boost each)
        'corporation', 'branch', 'goal', 'objective', 'investment', 'portfolio', 'deal', 'transaction',
        'contract', 'supplier', 'tender', 'purchase', 'order', 'agreement', 'vendor',
        'customer', 'lead', 'opportunity', 'account', 'contact', 'sale',
        'patient', 'treatment', 'diagnosis', 'provider', 'facility', 'medication',
        'company', 'enterprise', 'firm', 'entity',
        'termsheet', 'claim', 'commitment', 'duty', 'regulation', 'owner',
        // Direct connections to core concepts (medium priority - 0.15 boost each)
        'manager', 'owner', 'stakeholder', 'participant', 'member', 'employee', 'director', 'executive',
        'team', 'department', 'unit', 'division', 'subsidiary', 'partner', 'client', 'investor',
        'strategy', 'plan', 'initiative', 'campaign', 'operation', 'process', 'procedure',
        'activity', 'task', 'milestone', 'deliverable', 'outcome', 'result', 'performance', 'metric'
      ];
      
      // Ultra-high priority keywords (0.4 boost each)
      const ultraHighPriorityKeywords = [
        'fund', 'project', 'program', 'person', 'law', 'organization', 'business',
        'goal', 'termsheet', 'claim', 'commitment', 'agreement', 'duty', 'regulation', 'owner'
      ];
      
      // Administrative keywords (penalties)
      const adminKeywords = [
        'registration', 'identifier', 'address', 'date', 'time', 'documentation', 'metadata',
        'compliance', 'regulation', 'authority', 'license', 'certificate', 'permit',
        'history', 'note', 'record', 'file', 'status', 'version', 'reference'
      ];
      
      // Descriptive entity keywords (higher penalties for second-level entities)
      const descriptiveKeywords = [
        'maturitylevel', 'entitystatus', 'technicalabilitysummary', 'contractterm', 'fundtype',
        'investmentfund', 'hedgefund', 'mutualfund', 'type', 'status', 'level', 'summary', 'term',
        'classification', 'category', 'subcategory', 'subtype', 'subclass', 'variant'
      ];
      
      const entityName = entity.name.toLowerCase();
      const description = (entity.description || '').toLowerCase();
      const fullText = `${entityName} ${description}`;

      // Check for ultra-high priority keywords first
      const ultraHighMatches = ultraHighPriorityKeywords.filter(keyword => 
        fullText.includes(keyword.toLowerCase())
      ).length;
      
      // Check for core business keywords
      const coreMatches = coreBusinessKeywords.filter(keyword => 
        fullText.includes(keyword.toLowerCase())
      ).length;
      
      // Check for administrative keywords
      const adminMatches = adminKeywords.filter(keyword => 
        fullText.includes(keyword.toLowerCase())
      ).length;
      
      // Check for descriptive keywords
      const descriptiveMatches = descriptiveKeywords.filter(keyword => 
        fullText.includes(keyword.toLowerCase())
      ).length;
      
      // Score based on keyword matches with higher weights for core entities
      if (ultraHighMatches > 0) {
        score += Math.min(ultraHighMatches * 0.4, 0.6); // High boost for ultra-priority entities
      }
      
      if (coreMatches > 0) {
        score += Math.min(coreMatches * 0.15, 0.3); // Boost for core business entities
      }
      
      let contextMatches = 0;
      if (context) {
        const contextWords = context.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
        contextMatches = contextWords.filter(word => fullText.includes(word)).length;
        if (contextMatches > 0) {
          // modest boost — 0.05 per match up to 0.2
          score += Math.min(contextMatches * 0.05, 0.2);
        }
      }
      
      // --------------- NEW: Composed-word penalty ----------------
      // If the entity name looks like multiple concatenated words (camel case or snake case),
      // give it a small penalty so that simpler atomic concepts rank higher.
      const spacedName = entity.name.replace(/([a-z])([A-Z])/g, '$1 $2');
      const wordCount = spacedName.split(/[^A-Za-z0-9]+/).filter(Boolean).length;
      if (wordCount > 1) {
        // subtract 0.07 per extra word beyond the first, max 0.3
        const penalty = Math.min((wordCount - 1) * 0.07, 0.3);
        score -= penalty;
      } else {
        // single word – small bonus (helps Buyer, Bond, Claim, etc.)
        score += 0.05;
      }
      
      if (adminMatches > 0) {
        score -= Math.min(adminMatches * 0.15, 0.4); // Higher penalty for administrative entities
      }
      
      // Apply penalty for descriptive entities (second-level entities describing parent entities)
      if (descriptiveMatches > 0) {
        score -= Math.min(descriptiveMatches * 0.3, 0.5); // Significant penalty for descriptive entities
      }
      
      // Boost score for entities with more properties (indicates complexity/importance)
      const propertyCount = Object.keys(entity.properties || {}).length;
      score += Math.min(propertyCount * 0.03, 0.15);
      
      // Boost score for entities with longer descriptions (indicates detailed documentation)
      const descriptionLength = entity.description?.length || 0;
      score += Math.min(descriptionLength / 1000, 0.15);
      
      // Cap / floor score to keep within [0.1, 1.0]
      score = Math.min(Math.max(score, 0.1), 1.0);

      const reasoning = `Fallback analysis: ${ultraHighMatches} ultra-high priority keywords, ${coreMatches} core business keywords, ${adminMatches} administrative keywords, ${descriptiveMatches} descriptive keywords, ${propertyCount} properties, ${descriptionLength} chars description`;
      
      const businessRelevance = ultraHighMatches > 0 
        ? `Ultra-high priority entity with ${ultraHighMatches} ultra-high priority keywords - fundamental to domain operations`
        : coreMatches > 0 
        ? `Core business entity with ${coreMatches} business keywords - fundamental to domain operations`
        : descriptiveMatches > 0 
        ? `Descriptive entity with ${descriptiveMatches} descriptive keywords - low business priority`
        : adminMatches > 0 
        ? `Administrative entity with ${adminMatches} admin keywords - lower business priority`
        : 'Standard entity - moderate business relevance';

      const domainSignificance = contextMatches > 0 
        ? `High domain significance with ${contextMatches} context matches`
        : 'Standard domain significance';

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
        // Primary business relationships (highest priority - 0.3 boost each)
        'hasproject', 'managesproject', 'ownsproject', 'participatesinproject', 'leadsproject',
        'hasorganization', 'managesorganization', 'ownsorganization', 'belongsto', 'ispartof',
        'hasperson', 'managesperson', 'reports to', 'supervises', 'collaborateswith',
        'hasworkflow', 'managesworkflow', 'executesworkflow', 'followsworkflow', 'definesworkflow',
        'hasfund', 'managesfund', 'ownsfund', 'investsinfund', 'funds',
        'hasprogram', 'managesprogram', 'ownsprogram', 'participatesinprogram', 'leadsprogram',
        'haslaw', 'governedbylaw', 'regulatedbylaw', 'complieswithlaw', 'enforceslaw',
        'hasgoal', 'managesgoal', 'ownsgoal', 'setsgoal', 'achievesgoal',
        'hastermsheet', 'managestermsheet', 'ownstermsheet', 'createstermsheet', 'approvestermsheet',
        'hasclaim', 'managesclaim', 'ownsclaim', 'filesclaim', 'processesclaim',
        'hascommitment', 'managescommitment', 'ownscommitment', 'makescommitment', 'fulfillscommitment',
        'hasagreement', 'managesagreement', 'ownsagreement', 'signsagreement', 'enforcesagreement',
        'hasduty', 'managesduty', 'ownsduty', 'imposesduty', 'fulfillsduty',
        'hasregulation', 'managesregulation', 'ownsregulation', 'enforcesregulation', 'complieswithregulation',
        'hasowner', 'managesowner', 'ownsowner', 'appointsowner',
        // Direct connections to core concepts (medium priority - 0.15 boost each)
        'hasmanager', 'hasowner', 'hasstakeholder', 'hasparticipant', 'hasmember', 'hasemployee', 'hasdirector', 'hasexecutive',
        'hasteam', 'hasdepartment', 'hasunit', 'hasdivision', 'hassubsidiary', 'haspartner', 'hasclient', 'hasinvestor',
        'hasstrategy', 'hasplan', 'hasinitiative', 'hascampaign', 'hasoperation', 'hasprocess', 'hasprocedure',
        'hasactivity', 'hastask', 'hasmilestone', 'hasdeliverable', 'hasoutcome', 'hasresult', 'hasperformance', 'hasmetric',
        'hasinvestment', 'hasportfolio', 'hasdeal', 'hastransaction', 'hasobjective',
        'hascontract', 'hassupplier', 'hastender', 'haspurchase', 'hasorder', 'hasagreement', 'hasvendor',
        'hascustomer', 'haslead', 'hasopportunity', 'hasaccount', 'hascontact', 'hassale',
        'haspatient', 'hastreatment', 'hasdiagnosis', 'hasprovider', 'hasfacility', 'hasmedication',
        'hascompany', 'hasenterprise', 'hasfirm', 'hasentity',
        'hastermsheet', 'hasclaim', 'hascommitment', 'hasduty', 'hasregulation', 'hasowner'
      ];
      
      // Ultra-high priority keywords (0.4 boost each)
      const ultraHighPriorityKeywords = [
        'hasinvestment', 'managesfund', 'hasgoal', 'ownscorporation', 'hasobjective', 'hasproject',
        'awardscontract', 'suppliesto', 'purchasesfrom', 'managessupplier', 'hascustomer', 'managesaccount'
      ];
      
      // Administrative keywords (penalties)
      const adminKeywords = [
        'hasregistration', 'hasidentifier', 'hasaddress', 'hasdate', 'hasdocumentation',
        'complieswith', 'regulatedby', 'licensedby', 'authorizedby', 'hascertificate',
        'hasmetadata', 'hashistory', 'hasnote', 'hasrecord', 'hasfile', 'hasstatus'
      ];
      
      const relName = rel.name.toLowerCase();
      const relDescription = (rel.description || '').toLowerCase();
      const fullText = `${relName} ${relDescription}`;
      
      // Check for ultra-high priority keywords first
      const ultraHighMatches = ultraHighPriorityKeywords.filter(keyword => 
        fullText.includes(keyword.toLowerCase())
      ).length;
      
      // Check for core business keywords
      const coreMatches = coreBusinessKeywords.filter(keyword => 
        fullText.includes(keyword.toLowerCase())
      ).length;
      
      // Check for administrative keywords
      const adminMatches = adminKeywords.filter(keyword => 
        fullText.includes(keyword.toLowerCase())
      ).length;
      
      // Score based on keyword matches with higher weights for core relationships
      if (ultraHighMatches > 0) {
        score += Math.min(ultraHighMatches * 0.4, 0.6); // High boost for ultra-priority relationships
      }
      
      if (coreMatches > 0) {
        score += Math.min(coreMatches * 0.15, 0.3); // Boost for core business relationships
      }
      
      if (adminMatches > 0) {
        score -= Math.min(adminMatches * 0.15, 0.4); // Higher penalty for administrative relationships
      }
      
      // Boost score for relationships with longer descriptions (indicates detailed documentation)
      const descriptionLength = rel.description?.length || 0;
      score += Math.min(descriptionLength / 1000, 0.15);
      
      // Cap / floor score to keep within [0.1, 1.0]
      score = Math.min(Math.max(score, 0.1), 1.0);

      const reasoning = `Fallback analysis: ${ultraHighMatches} ultra-high priority keywords, ${coreMatches} core business keywords, ${adminMatches} administrative keywords, ${descriptionLength} chars description`;
      
      const businessRelevance = ultraHighMatches > 0 
        ? `Ultra-high priority relationship with ${ultraHighMatches} ultra-high priority keywords - fundamental to domain operations`
        : coreMatches > 0 
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