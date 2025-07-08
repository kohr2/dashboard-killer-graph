import type { AxiosInstance } from 'axios';
import axios from 'axios';
import { IEnrichmentService } from './i-enrichment-service.interface';
import { GenericEntity } from './dto-aliases';
import { logger } from '@common/utils/logger';
import { promises as fs } from 'fs';
import { join } from 'path';

interface CikData {
  [key: string]: {
    cik_str: number;
    ticker: string;
    title: string;
  };
}

interface CompanyData {
  name: string;
  cik: string;
  sic: string;
  sicDescription: string;
  addresses: {
    business: {
      street1: string;
      city: string;
      stateOrCountry: string;
      zipCode: string;
    };
  };
}

/**
 * EDGAR Enrichment Service
 * Enriches any entity with SEC EDGAR data (ontology-agnostic)
 */
export class EdgarEnrichmentService implements IEnrichmentService {
  public readonly name = 'EDGAR';
  private readonly userAgent: string;
  private cikData: CikData | null = null;
  private initialized = false;

  constructor(userAgent: string) {
    this.userAgent = userAgent;
  }

  /**
   * Enrich any entity with EDGAR data
   */
  public async enrich(entity: GenericEntity): Promise<GenericEntity | {}> {
    try {
      // Only enrich Organization entities
      if (entity.type !== 'Organization') {
        return {};
      }

      // Initialize if needed
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.cikData) {
        return {};
      }

      // Find matching company by name
      const normalizedName = this.normalizeName(entity.name || '');
      const matchingEntry = Object.values(this.cikData).find(
        company => this.normalizeName(company.title) === normalizedName
      );

      if (!matchingEntry) {
        return {};
      }

      // Fetch detailed company data
      const companyUrl = `https://data.sec.gov/submissions/CIK${matchingEntry.cik_str.toString().padStart(10, '0')}.json`;
      const companyResponse = await axios.get<CompanyData>(companyUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 5000
      });

      // Return enriched entity
      return {
        ...entity,
        cik: matchingEntry.cik_str.toString(),
        legalName: companyResponse.data.name,
        sic: companyResponse.data.sic,
        sicDescription: companyResponse.data.sicDescription,
        address: companyResponse.data.addresses?.business
      };

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to initialize EDGAR service: ${error}`);
      return {};
    }
  }

  private async initialize(): Promise<void> {
    try {
      const cacheDir = join(process.cwd(), 'cache');
      const cacheFile = join(cacheDir, 'edgar-cik-lookup.json');

      try {
        // Try to read from cache first
        const cachedData = await fs.readFile(cacheFile, 'utf-8');
        this.cikData = JSON.parse(cachedData);
      } catch {
        // Cache miss, fetch from SEC
        const response = await axios.get<CikData>('https://www.sec.gov/files/company_tickers.json', {
          headers: { 'User-Agent': this.userAgent },
          timeout: 10000
        });

        this.cikData = response.data;

        // Cache the data
        await fs.mkdir(cacheDir, { recursive: true });
        await fs.writeFile(cacheFile, JSON.stringify(this.cikData, null, 2));
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize EDGAR service: ${error}`);
    }
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b(incorporated|inc\.?|corp\.?|corporation|ltd\.?|limited|llc|gmbh|sas|sa|plc|co\.?|spa)\b/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }
} 