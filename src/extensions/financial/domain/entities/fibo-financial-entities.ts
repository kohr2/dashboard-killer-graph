// FIBO (Financial Industry Business Ontology) Entities
// Integration with O-CREAM-v2 for financial CRM functionality

import { DOLCECategory, DOLCEEntity } from '../../../crm-core/domain/ontology/o-cream-v2';

// FIBO Financial Instrument Entity
export class FIBOFinancialInstrument implements DOLCEEntity {
  public readonly id: string;
  public readonly dolceCategory: DOLCECategory = DOLCECategory.ABSTRACT;
  
  constructor(
    public readonly instrumentType: FIBOInstrumentType,
    public readonly identifier: string,
    public readonly name: string,
    public readonly currency: string,
    public readonly marketValue?: number,
    public readonly issuer?: string,
    public readonly maturityDate?: Date,
    public readonly metadata?: Record<string, any>
  ) {
    this.id = `fibo_instrument_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getOntologicalType(): string {
    return 'FIBO_FINANCIAL_INSTRUMENT';
  }

  public getProperties(): Record<string, any> {
    return {
      instrumentType: this.instrumentType,
      identifier: this.identifier,
      name: this.name,
      currency: this.currency,
      marketValue: this.marketValue,
      issuer: this.issuer,
      maturityDate: this.maturityDate,
      metadata: this.metadata
    };
  }

  public validate(): boolean {
    return !!(this.instrumentType && this.identifier && this.name && this.currency);
  }

  // FIBO-specific methods
  public calculateRisk(): FIBORiskProfile {
    // Simplified risk calculation based on instrument type
    const riskMapping: Record<FIBOInstrumentType, number> = {
      [FIBOInstrumentType.EQUITY]: 0.7,
      [FIBOInstrumentType.BOND]: 0.3,
      [FIBOInstrumentType.DERIVATIVE]: 0.9,
      [FIBOInstrumentType.CURRENCY]: 0.5,
      [FIBOInstrumentType.COMMODITY]: 0.6,
      [FIBOInstrumentType.FUND]: 0.4
    };

    return {
      score: riskMapping[this.instrumentType] || 0.5,
      category: this.getRiskCategory(riskMapping[this.instrumentType] || 0.5),
      factors: this.getRiskFactors()
    };
  }

  private getRiskCategory(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (score < 0.4) return 'LOW';
    if (score < 0.7) return 'MEDIUM';
    return 'HIGH';
  }

  private getRiskFactors(): string[] {
    const factors: string[] = [];
    
    if (this.instrumentType === FIBOInstrumentType.DERIVATIVE) {
      factors.push('Derivative instrument - high volatility');
    }
    
    if (this.maturityDate && this.maturityDate < new Date()) {
      factors.push('Matured instrument');
    }
    
    return factors;
  }
}

// FIBO Financial Institution Entity
export class FIBOFinancialInstitution implements DOLCEEntity {
  public readonly id: string;
  public readonly dolceCategory: DOLCECategory = DOLCECategory.AGENTIVE_PHYSICAL_OBJECT;
  
  constructor(
    public readonly institutionType: FIBOInstitutionType,
    public readonly name: string,
    public readonly legalEntityIdentifier?: string, // LEI
    public readonly regulatoryIds?: Record<string, string>,
    public readonly jurisdiction?: string,
    public readonly services?: string[],
    public readonly metadata?: Record<string, any>
  ) {
    this.id = `fibo_institution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getOntologicalType(): string {
    return 'FIBO_FINANCIAL_INSTITUTION';
  }

  public getProperties(): Record<string, any> {
    return {
      institutionType: this.institutionType,
      name: this.name,
      legalEntityIdentifier: this.legalEntityIdentifier,
      regulatoryIds: this.regulatoryIds,
      jurisdiction: this.jurisdiction,
      services: this.services,
      metadata: this.metadata
    };
  }

  public validate(): boolean {
    return !!(this.institutionType && this.name);
  }

  // FIBO-specific methods
  public getComplianceRequirements(): string[] {
    const requirements: string[] = [];
    
    switch (this.institutionType) {
      case FIBOInstitutionType.BANK:
        requirements.push('Basel III compliance', 'FDIC insurance', 'Capital adequacy');
        break;
      case FIBOInstitutionType.INVESTMENT_FIRM:
        requirements.push('SEC registration', 'FINRA membership', 'Investment advisor registration');
        break;
      case FIBOInstitutionType.INSURANCE_COMPANY:
        requirements.push('State insurance license', 'Solvency requirements', 'Reserve requirements');
        break;
    }
    
    return requirements;
  }
}

// FIBO Market Data Entity
export class FIBOMarketData implements DOLCEEntity {
  public readonly id: string;
  public readonly dolceCategory: DOLCECategory = DOLCECategory.ABSTRACT;
  
  constructor(
    public readonly instrumentId: string,
    public readonly dataType: FIBOMarketDataType,
    public readonly value: number,
    public readonly timestamp: Date,
    public readonly source: string,
    public readonly currency?: string,
    public readonly metadata?: Record<string, any>
  ) {
    this.id = `fibo_market_data_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getOntologicalType(): string {
    return 'FIBO_MARKET_DATA';
  }

  public getProperties(): Record<string, any> {
    return {
      instrumentId: this.instrumentId,
      dataType: this.dataType,
      value: this.value,
      timestamp: this.timestamp,
      source: this.source,
      currency: this.currency,
      metadata: this.metadata
    };
  }

  public validate(): boolean {
    return !!(this.instrumentId && this.dataType && this.value && this.timestamp && this.source);
  }

  // FIBO-specific methods
  public isStale(maxAgeMinutes: number = 15): boolean {
    const ageMinutes = (Date.now() - this.timestamp.getTime()) / (1000 * 60);
    return ageMinutes > maxAgeMinutes;
  }

  public getVolatility(historicalData: FIBOMarketData[]): number {
    if (historicalData.length < 2) return 0;
    
    const values = historicalData.map(d => d.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }
}

// FIBO Transaction Entity
export class FIBOTransaction implements DOLCEEntity {
  public readonly id: string;
  public readonly dolceCategory: DOLCECategory = DOLCECategory.PERDURANT;
  
  constructor(
    public readonly transactionType: FIBOTransactionType,
    public readonly amount: number,
    public readonly currency: string,
    public readonly fromParty: string,
    public readonly toParty: string,
    public readonly instrumentId?: string,
    public readonly executionDate?: Date,
    public readonly settlementDate?: Date,
    public readonly fees?: number,
    public readonly metadata?: Record<string, any>
  ) {
    this.id = `fibo_transaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getOntologicalType(): string {
    return 'FIBO_TRANSACTION';
  }

  public getProperties(): Record<string, any> {
    return {
      transactionType: this.transactionType,
      amount: this.amount,
      currency: this.currency,
      fromParty: this.fromParty,
      toParty: this.toParty,
      instrumentId: this.instrumentId,
      executionDate: this.executionDate,
      settlementDate: this.settlementDate,
      fees: this.fees,
      metadata: this.metadata
    };
  }

  public validate(): boolean {
    return !!(this.transactionType && this.amount && this.currency && this.fromParty && this.toParty);
  }

  // FIBO-specific methods
  public calculateNetAmount(): number {
    return this.amount - (this.fees || 0);
  }

  public isSettled(): boolean {
    if (!this.settlementDate) return false;
    return this.settlementDate <= new Date();
  }

  public getRegulatorySummary(): FIBORegulatorySummary {
    return {
      transactionId: this.id,
      type: this.transactionType,
      amount: this.amount,
      currency: this.currency,
      parties: [this.fromParty, this.toParty],
      reportingRequired: this.isReportingRequired(),
      complianceFlags: this.getComplianceFlags()
    };
  }

  private isReportingRequired(): boolean {
    // Simplified logic - typically based on amount thresholds and transaction types
    return this.amount > 10000 || this.transactionType === FIBOTransactionType.DERIVATIVE_TRADE;
  }

  private getComplianceFlags(): string[] {
    const flags: string[] = [];
    
    if (this.amount > 50000) {
      flags.push('LARGE_TRANSACTION');
    }
    
    if (this.transactionType === FIBOTransactionType.DERIVATIVE_TRADE) {
      flags.push('DERIVATIVE_REPORTING');
    }
    
    return flags;
  }
}

// FIBO Enums and Types
export enum FIBOInstrumentType {
  EQUITY = 'EQUITY',
  BOND = 'BOND',
  DERIVATIVE = 'DERIVATIVE',
  CURRENCY = 'CURRENCY',
  COMMODITY = 'COMMODITY',
  FUND = 'FUND'
}

export enum FIBOInstitutionType {
  BANK = 'BANK',
  INVESTMENT_FIRM = 'INVESTMENT_FIRM',
  INSURANCE_COMPANY = 'INSURANCE_COMPANY',
  PENSION_FUND = 'PENSION_FUND',
  HEDGE_FUND = 'HEDGE_FUND',
  MUTUAL_FUND = 'MUTUAL_FUND'
}

export enum FIBOMarketDataType {
  PRICE = 'PRICE',
  VOLUME = 'VOLUME',
  BID = 'BID',
  ASK = 'ASK',
  SPREAD = 'SPREAD',
  VOLATILITY = 'VOLATILITY'
}

export enum FIBOTransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
  TRANSFER = 'TRANSFER',
  DERIVATIVE_TRADE = 'DERIVATIVE_TRADE',
  CURRENCY_EXCHANGE = 'CURRENCY_EXCHANGE',
  PAYMENT = 'PAYMENT'
}

// FIBO Interfaces
export interface FIBORiskProfile {
  score: number; // 0-1
  category: 'LOW' | 'MEDIUM' | 'HIGH';
  factors: string[];
}

export interface FIBORegulatorySummary {
  transactionId: string;
  type: FIBOTransactionType;
  amount: number;
  currency: string;
  parties: string[];
  reportingRequired: boolean;
  complianceFlags: string[];
}

// FIBO Entity Factory
export class FIBOEntityFactory {
  static createFromExtractedEntity(extractedEntity: any, entityType: string): DOLCEEntity | null {
    switch (entityType) {
      case 'FIBO_SECURITY':
        return new FIBOFinancialInstrument(
          FIBOInstrumentType.EQUITY,
          extractedEntity.value,
          extractedEntity.value,
          'USD', // Default currency
          undefined,
          undefined,
          undefined,
          { extractedFrom: extractedEntity.context }
        );
      
      case 'FIBO_FINANCIAL_INSTITUTION':
        return new FIBOFinancialInstitution(
          FIBOInstitutionType.BANK, // Default type
          extractedEntity.value,
          undefined,
          undefined,
          undefined,
          undefined,
          { extractedFrom: extractedEntity.context }
        );
      
      case 'FIBO_CURRENCY':
        // Extract currency and amount from the entity value
        const currencyMatch = extractedEntity.value.match(/([A-Z]{3})\s*([\d,]+(?:\.\d{2})?)/);
        if (currencyMatch) {
          return new FIBOMarketData(
            'unknown_instrument',
            FIBOMarketDataType.PRICE,
            parseFloat(currencyMatch[2].replace(/,/g, '')),
            new Date(),
            'entity_extraction',
            currencyMatch[1],
            { extractedFrom: extractedEntity.context }
          );
        }
        break;
      
      default:
        return null;
    }
    
    return null;
  }
} 