"use strict";
// Financial Entity Integration Service
// Bridges entity extraction with FIBO ontology and core CRM functionality
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialEntityIntegrationService = void 0;
const extensible_entity_extraction_service_1 = require("../../../crm-core/application/services/extensible-entity-extraction.service");
const o_cream_v2_1 = require("../../../crm-core/domain/ontology/o-cream-v2");
const fibo_financial_entities_1 = require("../domain/entities/fibo-financial-entities");
class FinancialEntityIntegrationService {
    constructor(contactRepository) {
        this.entityExtractor = new extensible_entity_extraction_service_1.ExtensibleEntityExtractionService();
        this.contactRepository = contactRepository;
        this.ontology = o_cream_v2_1.OCreamV2Ontology.getInstance();
        this.fiboEntities = new Map();
    }
    /**
     * Process financial content and integrate with CRM
     */
    async processFinancialContent(content, context) {
        // Extract entities with financial extension enabled
        const extractionResult = await this.entityExtractor.extractEntitiesWithExtensions(content, {
            enabledExtensions: ['financial'],
            coreModel: 'en_core_web_lg',
            includeValidation: true,
            contextMetadata: context
        });
        // Convert extracted entities to FIBO entities
        const fiboEntities = await this.createFIBOEntities(extractionResult, context);
        // Generate financial insights
        const insights = await this.generateFinancialInsights(fiboEntities, extractionResult, context);
        // Integrate with CRM
        const crmIntegration = await this.integratWithCRM(fiboEntities, insights, context);
        return {
            extractionResult,
            fiboEntities,
            insights,
            crmIntegration
        };
    }
    /**
     * Create FIBO entities from extracted entities
     */
    async createFIBOEntities(extractionResult, context) {
        const fiboEntities = [];
        // Process financial entities
        const financialEntities = extractionResult.extensionResults.financial || [];
        for (const entity of financialEntities) {
            try {
                const fiboEntity = fibo_financial_entities_1.FIBOEntityFactory.createFromExtractedEntity(entity, entity.type);
                if (fiboEntity) {
                    // Register with ontology
                    this.ontology.addEntity(fiboEntity);
                    // Store in local registry
                    this.fiboEntities.set(fiboEntity.id, fiboEntity);
                    fiboEntities.push(fiboEntity);
                    console.log(`✅ Created FIBO entity: ${fiboEntity.getOntologicalType()} - ${entity.value}`);
                }
            }
            catch (error) {
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
    async createSyntheticFIBOEntities(extractionResult, context) {
        const syntheticEntities = [];
        // Detect transaction patterns
        const monetaryEntities = extractionResult.entities.filter(e => e.type === 'MONETARY_AMOUNT' || e.type === 'FIBO_CURRENCY');
        const personEntities = extractionResult.entities.filter(e => e.type === 'PERSON_NAME');
        const organizationEntities = extractionResult.entities.filter(e => e.type === 'COMPANY_NAME' || e.type === 'FIBO_FINANCIAL_INSTITUTION');
        // Create transaction entities when we have amount + parties
        if (monetaryEntities.length > 0 && (personEntities.length > 0 || organizationEntities.length > 0)) {
            for (const monetary of monetaryEntities) {
                const amount = this.extractAmount(monetary.value);
                const currency = this.extractCurrency(monetary.value);
                if (amount && currency) {
                    const transaction = new fibo_financial_entities_1.FIBOTransaction(this.inferTransactionType(context, extractionResult), amount, currency, context.contactId || 'unknown', organizationEntities[0]?.value || personEntities[0]?.value || 'unknown', undefined, // instrumentId
                    new Date(), undefined, // settlementDate
                    undefined, // fees
                    {
                        inferredFrom: 'entity_pattern',
                        context: context,
                        confidence: 0.7
                    });
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
    async generateFinancialInsights(fiboEntities, extractionResult, context) {
        // Separate entities by type
        const instruments = fiboEntities.filter(e => e instanceof fibo_financial_entities_1.FIBOFinancialInstrument);
        const institutions = fiboEntities.filter(e => e instanceof fibo_financial_entities_1.FIBOFinancialInstitution);
        const marketData = fiboEntities.filter(e => e instanceof fibo_financial_entities_1.FIBOMarketData);
        const transactions = fiboEntities.filter(e => e instanceof fibo_financial_entities_1.FIBOTransaction);
        // Portfolio Analysis
        const portfolioAnalysis = {
            totalValue: this.calculateTotalPortfolioValue(instruments, marketData),
            instruments: instruments,
            riskProfile: this.calculatePortfolioRisk(instruments),
            diversification: this.analyzeDiversification(instruments)
        };
        // Transaction Analysis
        const transactionAnalysis = {
            volume: transactions.length,
            totalValue: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
            transactions: transactions,
            patterns: this.identifyTransactionPatterns(transactions),
            complianceAlerts: this.generateComplianceAlerts(transactions)
        };
        // Market Intelligence
        const marketIntelligence = {
            instruments: instruments.map(i => i.name),
            marketData: marketData,
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
    async integratWithCRM(fiboEntities, insights, context) {
        const contactUpdates = [];
        const knowledgeElements = [];
        const activities = [];
        const relationships = [];
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
            }
            catch (error) {
                console.warn('Failed to update contact with financial profile:', error);
            }
        }
        // Create knowledge elements
        for (const category of ['portfolio', 'transactions', 'market_intelligence']) {
            const knowledgeElement = {
                id: `financial_${category}_${Date.now()}`,
                type: o_cream_v2_1.KnowledgeType.BUSINESS_KNOWLEDGE,
                category: 'FINANCIAL',
                data: this.getInsightsByCategory(insights, category),
                confidence: 0.85,
                source: 'financial_entity_extraction',
                createdAt: new Date().toISOString(),
                metadata: {
                    fiboCompliant: true,
                    entityCount: fiboEntities.length,
                    context: context
                }
            };
            this.ontology.addKnowledgeElement(knowledgeElement.id, knowledgeElement.type, knowledgeElement);
            knowledgeElements.push(knowledgeElement);
        }
        // Create activities
        const analysisActivity = {
            id: `financial_analysis_${Date.now()}`,
            type: o_cream_v2_1.ActivityType.DATA_ANALYSIS,
            description: `Financial entity analysis completed - ${fiboEntities.length} FIBO entities processed`,
            timestamp: new Date().toISOString(),
            metadata: {
                entityTypes: [...new Set(fiboEntities.map(e => e.getOntologicalType()))],
                portfolioValue: insights.portfolioAnalysis.totalValue,
                riskScore: insights.portfolioAnalysis.riskProfile.score,
                complianceAlerts: insights.transactionAnalysis.complianceAlerts.length
            }
        };
        this.ontology.addActivity(analysisActivity.id, analysisActivity.type, analysisActivity);
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
    extractAmount(value) {
        const match = value.match(/[\d,]+(?:\.\d{2})?/);
        return match ? parseFloat(match[0].replace(/,/g, '')) : null;
    }
    extractCurrency(value) {
        const currencyMatch = value.match(/([A-Z]{3})|([€$£¥₹])/);
        if (currencyMatch) {
            return currencyMatch[1] || this.symbolToCurrency(currencyMatch[2]);
        }
        return null;
    }
    symbolToCurrency(symbol) {
        const mapping = {
            '$': 'USD',
            '€': 'EUR',
            '£': 'GBP',
            '¥': 'JPY',
            '₹': 'INR'
        };
        return mapping[symbol] || 'USD';
    }
    inferTransactionType(context, extractionResult) {
        const text = extractionResult.metadata.textLength ? 'content analysis' : '';
        if (context.businessContext === 'TRADING')
            return fibo_financial_entities_1.FIBOTransactionType.BUY;
        if (context.businessContext === 'LENDING')
            return fibo_financial_entities_1.FIBOTransactionType.PAYMENT;
        // Analyze content for transaction type indicators
        return fibo_financial_entities_1.FIBOTransactionType.TRANSFER; // Default
    }
    calculateTotalPortfolioValue(instruments, marketData) {
        return instruments.reduce((total, instrument) => {
            const value = instrument.marketValue || 0;
            return total + value;
        }, 0);
    }
    calculatePortfolioRisk(instruments) {
        const riskScores = instruments.map(i => i.calculateRisk?.()?.score || 0.5);
        const averageRisk = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;
        const distribution = {};
        instruments.forEach(instrument => {
            const risk = instrument.calculateRisk?.()?.category || 'MEDIUM';
            distribution[risk] = (distribution[risk] || 0) + 1;
        });
        return {
            score: averageRisk,
            distribution
        };
    }
    analyzeDiversification(instruments) {
        const byType = {};
        const byCurrency = {};
        const byRegion = {};
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
    inferRegionFromCurrency(currency) {
        const regionMapping = {
            'USD': 'North America',
            'EUR': 'Europe',
            'GBP': 'Europe',
            'JPY': 'Asia',
            'CNY': 'Asia',
            'INR': 'Asia'
        };
        return regionMapping[currency] || 'Other';
    }
    identifyTransactionPatterns(transactions) {
        const patterns = [];
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
    generateComplianceAlerts(transactions) {
        const alerts = [];
        transactions.forEach(transaction => {
            if (transaction.amount > 10000) {
                alerts.push(`Large transaction requiring reporting: ${transaction.id}`);
            }
            if (transaction.transactionType === fibo_financial_entities_1.FIBOTransactionType.DERIVATIVE_TRADE) {
                alerts.push(`Derivative trade requiring enhanced monitoring: ${transaction.id}`);
            }
        });
        return alerts;
    }
    identifyMarketTrends(marketData) {
        // Simplified trend analysis
        return ['Market analysis requires more historical data'];
    }
    generateMarketAlerts(marketData, instruments) {
        const alerts = [];
        marketData.forEach(data => {
            if (data.isStale && data.isStale(30)) {
                alerts.push(`Stale market data for ${data.instrumentId}`);
            }
        });
        return alerts;
    }
    inferInvestmentPreferences(instruments, context) {
        const preferences = [];
        const instrumentTypes = instruments.map(i => i.instrumentType);
        if (instrumentTypes.includes(fibo_financial_entities_1.FIBOInstrumentType.EQUITY)) {
            preferences.push('Equity investments');
        }
        if (instrumentTypes.includes(fibo_financial_entities_1.FIBOInstrumentType.BOND)) {
            preferences.push('Fixed income');
        }
        return preferences;
    }
    assessClientRisk(transactions, instruments, context) {
        const portfolioRisk = this.calculatePortfolioRisk(instruments).score;
        if (portfolioRisk < 0.3)
            return 'Conservative';
        if (portfolioRisk < 0.7)
            return 'Moderate';
        return 'Aggressive';
    }
    assessComplianceStatus(transactions, context) {
        const alerts = this.generateComplianceAlerts(transactions);
        return alerts.length === 0 ? 'Compliant' : 'Requires Review';
    }
    calculateRelationshipValue(transactions, instruments) {
        const transactionValue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const portfolioValue = instruments.reduce((sum, i) => sum + (i.marketValue || 0), 0);
        return transactionValue + portfolioValue;
    }
    generateImmediateRecommendations(portfolioAnalysis, transactionAnalysis) {
        const recommendations = [];
        if (transactionAnalysis.complianceAlerts.length > 0) {
            recommendations.push('Review compliance alerts immediately');
        }
        if (portfolioAnalysis.riskProfile.score > 0.8) {
            recommendations.push('Consider risk mitigation strategies');
        }
        return recommendations;
    }
    generateStrategicRecommendations(portfolioAnalysis, clientProfile) {
        const recommendations = [];
        if (portfolioAnalysis.totalValue > 1000000) {
            recommendations.push('Consider private banking services');
        }
        return recommendations;
    }
    generateComplianceRecommendations(transactionAnalysis, clientProfile) {
        const recommendations = [];
        if (transactionAnalysis.totalValue > 100000) {
            recommendations.push('Ensure AML compliance documentation is current');
        }
        return recommendations;
    }
    getInsightsByCategory(insights, category) {
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
    inferRelationshipType(entity1, entity2) {
        if (entity1 instanceof fibo_financial_entities_1.FIBOFinancialInstrument && entity2 instanceof fibo_financial_entities_1.FIBOFinancialInstitution) {
            return 'INSTRUMENT_ISSUER';
        }
        if (entity1 instanceof fibo_financial_entities_1.FIBOTransaction && entity2 instanceof fibo_financial_entities_1.FIBOFinancialInstrument) {
            return 'TRANSACTION_INSTRUMENT';
        }
        return null;
    }
}
exports.FinancialEntityIntegrationService = FinancialEntityIntegrationService;
//# sourceMappingURL=financial-entity-integration.service.js.map