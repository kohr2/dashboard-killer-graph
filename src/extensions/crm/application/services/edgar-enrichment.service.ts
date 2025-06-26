import axios from 'axios';
import { promises as fs } from 'fs';
import { join } from 'path';

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
  private cachePath: string;

  constructor(userAgent: string) {
    if (!userAgent) {
      throw new Error('A User-Agent string is required for the SEC EDGAR API.');
    }
    this.userAgent = userAgent;
    // Define a path for the local cache file
    this.cachePath = join(__dirname, '..', '..', '..', '..', 'cache', 'company_tickers.json');
  }
  
  private async initializeCikMap(): Promise<void> {
    if (this.cikMap) return;

    try {
      let companyData: { [key: string]: CikData };

      // Ensure cache directory exists
      await fs.mkdir(join(this.cachePath, '..'), { recursive: true });

      try {
        // Try to read from local cache first
        const cachedData = await fs.readFile(this.cachePath, 'utf-8');
        companyData = JSON.parse(cachedData);
        console.log('Successfully loaded SEC CIK data from local cache.');
      } catch (error) {
        // If cache doesn't exist or is invalid, fetch from SEC
        console.log('Local CIK cache not found or invalid. Fetching from SEC...');
        const response = await axios.get<{ [key: string]: CikData }>(CIK_LOOKUP_URL, {
          headers: { 'User-Agent': this.userAgent },
        });
        companyData = response.data;
        
        // Save to local cache for future use
        await fs.writeFile(this.cachePath, JSON.stringify(companyData, null, 2), 'utf-8');
        console.log('Successfully fetched and cached SEC CIK data.');
      }
      
      const newMap = new Map<string, number>();
      Object.values(companyData).forEach(company => {
        newMap.set(company.title.toUpperCase(), company.cik_str);
      });
      this.cikMap = newMap;
    } catch (error) {
      console.error('Failed to initialize SEC CIK map:', error);
      throw new Error('Failed to fetch or process data from SEC EDGAR API');
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

    // Clean the name and convert to uppercase for matching
    const cleanedName = name.replace(/[.,]$/, '').toUpperCase();
    const cik = this.cikMap.get(cleanedName);
    
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
      return null;
    }
  }
} 