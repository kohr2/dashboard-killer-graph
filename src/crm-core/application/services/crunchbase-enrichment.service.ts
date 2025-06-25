import axios from 'axios';

const CRUNCHBASE_API_BASE_URL = 'https://api.crunchbase.com/api/v4';

// Defines the structure of the data we want after enrichment.
export interface EnrichedOrganization {
  name: string;
  description?: string;
  foundedYear?: number;
  employeeCount?: string;
  website?: string;
  totalFunding?: number;
}

export class CrunchbaseEnrichmentService {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Crunchbase API key is required.');
    }
    this.apiKey = apiKey;
  }

  public async enrichOrganization(name: string): Promise<EnrichedOrganization | null> {
    const searchUrl = `${CRUNCHBASE_API_BASE_URL}/entities/organizations/${name}?card_uuids=raised_total`;

    try {
      const response = await axios.get(searchUrl, {
        headers: {
          'X-cb-user-key': this.apiKey,
          'Accept': 'application/json',
        },
      });

      const apiData = response.data.data;
      const properties = apiData.properties;
      const cards = apiData.cards;

      const foundedOn = properties.founded_on?.value;

      return {
        name: name,
        description: properties.short_description,
        foundedYear: foundedOn ? new Date(foundedOn).getUTCFullYear() : undefined,
        employeeCount: `${properties.num_employees_min}-${properties.num_employees_max}`,
        website: properties.website_url,
        totalFunding: cards.raised_total?.total_funding_usd,
      };

    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        // The organization was not found, which is a valid, expected scenario.
        return null;
      }
      // For any other error (e.g., network issue, 500 server error), throw a generic exception.
      throw new Error('Failed to fetch data from Crunchbase API');
    }
  }
} 