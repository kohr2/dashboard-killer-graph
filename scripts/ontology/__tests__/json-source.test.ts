import { JsonSource } from '../sources/json-source';
import { ExtractionRule } from '../config';
import * as fs from 'fs';
import * as path from 'path';

describe('JsonSource', () => {
  let jsonSource: JsonSource;

  beforeEach(() => {
    jsonSource = new JsonSource();
  });

  describe('canHandle', () => {
    it('should identify JSON sources correctly', () => {
      expect(jsonSource.canHandle('https://example.com/ontology.json')).toBe(true);
      expect(jsonSource.canHandle('https://api.example.com/dataset')).toBe(true);
      expect(jsonSource.canHandle('https://example.com/data.json')).toBe(true);
      expect(jsonSource.canHandle('https://example.com/ontology.owl')).toBe(false);
    });
  });

  describe('fetch', () => {
    it('should handle local file paths', async () => {
      const testFile = path.join(__dirname, 'test-data.json');
      const testData = { test: 'data' };
      
      // Create test file
      fs.writeFileSync(testFile, JSON.stringify(testData));
      
      try {
        const content = await jsonSource.fetch(`file://${testFile}`);
        const parsed = JSON.parse(content);
        expect(parsed).toEqual(testData);
      } finally {
        // Cleanup
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
      }
    });

    it('should cache downloaded files', async () => {
      // Mock fetch for testing
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{"test": "data"}')
      });
      
      global.fetch = mockFetch;
      
      const url = 'https://example.com/test.json';
      const content1 = await jsonSource.fetch(url);
      const content2 = await jsonSource.fetch(url);
      
      expect(content1).toBe(content2);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Should only fetch once due to caching
      
      // Cleanup
      delete (global as any).fetch;
    });
  });

  describe('parse', () => {
    it('should parse valid JSON content', async () => {
      const jsonContent = JSON.stringify({
        entities: [
          { name: 'TestEntity', description: 'A test entity' }
        ],
        relationships: [
          { name: 'hasTest', source: 'Entity', target: 'TestEntity' }
        ]
      });
      
      const parsed = await jsonSource.parse(jsonContent);
      
      expect(parsed.entities).toEqual([]);
      expect(parsed.relationships).toEqual([]);
      expect(parsed.rawData).toBeDefined();
      expect(parsed.rawData.entities).toHaveLength(1);
      expect(parsed.rawData.relationships).toHaveLength(1);
    });

    it('should throw error for invalid JSON', async () => {
      const invalidJson = '{ invalid json }';
      
      await expect(jsonSource.parse(invalidJson)).rejects.toThrow('Failed to parse JSON content');
    });
  });

  describe('extractEntities', () => {
    it('should extract entities using JSONPath', async () => {
      const config: ExtractionRule = {
        path: '$.entities[*]',
        name: '$.name',
        description: '$.description'
      };
      
      const parsed = {
        entities: [],
        relationships: [],
        rawData: {
          entities: [
            { name: 'Entity1', description: 'First entity', type: 'Person' },
            { name: 'Entity2', description: 'Second entity', type: 'Organization' }
          ]
        }
      };
      
      const entities = await jsonSource.extractEntities(config, parsed);
      
      expect(entities).toHaveLength(2);
      expect(entities[0].name).toBe('Entity1');
      expect(entities[0].description).toBe('First entity');
      expect(entities[1].name).toBe('Entity2');
      expect(entities[1].description).toBe('Second entity');
    });

    it('should handle missing entities gracefully', async () => {
      const config: ExtractionRule = {
        path: '$.entities[*]',
        name: '$.name',
        description: '$.description'
      };
      
      const parsed = {
        entities: [],
        relationships: [],
        rawData: { other: 'data' }
      };
      
      const entities = await jsonSource.extractEntities(config, parsed);
      
      expect(entities).toHaveLength(0);
    });
  });

  describe('extractRelationships', () => {
    it('should extract relationships using JSONPath', async () => {
      const config: ExtractionRule = {
        path: '$.relationships[*]',
        name: '$.name',
        description: '$.description',
        source: '$.source',
        target: '$.target'
      };
      
      const parsed = {
        entities: [],
        relationships: [],
        rawData: {
          relationships: [
            { name: 'hasAddress', description: 'Has an address', source: 'Person', target: 'Address' },
            { name: 'worksFor', description: 'Works for organization', source: 'Person', target: 'Organization' }
          ]
        }
      };
      
      const relationships = await jsonSource.extractRelationships(config, parsed);
      
      expect(relationships).toHaveLength(2);
      expect(relationships[0].name).toBe('hasAddress');
      expect(relationships[0].source).toBe('Person');
      expect(relationships[0].target).toBe('Address');
      expect(relationships[1].name).toBe('worksFor');
      expect(relationships[1].source).toBe('Person');
      expect(relationships[1].target).toBe('Organization');
    });
  });

  describe('property extraction', () => {
    it('should extract properties from entity nodes', async () => {
      const config: ExtractionRule = {
        path: '$.entities[*]',
        name: '$.name',
        description: '$.description'
      };
      
      const parsed = {
        entities: [],
        relationships: [],
        rawData: {
          entities: [
            {
              name: 'Person',
              description: 'A person',
              age: 30,
              email: 'test@example.com',
              active: true,
              tags: ['user', 'admin']
            }
          ]
        }
      };
      
      const entities = await jsonSource.extractEntities(config, parsed);
      
      expect(entities[0].properties).toHaveProperty('age');
      expect(entities[0].properties.age.type).toBe('number');
      expect(entities[0].properties.email.type).toBe('string');
      expect(entities[0].properties.active.type).toBe('boolean');
      expect(entities[0].properties.tags.type).toBe('array');
    });
  });
}); 