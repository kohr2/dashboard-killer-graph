import { ISCODataTransformer } from '../transform-isco-data';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock fs
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('ISCODataTransformer', () => {
  let transformer: ISCODataTransformer;
  let mockRubySeedsContent: string;

  beforeEach(() => {
    transformer = new ISCODataTransformer();
    
    // Mock Ruby seeds file content
    mockRubySeedsContent = `
      isco_first_level_groups = [
        { code: '1', name: 'Directores y gerentes' },
        { code: '2', name: 'Profesionales científicos e intelectuales' },
        { code: '3', name: 'Técnicos, profesionales de nivel medio' }
      ]
      
      isco_second_level_groups = [
        { code: '11', name: 'Directores ejecutivos, altos funcionarios y legisladores', first_level_code: '1' },
        { code: '12', name: 'Directores de administración y servicios', first_level_code: '1' },
        { code: '21', name: 'Profesionales de las ciencias y la ingeniería', first_level_code: '2' }
      ]
      
      isco_third_level_groups = [
        { code: '111', name: 'Directores ejecutivos y altos funcionarios', first_level_code: '11' },
        { code: '112', name: 'Directores de administración y servicios', first_level_code: '12' },
        { code: '211', name: 'Profesionales de las ciencias físicas, químicas, matemáticas y afines', first_level_code: '21' }
      ]
      
      isco_fourth_level_groups = [
        { code: '1111', name: 'Directores ejecutivos', first_level_code: '111' },
        { code: '1112', name: 'Altos funcionarios de la administración pública', first_level_code: '111' },
        { code: '2111', name: 'Físicos y astrónomos', first_level_code: '211' }
      ]
    `;

    // Reset mocks
    jest.clearAllMocks();
    
    // Mock fs.existsSync to return true for directories
    mockedFs.existsSync.mockReturnValue(true);
    
    // Mock fs.mkdirSync to do nothing
    mockedFs.mkdirSync.mockImplementation(() => undefined);
    
    // Mock fs.writeFileSync to do nothing
    mockedFs.writeFileSync.mockImplementation(() => undefined);
  });

  describe('downloadISCOData', () => {
    it('should download and parse ISCO data successfully', async () => {
      // Mock axios response
      mockedAxios.get.mockResolvedValueOnce({ data: mockRubySeedsContent });

      await transformer.downloadISCOData();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/patriciomacadden/isco/master/db/seeds.rb'
      );
    });

    it('should handle download errors', async () => {
      const error = new Error('Network error');
      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(transformer.downloadISCOData()).rejects.toThrow('Network error');
    });
  });

  describe('parseRubySeedsFile', () => {
    it('should parse major groups correctly', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockRubySeedsContent });

      await transformer.downloadISCOData();
      
      // Access private method through any type
      const transformerAny = transformer as any;
      const output = transformerAny.transformToOntology();

      expect(output.entities.ISCOMajorGroup).toHaveProperty('ISCOMajorGroup_1');
      expect(output.entities.ISCOMajorGroup['ISCOMajorGroup_1']).toEqual({
        code: '1',
        name: 'Directores y gerentes',
        description: 'ISCO Major Group 1: Directores y gerentes',
        level: 'major'
      });
    });

    it('should parse sub-major groups with parent relationships', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockRubySeedsContent });

      await transformer.downloadISCOData();
      
      const transformerAny = transformer as any;
      const output = transformerAny.transformToOntology();

      expect(output.entities.ISCOSubMajorGroup).toHaveProperty('ISCOSubMajorGroup_11');
      expect(output.entities.ISCOSubMajorGroup['ISCOSubMajorGroup_11']).toEqual({
        code: '11',
        name: 'Directores ejecutivos, altos funcionarios y legisladores',
        description: 'ISCO Sub-Major Group 11: Directores ejecutivos, altos funcionarios y legisladores',
        parentCode: '1',
        level: 'sub-major'
      });

      // Check parent relationship
      const parentRelationship = output.relationships.ISCO_GROUP_PARENT.find(
        (rel: any) => rel.source === 'ISCOSubMajorGroup_11' && rel.target === 'ISCOMajorGroup_1'
      );
      expect(parentRelationship).toBeDefined();
    });

    it('should parse all group levels', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockRubySeedsContent });

      await transformer.downloadISCOData();
      
      const transformerAny = transformer as any;
      const output = transformerAny.transformToOntology();

      // Check all levels are parsed
      expect(Object.keys(output.entities.ISCOMajorGroup)).toHaveLength(3);
      expect(Object.keys(output.entities.ISCOSubMajorGroup)).toHaveLength(3);
      expect(Object.keys(output.entities.ISCOMinorGroup)).toHaveLength(3);
      expect(Object.keys(output.entities.ISCOUnitGroup)).toHaveLength(3);
    });
  });

  describe('transformToOntology', () => {
    it('should create proper entity structure', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockRubySeedsContent });

      await transformer.downloadISCOData();
      
      const transformerAny = transformer as any;
      const output = transformerAny.transformToOntology();

      // Check entity structure
      expect(output.entities).toHaveProperty('ISCOMajorGroup');
      expect(output.entities).toHaveProperty('ISCOSubMajorGroup');
      expect(output.entities).toHaveProperty('ISCOMinorGroup');
      expect(output.entities).toHaveProperty('ISCOUnitGroup');
      expect(output.entities).toHaveProperty('ISCOGroup');

      // Check relationship structure
      expect(output.relationships).toHaveProperty('ISCO_GROUP_PARENT');
      expect(output.relationships).toHaveProperty('ISCO_GROUP_TYPE');
    });

    it('should create type relationships for all entities', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockRubySeedsContent });

      await transformer.downloadISCOData();
      
      const transformerAny = transformer as any;
      const output = transformerAny.transformToOntology();

      // Count type relationships (should be equal to total entities)
      const totalEntities = Object.keys(output.entities.ISCOGroup).length;
      expect(output.relationships.ISCO_GROUP_TYPE).toHaveLength(totalEntities);
    });
  });

  describe('saveTransformedData', () => {
    it('should save data to correct files', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockRubySeedsContent });

      await transformer.downloadISCOData();
      
      const transformerAny = transformer as any;
      const output = transformerAny.transformToOntology();

      await transformer.saveTransformedData(output);

      // Check that files were written
      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(4); // entities, relationships, combined, stats

      // Check file paths
      const calls = mockedFs.writeFileSync.mock.calls;
      const filePaths = calls.map(call => call[0] as string);
      
      expect(filePaths.some(path => path.includes('isco-entities.json'))).toBe(true);
      expect(filePaths.some(path => path.includes('isco-relationships.json'))).toBe(true);
      expect(filePaths.some(path => path.includes('isco-ontology-data.json'))).toBe(true);
      expect(filePaths.some(path => path.includes('isco-stats.json'))).toBe(true);
    });

    it('should create output directory if it does not exist', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockRubySeedsContent });
      mockedFs.existsSync.mockReturnValue(false); // Directory doesn't exist

      await transformer.downloadISCOData();
      
      const transformerAny = transformer as any;
      const output = transformerAny.transformToOntology();

      await transformer.saveTransformedData(output);

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('data'), { recursive: true });
    });
  });

  describe('generateJobTitleMapping', () => {
    it('should generate job title mapping successfully', async () => {
      const mockJobTitlesData = {
        'job-titles': [
          'Software Engineer',
          'Data Scientist',
          'Marketing Manager',
          'Sales Representative'
        ]
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockJobTitlesData });

      await transformer.generateJobTitleMapping();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/jneidel/job-titles/master/job-titles.json'
      );

      // Check that mapping file was written
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('job-title-to-isco-mapping.json'),
        expect.any(String)
      );
    });

    it('should handle job titles mapping errors', async () => {
      const error = new Error('Job titles download failed');
      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(transformer.generateJobTitleMapping()).rejects.toThrow('Job titles download failed');
    });
  });

  describe('integration', () => {
    it('should complete full transformation pipeline', async () => {
      // Mock both API calls
      mockedAxios.get
        .mockResolvedValueOnce({ data: mockRubySeedsContent }) // ISCO data
        .mockResolvedValueOnce({ data: { 'job-titles': ['Software Engineer'] } }); // Job titles

      await transformer.downloadISCOData();
      
      const transformerAny = transformer as any;
      const output = transformerAny.transformToOntology();

      await transformer.saveTransformedData(output);
      await transformer.generateJobTitleMapping();

      // Verify all expected operations were performed
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(5); // 4 ISCO files + 1 mapping file
    });
  });
}); 