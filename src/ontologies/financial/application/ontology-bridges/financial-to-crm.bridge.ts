import { singleton } from 'tsyringe';
import { ContactOntology, OCreamContactEntity } from '@crm/domain/entities/contact-ontology';
import { Investor } from '@financial/domain/entities/investor';

/**
 * Provides mapping between Financial and CRM domain concepts.
 */
@singleton()
export class FinancialToCrmBridge {
  private typeMappings: Record<string, string[]> = {
    Investor: ['Organization'],
    Sponsor: ['Organization'],
    TargetCompany: ['Organization'],
    Fund: ['Organization'],
  };

  /**
   * Maps a financial entity type to its corresponding CRM-level labels.
   * For example, an "Investor" is also an "Organization".
   * @param entityType The financial entity type (e.g., "Investor").
   * @returns An array of additional CRM labels, or an empty array if no mapping exists.
   */
  public mapEntityTypeToCrmLabels(entityType: string): string[] {
    return this.typeMappings[entityType] || [];
  }

  /**
   * Maps a Financial Investor to a CRM Contact.
   * @param investor The financial investor entity.
   * @returns A CRM contact entity.
   */
  public static investorToContact(investor: Investor): OCreamContactEntity {
    // This is a simplified mapping. In a real scenario, we might need
    // to fetch related entities (like a Sponsor) to get a proper name.
    const name = `Investor ${investor.id}`;
    const [firstName, ...lastName] = name.split(' ');

    return ContactOntology.createOCreamContact({
      id: investor.id, // Re-use the ID for consistency
      firstName: firstName || 'Unknown',
      lastName: lastName.join(' ') || 'Investor',
      email: `${name.replace(' ', '.')}@example.com`, // Dummy email
    });
  }

  // Other mappings can be added here, e.g., for Organizations, Deals, etc.
} 