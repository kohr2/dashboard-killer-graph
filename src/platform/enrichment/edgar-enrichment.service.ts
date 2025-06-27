import axios from 'axios';
import { promises as fs } from 'fs';
import { join } from 'path';
import { singleton, inject } from 'tsyringe';
import { IEnrichmentService, EnrichableEntity } from './i-enrichment-service.interface';

const CIK_LOOKUP_URL = 'https://www.sec.gov/files/company_tickers.json';
const COMPANY_DATA_URL_BASE = 'https://data.sec.gov/submissions/';

interface CikData {
  cik_str: number;
  ticker: string;
  title: string;
}

@singleton()
export class EdgarEnrichmentService implements IEnrichmentService {
  public readonly name = 'EDGAR';
  private cikMap: Map<string, number> | null = null;
  private cachePath: string;

  constructor(@inject('SEC_API_USER_AGENT') private userAgent: string) {
    if (!userAgent) {
      throw new Error('A User-Agent string is required for the SEC EDGAR API.');
    }
    this.cachePath = join(__dirname, '..', '..', 'cache', 'company_tickers.json');
  }

  public async enrich(entity: EnrichableEntity): Promise<Partial<EnrichableEntity> | null> {
    // This service only enriches Organizations
    if (entity.label !== 'Organization') {
      return null;
    }

    try {
      await this.initializeCikMap();
    } catch (error) {
      console.error('Failed to initialize EdgarEnrichmentService CIK map. Enrichment will be skipped.', error);
      return null;
    }

    const cleanedName = entity.name.replace(/[.,]$/, '').toUpperCase();
    const cik = this.cikMap!.get(cleanedName);

    if (!cik) {
      return null;
    }

    try {
      const paddedCik = String(cik).padStart(10, '0');
      const companyUrl = `${COMPANY_DATA_URL_BASE}CIK${paddedCik}.json`;
      const response = await axios.get(companyUrl, { headers: { 'User-Agent': this.userAgent } });
      const data = response.data;

      return {
        legalName: data.name,
        metadata: {
          ...entity.metadata,
          cik: data.cik,
          sic: data.sic,
          sicDescription: data.sicDescription,
          address: data.addresses.business,
        },
      };
    } catch (error) {
      console.error(`Error fetching EDGAR data for CIK ${cik}:`, error);
      return null;
    }
  }

  private async initializeCikMap(): Promise<void> {
    if (this.cikMap) return;

    try {
      let companyData: { [key: string]: CikData };
      await fs.mkdir(join(this.cachePath, '..'), { recursive: true });

      try {
        const cachedData = await fs.readFile(this.cachePath, 'utf-8');
        companyData = JSON.parse(cachedData);
      } catch (error) {
        const response = await axios.get<{ [key: string]: CikData }>(CIK_LOOKUP_URL, {
          headers: { 'User-Agent': this.userAgent },
        });
        companyData = response.data;
        await fs.writeFile(this.cachePath, JSON.stringify(companyData, null, 2), 'utf-8');
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
} 