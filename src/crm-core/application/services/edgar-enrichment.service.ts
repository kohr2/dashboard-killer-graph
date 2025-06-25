import axios from 'axios';

// URL for the SEC's CIK lookup data
const CIK_LOOKUP_URL = 'https://www.sec.gov/files/company_tickers.json';
// Base URL for company submissions data
const COMPANY_DATA_URL_BASE = 'https://data.sec.gov/submissions/';

// Defines the structure of the data we want after enrichment
export interface EnrichedEdgarData {
  name: string;
  cik: string;
  sic: string;
  sicDescription: string;
  address: {
    street1: string;
    city: string;
    stateOrCountry: string;
    zipCode: string;
  };
}

// CIK Lookup data structure
interface CikData {
  cik_str: number;
  ticker: string;
  title: string;
}

export class EdgarEnrichmentService {
  private userAgent: string;
  private cikMap: Map<string, number> | null = null;

  constructor(userAgent: string) {
    if (!userAgent) {
      throw new Error('A User-Agent string is required for the SEC EDGAR API.');
    }
    this.userAgent = userAgent;
  }
  
  private async initializeCikMap(): Promise<void> {
    if (this.cikMap) return;

    try {
      const response = await axios.get<{ [key: string]: CikData }>(CIK_LOOKUP_URL, {
        headers: { 'User-Agent': this.userAgent },
      });
      
      const newMap = new Map<string, number>();
      // The SEC data is a JSON object with numeric keys, not an array.
      Object.values(response.data).forEach(company => {
        newMap.set(company.title.toUpperCase(), company.cik_str);
      });
      this.cikMap = newMap;
    } catch (error) {
      console.error('Failed to initialize SEC CIK map:', error);
      // Re-throw the error to be caught by the calling function
      throw new Error('Failed to fetch data from SEC EDGAR API');
    }
  }

  public async enrichOrganization(name: string): Promise<EnrichedEdgarData | null> {
    try {
        await this.initializeCikMap();
    } catch (error) {
        // If initialization fails, rethrow the specific error
        throw error;
    }

    if (!this.cikMap) {
        throw new Error('CIK map is not initialized.');
    }

    const cik = this.cikMap.get(name.toUpperCase());
    if (!cik) {
      return null;
    }

    try {
      // CIK must be zero-padded to 10 digits for the API URL
      const paddedCik = String(cik).padStart(10, '0');
      const companyUrl = `${COMPANY_DATA_URL_BASE}CIK${paddedCik}.json`;
      
      const response = await axios.get(companyUrl, {
        headers: { 'User-Agent': this.userAgent },
      });

      const data = response.data;
      return {
        name: data.name,
        cik: data.cik,
        sic: data.sic,
        sicDescription: data.sicDescription,
        address: data.addresses.business, // Prefer business address
      };
    } catch (error) {
      console.error(`Error fetching data for CIK ${cik}:`, error);
      throw new Error('Failed to fetch data from SEC EDGAR API');
    }
  }
} 