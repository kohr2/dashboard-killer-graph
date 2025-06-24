import { ExtensionEntityExtractionResult } from '../../../crm-core/application/services/extensible-entity-extraction.service';
import { ContactRepository } from '../../../crm-core/domain/repositories/contact-repository';
import { FIBOFinancialInstrument, FIBOMarketData, FIBOTransaction } from '../domain/entities/fibo-financial-entities';
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
export declare class FinancialEntityIntegrationService {
    private entityExtractor;
    private contactRepository;
    private ontology;
    private fiboEntities;
    constructor(contactRepository: ContactRepository);
    /**
     * Process financial content and integrate with CRM
     */
    processFinancialContent(content: string, context: FinancialEntityContext): Promise<{
        extractionResult: ExtensionEntityExtractionResult;
        fiboEntities: any[];
        insights: FinancialInsights;
        crmIntegration: {
            contactUpdates: any[];
            knowledgeElements: any[];
            activities: any[];
            relationships: any[];
        };
    }>;
    /**
     * Create FIBO entities from extracted entities
     */
    private createFIBOEntities;
    /**
     * Create synthetic FIBO entities based on entity patterns and context
     */
    private createSyntheticFIBOEntities;
    /**
     * Generate comprehensive financial insights
     */
    private generateFinancialInsights;
    /**
     * Integrate financial insights with CRM system
     */
    private integratWithCRM;
    private extractAmount;
    private extractCurrency;
    private symbolToCurrency;
    private inferTransactionType;
    private calculateTotalPortfolioValue;
    private calculatePortfolioRisk;
    private analyzeDiversification;
    private inferRegionFromCurrency;
    private identifyTransactionPatterns;
    private generateComplianceAlerts;
    private identifyMarketTrends;
    private generateMarketAlerts;
    private inferInvestmentPreferences;
    private assessClientRisk;
    private assessComplianceStatus;
    private calculateRelationshipValue;
    private generateImmediateRecommendations;
    private generateStrategicRecommendations;
    private generateComplianceRecommendations;
    private getInsightsByCategory;
    private inferRelationshipType;
}
//# sourceMappingURL=financial-entity-integration.service.d.ts.map