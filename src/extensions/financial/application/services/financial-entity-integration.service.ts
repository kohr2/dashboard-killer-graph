// Financial Entity Integration Service
// Bridges entity extraction with FIBO ontology and core CRM functionality

import { readFileSync } from 'fs';
import { join } from 'path';
import { ExtensibleEntityExtractionService, ExtensionEntityExtractionResult } from '../../../../src/crm-core/application/services/extensible-entity-extraction.service';
import { ContactRepository } from '../../../../src/crm-core/domain/repositories/contact-repository';
import { OCreamV2Ontology, ActivityType, KnowledgeType, createInformationElement, InformationElement, CRMActivity } from '../../../../src/crm-core/domain/ontology/o-cream-v2';
import { 
    FIBOFinancialInstrument, 
    FIBOTransaction, 
    FIBOMarketData,
    FIBOFinancialInstitution
} from '../../domain/entities/fibo-financial-entities';
import { Contact } from '../../../../src/crm-core/domain/entities/contact';
import { EntityResolutionService } from './entity-resolution.service';
import { RelationshipExtractionService } from './relationship-extraction.service';
import { HybridDealExtractionService } from './hybrid-deal-extraction.service';

const ENTITY_ALIAS_MAP: Record<string, string> = {
  'GS': 'Goldman Sachs',
  'JPM': 'JPMorgan Chase & Co.',
  'MS': 'Morgan Stanley',
  'Citi': 'Citigroup',
  'BoA': 'Bank of America',
  'BofA': 'Bank of America',
  'DB': 'Deutsche Bank',
  'AAPL': 'Apple Inc.',
  'MSFT': 'Microsoft Corporation',
  'GOOG': 'Alphabet Inc.',
  'AMZN': 'Amazon.com Inc.',
  'TSLA': 'Tesla Inc.',
  'NVDA': 'NVIDIA Corporation',
};

export interface FinancialEntityContext {
  contactId?: string;
  emailId?: string;
  documentType?: 'EMAIL' | 'DOCUMENT' | 'REPORT' | 'TRANSACTION';
  businessContext?: 'INVESTMENT' | 'LENDING' | 'TRADING' | 'ADVISORY' | 'COMPLIANCE';
  riskTolerance?: 'LOW' | 'MEDIUM' | 'HIGH';
  clientSegment?: 'RETAIL' | 'CORPORATE' | 'INSTITUTIONAL';
}

export interface FinancialInsights {
  portfolioAnalysis: {
    totalValue: number;
    instruments: FIBOFinancialInstrument[];
    riskProfile: {
      score: number;
      distribution: Record<string, number>;
    };
    diversification: {
      byType: Record<string, number>;
      byCurrency: Record<string, number>;
      byRegion: Record<string, number>;
    };
  };
  transactionAnalysis: {
    volume: number;
    totalValue: number;
    transactions: FIBOTransaction[];
    patterns: string[];
    complianceAlerts: string[];
  };
  marketIntelligence: {
    instruments: string[];
    marketData: FIBOMarketData[];
    trends: string[];
    alerts: string[];
  };
  clientProfile: {
    investmentPreferences: string[];
    riskAssessment: string;
    complianceStatus: string;
    relationshipValue: number;
  };
  recommendations: {
    immediate: string[];
    strategic: string[];
    compliance: string[];
  };
}

export class FinancialEntityIntegrationService {
  private entityExtractor: ExtensibleEntityExtractionService;
  private contactRepository: ContactRepository;
  private ontology: OCreamV2Ontology;
  private fiboEntities: Map<string, any>;
  private resolutionService: EntityResolutionService;
  private relationshipService: RelationshipExtractionService;
  private hybridDealService: HybridDealExtractionService;

  constructor(contactRepository: ContactRepository) {
    this.entityExtractor = new ExtensibleEntityExtractionService();
    this.contactRepository = contactRepository;
    this.ontology = OCreamV2Ontology.getInstance();
    this.fiboEntities = new Map();
    this.resolutionService = new EntityResolutionService();
    this.relationshipService = new RelationshipExtractionService();
    this.hybridDealService = new HybridDealExtractionService();
  }

  /**
   * Process financial content and integrate with CRM
   */
  public async processFinancialContent(
    content: string,
    context: FinancialEntityContext
  ): Promise<{
    extractionResult: ExtensionEntityExtractionResult;
    fiboEntities: any[];
    insights: FinancialInsights;
    crmIntegration: {
      contactUpdates: any[];
      knowledgeElements: any[];
      activities: any[];
      relationships: any[];
    };
  }> {
    // 1. Extract entities
    const extractionResult = await this.entityExtractor.extractEntitiesWithExtensions(content, {
      enabledExtensions: ['financial'],
      coreModel: 'en_core_web_lg',
      includeValidation: true,
      contextMetadata: context
    });

    // 2. Resolve entity aliases
    const resolvableEntities = extractionResult.entities.map(e => ({ type: e.type, value: e.value }));
    const resolvedEntities = this.resolutionService.resolve(resolvableEntities);
    // Note: this is a simplified integration. A real implementation would need to merge the resolved entities back into the extractionResult.

    // 3. Extract relationships
    const relationshipEntities = extractionResult.entities.map((e, i) => ({ id: i.toString(), type: e.type, value: e.value }));
    const relationships = this.relationshipService.extract(content, relationshipEntities);
     // Note: this is a simplified integration. A real implementation would need to add these relationships to the crmIntegration result.

    // 4. Convert extracted entities to FIBO entities
    const fiboEntities = await this.createFIBOEntities(extractionResult, context);

    // 5. Generate financial insights
    const insights = await this.generateFinancialInsights(fiboEntities, extractionResult, context);

    // 6. Integrate with CRM
    const crmIntegration = await this.integratWithCRM(fiboEntities, insights, context);

    return {
      extractionResult,
      fiboEntities,
      insights,
      crmIntegration
    };
  }

  /**
   * Resolve entity aliases to their canonical names.
   * This method modifies the extractionResult in place.
   */
  private resolveEntityAliases(extractionResult: ExtensionEntityExtractionResult): void {
    const allEntities = [
        ...extractionResult.entities, 
        ...(extractionResult.extensionResults.financial || [])
    ];

    for (const entity of allEntities) {
      const canonicalName = ENTITY_ALIAS_MAP[entity.value.toUpperCase()];
      if (canonicalName) {
        console.log(`🔎 Resolved alias: '${entity.value}' -> '${canonicalName}'`);
        entity.metadata = { ...entity.metadata, originalValue: entity.value, resolved: true };
        entity.value = canonicalName;

        // If it's a financial entity, potentially upgrade its type
        if (entity.type === 'STOCK_SYMBOL' || entity.type === 'COMPANY_NAME') {
            entity.type = 'FINANCIAL_INSTITUTION';
        }
      }
    }
  }

  /**
   * Create FIBO entities from extracted entities
   */
  private async createFIBOEntities(
    extractionResult: ExtensionEntityExtractionResult,
    context: FinancialEntityContext
  ): Promise<any[]> {
    const fiboEntities: any[] = [];

    // Process financial entities
    const financialEntities = extractionResult.extensionResults.financial || [];

    for (const entity of financialEntities) {
      try {
        const fiboEntity = FIBOEntityFactory.createFromExtractedEntity(entity, entity.type);
        
        if (fiboEntity) {
          // Register with ontology
          this.ontology.addEntity(fiboEntity);
          
          // Store in local registry
          this.fiboEntities.set(fiboEntity.id, fiboEntity);
          
          fiboEntities.push(fiboEntity);

          console.log(`✅ Created FIBO entity: ${fiboEntity.getOntologicalType()} - ${entity.value}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to create FIBO entity for ${entity.type}:`, error);
      }
    }

    // Create synthetic entities based on patterns
    const syntheticEntities = await this.createSyntheticFIBOEntities(extractionResult, context);
    fiboEntities.push(...syntheticEntities);

    return fiboEntities;
  }

  /**
   * Create synthetic FIBO entities based on entity patterns and context
   */
  private async createSyntheticFIBOEntities(
    extractionResult: ExtensionEntityExtractionResult,
    context: FinancialEntityContext
  ): Promise<any[]> {
    const syntheticEntities: any[] = [];

    // Detect transaction patterns
    const monetaryEntities = extractionResult.entities.filter((e: any) =>
      e.type === 'MONETARY_AMOUNT' || e.type === 'CURRENCY'
    );
    const personEntities = extractionResult.entities.filter((e: any) => e.type === 'PERSON_NAME');
    const organizationEntities = extractionResult.entities.filter((e: any) =>
      e.type === 'ORGANIZATION' || e.type === 'COMPANY_NAME'
    );

    // Create transaction entities when we have amount + parties
    if (monetaryEntities.length > 0 && (personEntities.length > 0 || organizationEntities.length > 0)) {
      for (const monetary of monetaryEntities) {
        const amount = this.extractAmount(monetary.value);
        const currency = this.extractCurrency(monetary.value);

        if (amount && currency) {
          const transaction = new FIBOTransaction(
            this.inferTransactionType(context, extractionResult),
            amount,
            currency,
            context.contactId || 'unknown',
            organizationEntities[0]?.value || personEntities[0]?.value || 'unknown',
            undefined, // instrumentId
            new Date(),
            undefined, // settlementDate
            undefined, // fees
            {
              inferredFrom: 'entity_pattern',
              context: context,
              confidence: 0.7
            }
          );

          this.ontology.addEntity(transaction);
          syntheticEntities.push(transaction);
        }
      }
    }

    return syntheticEntities;
  }

  /**
   * Generate comprehensive financial insights
   */
  private async generateFinancialInsights(
    fiboEntities: any[],
    extractionResult: ExtensionEntityExtractionResult,
    context: FinancialEntityContext
  ): Promise<FinancialInsights> {
    // Separate entities by type
    const instruments = fiboEntities.filter(e => e instanceof FIBOFinancialInstrument);
    const institutions = fiboEntities.filter(e => e instanceof FIBOFinancialInstitution);
    const marketData = fiboEntities.filter(e => e instanceof FIBOMarketData);
    const transactions = fiboEntities.filter(e => e instanceof FIBOTransaction);

    // Portfolio Analysis
    const portfolioAnalysis = {
      totalValue: this.calculateTotalPortfolioValue(instruments, marketData),
      instruments: instruments as FIBOFinancialInstrument[],
      riskProfile: this.calculatePortfolioRisk(instruments),
      diversification: this.analyzeDiversification(instruments)
    };

    // Transaction Analysis
    const transactionAnalysis = {
      volume: transactions.length,
      totalValue: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
      transactions: transactions as FIBOTransaction[],
      patterns: this.identifyTransactionPatterns(transactions),
      complianceAlerts: this.generateComplianceAlerts(transactions)
    };

    // Market Intelligence
    const marketIntelligence = {
      instruments: instruments.map(i => i.name),
      marketData: marketData as FIBOMarketData[],
      trends: this.identifyMarketTrends(marketData),
      alerts: this.generateMarketAlerts(marketData, instruments)
    };

    // Client Profile
    const clientProfile = {
      investmentPreferences: this.inferInvestmentPreferences(instruments, context),
      riskAssessment: this.assessClientRisk(transactions, instruments, context),
      complianceStatus: this.assessComplianceStatus(transactions, context),
      relationshipValue: this.calculateRelationshipValue(transactions, instruments)
    };

    // Recommendations
    const recommendations = {
      immediate: this.generateImmediateRecommendations(portfolioAnalysis, transactionAnalysis),
      strategic: this.generateStrategicRecommendations(portfolioAnalysis, clientProfile),
      compliance: this.generateComplianceRecommendations(transactionAnalysis, clientProfile)
    };

    return {
      portfolioAnalysis,
      transactionAnalysis,
      marketIntelligence,
      clientProfile,
      recommendations
    };
  }

  /**
   * Integrate financial insights with CRM system
   */
  private async integratWithCRM(
    fiboEntities: any[],
    insights: FinancialInsights,
    context: FinancialEntityContext
  ): Promise<{
    contactUpdates: any[];
    knowledgeElements: any[];
    activities: any[];
    relationships: any[];
  }> {
    const contactUpdates: any[] = [];
    const knowledgeElements: any[] = [];
    const activities: any[] = [];
    const relationships: any[] = [];

    // Update contact with financial profile
    if (context.contactId) {
      try {
        const contact = await this.contactRepository.findById(context.contactId);
        if (contact) {
          // Update contact with financial insights
          const financialProfile = {
            portfolioValue: insights.portfolioAnalysis.totalValue,
            riskProfile: insights.portfolioAnalysis.riskProfile.score,
            clientSegment: context.clientSegment,
            investmentPreferences: insights.clientProfile.investmentPreferences,
            complianceStatus: insights.clientProfile.complianceStatus,
            relationshipValue: insights.clientProfile.relationshipValue,
            lastFinancialUpdate: new Date().toISOString()
          };

          contact.updatePreferences('financial_profile', financialProfile);
          await this.contactRepository.save(contact);
          
          contactUpdates.push({
            contactId: context.contactId,
            updates: financialProfile
          });
        }
      } catch (error) {
        console.warn('Failed to update contact with financial profile:', error);
      }
    }

    // Create knowledge elements
    for (const category of ['portfolio', 'transactions', 'market_intelligence']) {
      const knowledgeElement = this.createKnowledgeElement(context, this.getInsightsByCategory(insights, category));
      knowledgeElements.push(knowledgeElement);
    }

    // Create activities
    const analysisActivity = this.createActivity(context, insights);
    activities.push(analysisActivity);

    // Create relationships between entities
    for (let i = 0; i < fiboEntities.length - 1; i++) {
      for (let j = i + 1; j < fiboEntities.length; j++) {
        const entity1 = fiboEntities[i];
        const entity2 = fiboEntities[j];
        
        const relationshipType = this.inferRelationshipType(entity1, entity2);
        if (relationshipType) {
          const relationship = {
            id: `financial_rel_${Date.now()}_${i}_${j}`,
            type: relationshipType,
            source: entity1.id,
            target: entity2.id,
            confidence: 0.7,
            metadata: {
              inferredFrom: 'financial_analysis',
              context: context
            }
          };

          this.ontology.addRelationship(relationship.id, relationship.type, relationship);
          relationships.push(relationship);
        }
      }
    }

    return {
      contactUpdates,
      knowledgeElements,
      activities,
      relationships
    };
  }

  // Helper methods for financial analysis
  private extractAmount(value: string): number | null {
    const match = value.match(/[\d,]+(?:\.\d{2})?/);
    return match ? parseFloat(match[0].replace(/,/g, '')) : null;
  }

  private extractCurrency(value: string): string | null {
    const currencyMatch = value.match(/([A-Z]{3})|([€$£¥₹])/);
    if (currencyMatch) {
      return currencyMatch[1] || this.symbolToCurrency(currencyMatch[2]);
    }
    return null;
  }

  private symbolToCurrency(symbol: string): string {
    const mapping: Record<string, string> = {
      '$': 'USD',
      '€': 'EUR',
      '£': 'GBP',
      '¥': 'JPY',
      '₹': 'INR'
    };
    return mapping[symbol] || 'USD';
  }

  private inferTransactionType(context: FinancialEntityContext, extractionResult: ExtensionEntityExtractionResult): FIBOTransactionType {
    const text = extractionResult.metadata.textLength ? 'content analysis' : '';
    
    if (context.businessContext === 'TRADING') return FIBOTransactionType.BUY;
    if (context.businessContext === 'LENDING') return FIBOTransactionType.PAYMENT;
    
    // Analyze content for transaction type indicators
    return FIBOTransactionType.TRANSFER; // Default
  }

  private calculateTotalPortfolioValue(instruments: any[], marketData: any[]): number {
    return instruments.reduce((total, instrument) => {
      const value = instrument.marketValue || 0;
      return total + value;
    }, 0);
  }

  private calculatePortfolioRisk(instruments: any[]): { score: number; distribution: Record<string, number> } {
    const riskScores = instruments.map(i => i.calculateRisk?.()?.score || 0.5);
    const averageRisk = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;
    
    const distribution: Record<string, number> = {};
    instruments.forEach(instrument => {
      const risk = instrument.calculateRisk?.()?.category || 'MEDIUM';
      distribution[risk] = (distribution[risk] || 0) + 1;
    });

    return {
      score: averageRisk,
      distribution
    };
  }

  private analyzeDiversification(instruments: any[]): {
    byType: Record<string, number>;
    byCurrency: Record<string, number>;
    byRegion: Record<string, number>;
  } {
    const byType: Record<string, number> = {};
    const byCurrency: Record<string, number> = {};
    const byRegion: Record<string, number> = {};

    instruments.forEach(instrument => {
      // By type
      const type = instrument.instrumentType || 'UNKNOWN';
      byType[type] = (byType[type] || 0) + 1;

      // By currency
      const currency = instrument.currency || 'USD';
      byCurrency[currency] = (byCurrency[currency] || 0) + 1;

      // By region (simplified)
      const region = this.inferRegionFromCurrency(currency);
      byRegion[region] = (byRegion[region] || 0) + 1;
    });

    return { byType, byCurrency, byRegion };
  }

  private inferRegionFromCurrency(currency: string): string {
    const regionMapping: Record<string, string> = {
      'USD': 'North America',
      'EUR': 'Europe',
      'GBP': 'Europe',
      'JPY': 'Asia',
      'CNY': 'Asia',
      'INR': 'Asia'
    };
    return regionMapping[currency] || 'Other';
  }

  private identifyTransactionPatterns(transactions: any[]): string[] {
    const patterns: string[] = [];
    
    if (transactions.length > 5) {
      patterns.push('High transaction volume');
    }
    
    const amounts = transactions.map(t => t.amount || 0);
    const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    
    if (avgAmount > 100000) {
      patterns.push('Large transaction amounts');
    }
    
    return patterns;
  }

  private generateComplianceAlerts(transactions: any[]): string[] {
    const alerts: string[] = [];
    
    transactions.forEach(transaction => {
      if (transaction.amount > 10000) {
        alerts.push(`Large transaction requiring reporting: ${transaction.id}`);
      }
      
      if (transaction.transactionType === FIBOTransactionType.DERIVATIVE_TRADE) {
        alerts.push(`Derivative trade requiring enhanced monitoring: ${transaction.id}`);
      }
    });
    
    return alerts;
  }

  private identifyMarketTrends(marketData: any[]): string[] {
    // Simplified trend analysis
    return ['Market analysis requires more historical data'];
  }

  private generateMarketAlerts(marketData: any[], instruments: any[]): string[] {
    const alerts: string[] = [];
    
    marketData.forEach(data => {
      if (data.isStale && data.isStale(30)) {
        alerts.push(`Stale market data for ${data.instrumentId}`);
      }
    });
    
    return alerts;
  }

  private inferInvestmentPreferences(instruments: any[], context: FinancialEntityContext): string[] {
    const preferences: string[] = [];
    
    const instrumentTypes = instruments.map(i => i.instrumentType);
    
    if (instrumentTypes.includes(FIBOInstrumentType.EQUITY)) {
      preferences.push('Equity investments');
    }
    
    if (instrumentTypes.includes(FIBOInstrumentType.BOND)) {
      preferences.push('Fixed income');
    }
    
    return preferences;
  }

  private assessClientRisk(transactions: any[], instruments: any[], context: FinancialEntityContext): string {
    const portfolioRisk = this.calculatePortfolioRisk(instruments).score;
    
    if (portfolioRisk < 0.3) return 'Conservative';
    if (portfolioRisk < 0.7) return 'Moderate';
    return 'Aggressive';
  }

  private assessComplianceStatus(transactions: any[], context: FinancialEntityContext): string {
    const alerts = this.generateComplianceAlerts(transactions);
    return alerts.length === 0 ? 'Compliant' : 'Requires Review';
  }

  private calculateRelationshipValue(transactions: any[], instruments: any[]): number {
    const transactionValue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const portfolioValue = instruments.reduce((sum, i) => sum + (i.marketValue || 0), 0);
    
    return transactionValue + portfolioValue;
  }

  private generateImmediateRecommendations(portfolioAnalysis: any, transactionAnalysis: any): string[] {
    const recommendations: string[] = [];
    
    if (transactionAnalysis.complianceAlerts.length > 0) {
      recommendations.push('Review compliance alerts immediately');
    }
    
    if (portfolioAnalysis.riskProfile.score > 0.8) {
      recommendations.push('Consider risk mitigation strategies');
    }
    
    return recommendations;
  }

  private generateStrategicRecommendations(portfolioAnalysis: any, clientProfile: any): string[] {
    const recommendations: string[] = [];
    
    if (portfolioAnalysis.totalValue > 1000000) {
      recommendations.push('Consider private banking services');
    }
    
    return recommendations;
  }

  private generateComplianceRecommendations(transactionAnalysis: any, clientProfile: any): string[] {
    const recommendations: string[] = [];
    
    if (transactionAnalysis.totalValue > 100000) {
      recommendations.push('Ensure AML compliance documentation is current');
    }
    
    return recommendations;
  }

  private getInsightsByCategory(insights: FinancialInsights, category: string): any {
    switch (category) {
      case 'portfolio':
        return insights.portfolioAnalysis;
      case 'transactions':
        return insights.transactionAnalysis;
      case 'market_intelligence':
        return insights.marketIntelligence;
      default:
        return {};
    }
  }

  private inferRelationshipType(entity1: any, entity2: any): string | null {
    if (entity1 instanceof FIBOFinancialInstrument && entity2 instanceof FIBOFinancialInstitution) {
      return 'INSTRUMENT_ISSUER';
    }
    
    if (entity1 instanceof FIBOTransaction && entity2 instanceof FIBOFinancialInstrument) {
      return 'TRANSACTION_INSTRUMENT';
    }
    
    return null;
  }

  private createKnowledgeElement(context: FinancialEntityContext, analysis: any): InformationElement {
    const knowledgeElement = createInformationElement({
        title: `Financial Analysis for ${context.contactId}`,
        type: KnowledgeType.FINANCIAL_ANALYSIS,
        content: analysis,
        reliability: 0.9,
        source: 'FinancialEntityIntegrationService',
        relatedEntities: [context.contactId || '']
    });
    this.ontology.addEntity(knowledgeElement);
    return knowledgeElement;
  }

  private createActivity(context: FinancialEntityContext, analysis: any): void {
    const activity: CRMActivity = {
        id: `activity-${Date.now()}`,
        category: 'PERDURANT',
        type: ActivityType.FINANCIAL_TRANSACTION,
        name: 'Process Financial Content',
        description: `Processed financial content for contact ${context.contactId}`,
        participants: [context.contactId || ''],
        status: 'completed',
        success: true,
        context: analysis,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    this.ontology.addEntity(activity);
  }
} 