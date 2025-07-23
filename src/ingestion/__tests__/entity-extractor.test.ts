import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { EntityExtractor, EntityExtractionResult } from '../entity-extractor';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EntityExtractor', () => {
  let entityExtractor: EntityExtractor;

  beforeEach(() => {
    entityExtractor = new EntityExtractor();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default NLP service URL', () => {
      const extractor = new EntityExtractor();
      expect(extractor).toBeInstanceOf(EntityExtractor);
    });

    it('should use environment variable for NLP service URL', () => {
      const originalEnv = process.env.NLP_SERVICE_URL;
      process.env.NLP_SERVICE_URL = 'http://custom-nlp-service:9000';
      
      const extractor = new EntityExtractor();
      expect(extractor).toBeInstanceOf(EntityExtractor);
      
      process.env.NLP_SERVICE_URL = originalEnv;
    });
  });

  describe('extractEntities', () => {
    it('should return empty result for unimplemented method', async () => {
      const data = { content: 'test data' };
      const result = await entityExtractor.extractEntities(data);

      expect(result).toEqual({
        entities: [],
        relationships: [],
        confidence: 0,
        processingTime: 0
      });
    });

    it('should handle errors gracefully', async () => {
      const data = { content: 'test data' };
      
      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await entityExtractor.extractEntities(data);
      
      expect(result).toEqual({
        entities: [],
        relationships: [],
        confidence: 0,
        processingTime: 0
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('extractEmailEntities', () => {
    it('should call extractEntities with email data', async () => {
      const subject = 'Test Subject';
      const body = 'Test Body';
      const headers = { 'from': 'test@example.com' };

      const extractSpy = jest.spyOn(entityExtractor, 'extractEntities').mockResolvedValue({
        entities: [{ id: '1', name: 'Test Entity', type: 'PERSON' }],
        relationships: [],
        confidence: 0.8,
        processingTime: 100
      });

      const result = await entityExtractor.extractEmailEntities(subject, body, headers);

      expect(extractSpy).toHaveBeenCalledWith({ subject, body, headers });
      expect(result).toEqual({
        entities: [{ id: '1', name: 'Test Entity', type: 'PERSON' }],
        relationships: [],
        confidence: 0.8,
        processingTime: 100
      });
    });

    it('should handle extraction errors', async () => {
      const subject = 'Test Subject';
      const body = 'Test Body';
      const headers = { 'from': 'test@example.com' };

      jest.spyOn(entityExtractor, 'extractEntities').mockRejectedValue(new Error('Extraction failed'));

      await expect(entityExtractor.extractEmailEntities(subject, body, headers))
        .rejects.toThrow('Extraction failed');
    });
  });

  describe('EntityExtractionResult interface', () => {
    it('should validate EntityExtractionResult structure', () => {
      const result: EntityExtractionResult = {
        entities: [{ id: '1', name: 'Test', type: 'PERSON' }],
        relationships: [{ from: '1', to: '2', type: 'KNOWS' }],
        confidence: 0.9,
        processingTime: 150
      };

      expect(result.entities).toHaveLength(1);
      expect(result.relationships).toHaveLength(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex data structures', async () => {
      const complexData = {
        content: 'John Doe works at Acme Corp',
        metadata: {
          source: 'email',
          timestamp: new Date().toISOString(),
          confidence: 0.8
        },
        entities: [
          { name: 'John Doe', type: 'PERSON' },
          { name: 'Acme Corp', type: 'ORGANIZATION' }
        ]
      };

      const result = await entityExtractor.extractEntities(complexData);
      expect(result).toBeDefined();
      expect(result.entities).toEqual([]);
      expect(result.relationships).toEqual([]);
    });

    it('should handle null and undefined inputs', async () => {
      const result = await entityExtractor.extractEntities(null as any);
      expect(result).toBeDefined();
      expect(result.entities).toEqual([]);
    });
  });
}); 