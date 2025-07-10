import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { logger } from '@shared/utils/logger';

interface SP500Company {
  ticker: string;
  name: string;
  cik: string;
}

interface TransformedCompany {
  id: string;
  name: string;
  ticker: string;
  cik: string;
  type: 'Company';
  properties: {
    name: string;
    ticker: string;
    cik: string;
    description?: string;
  };
}

class SP500DataTransformer {
  private readonly outputDir = path.join(__dirname, '..', '..', 'ontologies', 'companies', 'data');
  private readonly sp500Url = 'https://raw.githubusercontent.com/nqabell89/SP500-Wikipedia-Company-Info-Extractor/master/sp500_constituents.csv';

  constructor() {
    this.ensureOutputDirectory();
  }

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      logger.info(`Created output directory: ${this.outputDir}`);
    }
  }

  /**
   * Download S&P 500 data from GitHub
   */
  private async downloadSP500Data(): Promise<string> {
    logger.info('Downloading S&P 500 companies data...');
    
    try {
      const response = await axios.get(this.sp500Url);
      logger.info(`Downloaded ${response.data.length} bytes of S&P 500 data`);
      return response.data;
    } catch (error) {
      logger.error('Failed to download S&P 500 data:', error);
      throw new Error('Failed to download S&P 500 data');
    }
  }

  /**
   * Parse CSV data into structured format
   */
  private parseCSVData(csvData: string): SP500Company[] {
    logger.info('Parsing CSV data...');
    
    const lines = csvData.trim().split('\n');
    const companies: SP500Company[] = [];
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(',');
      
      if (parts.length >= 3) {
        const ticker = parts[1]?.trim();
        const name = parts[2]?.trim();
        const cik = parts[3]?.trim();
        
        if (ticker && name && cik) {
          companies.push({
            ticker,
            name,
            cik: cik.padStart(10, '0') // Ensure CIK is 10 digits
          });
        }
      }
    }
    
    logger.info(`Parsed ${companies.length} companies from CSV`);
    return companies;
  }

  /**
   * Transform companies into ontology format
   */
  private transformCompanies(companies: SP500Company[]): TransformedCompany[] {
    logger.info('Transforming companies to ontology format...');
    
    return companies.map((company, index) => ({
      id: `company_${index + 1}`,
      name: company.name,
      ticker: company.ticker,
      cik: company.cik,
      type: 'Company' as const,
      properties: {
        name: company.name,
        ticker: company.ticker,
        cik: company.cik,
        description: `${company.name} (${company.ticker}) - S&P 500 company`
      }
    }));
  }

  /**
   * Generate industry classifications based on company names and common patterns
   */
  private generateIndustryClassifications(): any[] {
    logger.info('Generating industry classifications...');
    
    const industries = [
      { name: 'Technology', code: 'TECH', description: 'Technology and software companies' },
      { name: 'Healthcare', code: 'HEALTH', description: 'Healthcare and pharmaceutical companies' },
      { name: 'Finance', code: 'FIN', description: 'Financial services and banking companies' },
      { name: 'Manufacturing', code: 'MFG', description: 'Manufacturing and industrial companies' },
      { name: 'Retail', code: 'RETAIL', description: 'Retail and consumer goods companies' },
      { name: 'Energy', code: 'ENERGY', description: 'Energy and utilities companies' },
      { name: 'Transportation', code: 'TRANS', description: 'Transportation and logistics companies' },
      { name: 'Telecommunications', code: 'TELECOM', description: 'Telecommunications companies' },
      { name: 'Media', code: 'MEDIA', description: 'Media and entertainment companies' },
      { name: 'Real Estate', code: 'RE', description: 'Real estate and property companies' }
    ];

    return industries.map((industry, index) => ({
      id: `industry_${index + 1}`,
      name: industry.name,
      type: 'Industry' as const,
      properties: {
        name: industry.name,
        code: industry.code,
        description: industry.description
      }
    }));
  }

  /**
   * Generate sector classifications
   */
  private generateSectorClassifications(): any[] {
    logger.info('Generating sector classifications...');
    
    const sectors = [
      { name: 'Technology', code: 'TECH', description: 'Technology sector' },
      { name: 'Healthcare', code: 'HEALTH', description: 'Healthcare sector' },
      { name: 'Financial', code: 'FIN', description: 'Financial sector' },
      { name: 'Consumer', code: 'CONS', description: 'Consumer sector' },
      { name: 'Industrial', code: 'IND', description: 'Industrial sector' },
      { name: 'Energy', code: 'ENERGY', description: 'Energy sector' },
      { name: 'Materials', code: 'MAT', description: 'Materials sector' },
      { name: 'Utilities', code: 'UTIL', description: 'Utilities sector' },
      { name: 'Communication Services', code: 'COMM', description: 'Communication Services sector' },
      { name: 'Real Estate', code: 'RE', description: 'Real Estate sector' }
    ];

    return sectors.map((sector, index) => ({
      id: `sector_${index + 1}`,
      name: sector.name,
      type: 'Sector' as const,
      properties: {
        name: sector.name,
        code: sector.code,
        description: sector.description
      }
    }));
  }

  /**
   * Generate stock exchange data
   */
  private generateStockExchanges(): any[] {
    logger.info('Generating stock exchange data...');
    
    const exchanges = [
      { name: 'New York Stock Exchange', code: 'NYSE', country: 'USA', description: 'New York Stock Exchange' },
      { name: 'NASDAQ', code: 'NASDAQ', country: 'USA', description: 'NASDAQ Stock Market' },
      { name: 'London Stock Exchange', code: 'LSE', country: 'UK', description: 'London Stock Exchange' },
      { name: 'Tokyo Stock Exchange', code: 'TSE', country: 'Japan', description: 'Tokyo Stock Exchange' }
    ];

    return exchanges.map((exchange, index) => ({
      id: `exchange_${index + 1}`,
      name: exchange.name,
      type: 'StockExchange' as const,
      properties: {
        name: exchange.name,
        code: exchange.code,
        country: exchange.country,
        description: exchange.description
      }
    }));
  }

  /**
   * Save transformed data to JSON files
   */
  private saveTransformedData(data: any, filename: string): void {
    const filepath = path.join(this.outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    logger.info(`Saved ${data.length} records to ${filepath}`);
  }

  /**
   * Main transformation process
   */
  async transform(): Promise<void> {
    try {
      logger.info('Starting S&P 500 data transformation...');
      
      // Download and parse S&P 500 data
      const csvData = await this.downloadSP500Data();
      const companies = this.parseCSVData(csvData);
      
      // Transform data
      const transformedCompanies = this.transformCompanies(companies);
      const industries = this.generateIndustryClassifications();
      const sectors = this.generateSectorClassifications();
      const exchanges = this.generateStockExchanges();
      
      // Save transformed data
      this.saveTransformedData(transformedCompanies, 'sp500_companies.json');
      this.saveTransformedData(industries, 'industries.json');
      this.saveTransformedData(sectors, 'sectors.json');
      this.saveTransformedData(exchanges, 'stock_exchanges.json');
      
      // Create a combined dataset
      const combinedData = {
        companies: transformedCompanies,
        industries,
        sectors,
        exchanges,
        metadata: {
          source: 'S&P 500 Wikipedia Company Info Extractor',
          url: this.sp500Url,
          transformedAt: new Date().toISOString(),
          totalCompanies: transformedCompanies.length,
          totalIndustries: industries.length,
          totalSectors: sectors.length,
          totalExchanges: exchanges.length
        }
      };
      
      this.saveTransformedData(combinedData, 'sp500_complete_dataset.json');
      
      logger.info('✅ S&P 500 data transformation completed successfully');
      logger.info(`📊 Transformed ${transformedCompanies.length} companies, ${industries.length} industries, ${sectors.length} sectors, and ${exchanges.length} exchanges`);
      
    } catch (error) {
      logger.error('❌ S&P 500 data transformation failed:', error);
      throw error;
    }
  }
}

// Main execution
async function main(): Promise<void> {
  const transformer = new SP500DataTransformer();
  await transformer.transform();
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    logger.error('Script failed:', error);
    process.exit(1);
  });
}

export { SP500DataTransformer }; 