import { injectable } from 'tsyringe';
import { InvestorDTO } from '@generated/financial/generated/InvestorDTO';
import { DealDTO } from '@generated/financial/generated/DealDTO';

/**
 * Provides mapping between Financial and CRM domain concepts by adding labels.
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

  // The previous, more complex logic was removed because financial entities
  // do not contain the necessary properties (like name or email) to create
  // full-fledged CRM entities. This simpler, label-based approach is more robust.
} 