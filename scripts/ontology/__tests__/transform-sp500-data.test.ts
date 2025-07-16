import { SP500DataTransformer } from 'ontologies/sp500/transform-sp500-data';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock fs
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('SP500DataTransformer', () => {
  let transformer: SP500DataTransformer;
  let mockOutputDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockOutputDir = path.join(__dirname, '..', '..', '..', 'ontologies', 'companies', 'data');
    transformer = new SP500DataTransformer();
    
    // Mock fs.existsSync to return false initially
    mockedFs.existsSync.mockReturnValue(false);
    
    // Mock fs.mkdirSync
    mockedFs.mkdirSync.mockImplementation(() => undefined);
    
    // Mock fs.writeFileSync
    mockedFs.writeFileSync.mockImplementation(() => undefined);
  });

  describe('constructor', () => {
    it('should create output directory if it does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      
      new SP500DataTransformer();
      
      expect(mockedFs.existsSync).toHaveBeenCalledWith(mockOutputDir);
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(mockOutputDir, { recursive: true });
    });

    it('should not create output directory if it already exists', () => {
      mockedFs.existsSync.mockReturnValue(true);
      
      new SP500DataTransformer();
      
      expect(mockedFs.existsSync).toHaveBeenCalledWith(mockOutputDir);
      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('downloadSP500Data', () => {
    it('should download S&P 500 data successfully', async () => {
      const mockData = 'mock,csv,data';
      mockedAxios.get.mockResolvedValue({ data: mockData });
      
      const result = await (transformer as any).downloadSP500Data();
      
      expect(result).toBe(mockData);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/nqabell89/SP500-Wikipedia-Company-Info-Extractor/master/sp500_constituents.csv'
      );
    });

    it('should throw error when download fails', async () => {
      const error = new Error('Network error');
      mockedAxios.get.mockRejectedValue(error);
      
      await expect((transformer as any).downloadSP500Data()).rejects.toThrow('Failed to download S&P 500 data');
    });
  });

  describe('parseCSVData', () => {
    it('should parse valid CSV data correctly', () => {
      const csvData = `,TICKER,NAME,CIK
0,AAPL,Apple Inc.,0000320193
1,MSFT,Microsoft Corporation,0000789019
2,GOOGL,Alphabet Inc.,0001652044`;

      const result = (transformer as any).parseCSVData(csvData);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        ticker: 'AAPL',
        name: 'Apple Inc.',
        cik: '0000320193'
      });
      expect(result[1]).toEqual({
        ticker: 'MSFT',
        name: 'Microsoft Corporation',
        cik: '0000789019'
      });
      expect(result[2]).toEqual({
        ticker: 'GOOGL',
        name: 'Alphabet Inc.',
        cik: '0001652044'
      });
    });

    it('should handle empty CSV data', () => {
      const csvData = '';
      const result = (transformer as any).parseCSVData(csvData);
      expect(result).toHaveLength(0);
    });

    it('should handle CSV with only header', () => {
      const csvData = ',TICKER,NAME,CIK';
      const result = (transformer as any).parseCSVData(csvData);
      expect(result).toHaveLength(0);
    });

    it('should skip invalid lines', () => {
      const csvData = `,TICKER,NAME,CIK
0,AAPL,Apple Inc.,0000320193
1,,Microsoft Corporation,0000789019
2,GOOGL,,0001652044
3,MSFT,Microsoft Corporation,`;

      const result = (transformer as any).parseCSVData(csvData);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        ticker: 'AAPL',
        name: 'Apple Inc.',
        cik: '0000320193'
      });
    });

    it('should pad CIK to 10 digits', () => {
      const csvData = `,TICKER,NAME,CIK
0,AAPL,Apple Inc.,320193`;

      const result = (transformer as any).parseCSVData(csvData);
      expect(result[0].cik).toBe('0000320193');
    });
  });

  describe('transformCompanies', () => {
    it('should transform companies to ontology format', () => {
      const companies = [
        { ticker: 'AAPL', name: 'Apple Inc.', cik: '0000320193' },
        { ticker: 'MSFT', name: 'Microsoft Corporation', cik: '0000789019' }
      ];

      const result = (transformer as any).transformCompanies(companies);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'company_1',
        name: 'Apple Inc.',
        ticker: 'AAPL',
        cik: '0000320193',
        type: 'Company',
        properties: {
          name: 'Apple Inc.',
          ticker: 'AAPL',
          cik: '0000320193',
          description: 'Apple Inc. (AAPL) - S&P 500 company'
        }
      });
    });
  });

  describe('generateIndustryClassifications', () => {
    it('should generate industry classifications', () => {
      const result = (transformer as any).generateIndustryClassifications();
      
      expect(result).toHaveLength(10);
      expect(result[0]).toEqual({
        id: 'industry_1',
        name: 'Technology',
        type: 'Industry',
        properties: {
          name: 'Technology',
          code: 'TECH',
          description: 'Technology and software companies'
        }
      });
    });
  });

  describe('generateSectorClassifications', () => {
    it('should generate sector classifications', () => {
      const result = (transformer as any).generateSectorClassifications();
      
      expect(result).toHaveLength(10);
      expect(result[0]).toEqual({
        id: 'sector_1',
        name: 'Technology',
        type: 'Sector',
        properties: {
          name: 'Technology',
          code: 'TECH',
          description: 'Technology sector'
        }
      });
    });
  });

  describe('generateStockExchanges', () => {
    it('should generate stock exchange data', () => {
      const result = (transformer as any).generateStockExchanges();
      
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({
        id: 'exchange_1',
        name: 'New York Stock Exchange',
        type: 'StockExchange',
        properties: {
          name: 'New York Stock Exchange',
          code: 'NYSE',
          country: 'USA',
          description: 'New York Stock Exchange'
        }
      });
    });
  });

  describe('saveTransformedData', () => {
    it('should save data to JSON file', () => {
      const data = [{ id: 'test', name: 'Test' }];
      const filename = 'test.json';
      
      (transformer as any).saveTransformedData(data, filename);
      
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        path.join(mockOutputDir, filename),
        JSON.stringify(data, null, 2)
      );
    });
  });

  describe('transform', () => {
    it('should complete full transformation process successfully', async () => {
      const mockCsvData = `,TICKER,NAME,CIK
0,AAPL,Apple Inc.,0000320193
1,MSFT,Microsoft Corporation,0000789019`;
      
      mockedAxios.get.mockResolvedValue({ data: mockCsvData });
      
      await transformer.transform();
      
      // Verify download was called
      expect(mockedAxios.get).toHaveBeenCalled();
      
      // Verify files were saved
      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(5); // 4 individual files + 1 combined
      
      // Verify the combined dataset was saved
      const writeFileCalls = mockedFs.writeFileSync.mock.calls;
      const combinedDatasetCall = writeFileCalls.find(call => 
        typeof call[0] === 'string' && call[0].includes('sp500_complete_dataset.json')
      );
      expect(combinedDatasetCall).toBeDefined();
    });

    it('should handle download errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));
      
      await expect(transformer.transform()).rejects.toThrow('Failed to download S&P 500 data');
    });
  });
}); 