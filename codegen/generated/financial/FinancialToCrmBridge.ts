import { injectable } from 'tsyringe';
import { InvestorDTO } from './Investor.dto';
import { DealDTO } from './Deal.dto';

/**
 * Provides mapping between Financial and CRM domain concepts by adding labels.
 * This bridge enables cross-ontology entity linking and labeling.
 */
@injectable()
export class FinancialToCrmBridge {
  private readonly typeMappings: Record<string, string[]> = {
    Investor: ['Organization', 'FinancialActor'],
    Sponsor: ['Organization', 'FinancialActor'],
    TargetCompany: ['Organization'],
    Fund: ['Organization', 'FinancialProduct'],
    Deal: ['FinancialEvent'],
  };

  /**
   * Gets additional CRM-related labels for a given financial entity type.
   * For example, an "Investor" can also be labeled as an "Organization".
   *
   * @param entityType The financial entity type (e.g., "Investor", "Deal").
   * @returns An array of additional CRM labels. Returns an empty array if no mapping exists.
   */
  public getCrmLabelsForFinancialType(entityType: string): string[] {
    return this.typeMappings[entityType] || [];
  }

  /**
   * Maps a financial entity to its corresponding CRM entity type.
   * This enables cross-ontology entity resolution and linking.
   *
   * @param financialEntity The financial entity to map
   * @returns The corresponding CRM entity type or null if no mapping exists
   */
  public mapFinancialToCrmType(financialEntity: any): string | null {
    const entityType = financialEntity.type || financialEntity.constructor?.name;
    const crmLabels = this.getCrmLabelsForFinancialType(entityType);
    return crmLabels.length > 0 ? crmLabels[0] : null;
  }
}
