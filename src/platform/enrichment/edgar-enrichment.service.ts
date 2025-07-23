import type { AxiosInstance } from 'axios';
import axios from 'axios';
import { IEnrichmentService } from './i-enrichment-service.interface';
import { GenericEntity, EnrichmentResult } from './dto-aliases';
import { logger } from '@shared/utils/logger';
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
  public async enrich(entity: GenericEntity): Promise<EnrichmentResult> {
    try {
      // Only enrich Organization and Business entities
      if (entity.type !== 'Organization' && entity.type !== 'Business') {
        logger.debug(`Skipping EDGAR enrichment for non-Organization/Business entity: ${entity.type}`);
        return { success: false, error: 'Entity type not supported' };
      }

      // Skip generic or placeholder company names
      const companyName = entity.name || '';
      if (this.isGenericCompanyName(companyName)) {
        logger.debug(`Skipping EDGAR enrichment for generic company name: "${companyName}"`);
        return { success: false, error: 'Generic company name' };
      }

      // Initialize if needed
      if (!this.initialized) {
        await this.initialize();
      }

      if (!this.cikData) {
        logger.warn('EDGAR service not initialized - no CIK data available');
        return { success: false, error: 'Service not initialized' };
      }

      // Find matching company by name
      const normalizedName = this.normalizeName(companyName);
      const matchingEntry = Object.values(this.cikData).find(
        company => this.normalizeName(company.title) === normalizedName
      );

      if (!matchingEntry) {
        logger.debug(`No SEC filing found for company: "${companyName}" (normalized: "${normalizedName}")`);
        return { success: false, error: 'Company not found in SEC database' };
      }

      logger.info(`Found SEC filing for "${companyName}" with CIK: ${matchingEntry.cik_str}`);

      // Fetch detailed company data
      const companyUrl = `https://data.sec.gov/submissions/CIK${matchingEntry.cik_str.toString().padStart(10, '0')}.json`;
      const companyResponse = await axios.get<CompanyData>(companyUrl, {
        headers: { 
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br'
        },
        timeout: 15000
      });

      // Return enriched data
      return {
        success: true,
        data: {
          cik: matchingEntry.cik_str.toString(),
          legalName: companyResponse.data.name,
          sic: companyResponse.data.sic,
          sicDescription: companyResponse.data.sicDescription,
          address: companyResponse.data.addresses?.business
        }
      };

    } catch (error) {
      logger.error(`EDGAR enrichment failed for entity "${entity.name}":`, error);
      return { success: false, error: 'Enrichment failed' };
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
        logger.info('Loaded EDGAR CIK data from cache');
      } catch (cacheError) {
        // Cache miss, fetch from SEC
        logger.info('Cache miss, fetching EDGAR CIK data from SEC...');
        const response = await axios.get<CikData>('https://www.sec.gov/files/company_tickers.json', {
          headers: { 'User-Agent': this.userAgent },
          timeout: 10000
        });

        this.cikData = response.data;

        // Cache the data
        try {
          await fs.mkdir(cacheDir, { recursive: true });
          await fs.writeFile(cacheFile, JSON.stringify(this.cikData, null, 2));
          logger.info('Cached EDGAR CIK data for future use');
        } catch (writeError) {
          logger.warn('Failed to cache EDGAR CIK data:', writeError);
          // Continue without caching - the service will still work
        }
      }

      this.initialized = true;
      logger.info(`EDGAR service initialized with ${Object.keys(this.cikData || {}).length} companies`);
    } catch (error) {
      logger.error('Failed to initialize EDGAR service:', error);
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

  private isGenericCompanyName(name: string): boolean {
    const genericNames = [
      'unknown company',
      'unknown corporation',
      'unknown inc',
      'unknown corp',
      'unknown llc',
      'unknown ltd',
      'unknown limited',
      'company',
      'corporation',
      'inc',
      'corp',
      'llc',
      'ltd',
      'limited',
      'placeholder',
      'test company',
      'sample company',
      'example company',
      'demo company',
      'fictitious company',
      'dummy company'
    ];
    
    const normalizedName = name.toLowerCase().trim();
    return genericNames.includes(normalizedName) || 
           normalizedName.length < 3 ||
           /^[a-z\s]+$/.test(normalizedName) && normalizedName.length < 5;
  }
} 