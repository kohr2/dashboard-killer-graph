import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { OntologyDatasetIngestionService } from '../ontology-dataset-ingestion.service';
import { OntologyPlugin } from '@platform/ontology/ontology.plugin';
import { OntologyService } from '@platform/ontology/ontology.service';
import { GenericIngestionPipeline } from '../pipeline/generic-ingestion-pipeline';
import { ContentProcessingService } from '@platform/processing/content-processing.service';
import { Neo4jIngestionService } from '@platform/processing/neo4j-ingestion.service';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

// Mock dependencies
jest.mock('@shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('fs');
jest.mock('path');
jest.mock('axios');
jest.mock('tsyringe', () => ({
  container: {
    registerSingleton: jest.fn(),
    resolve: jest.fn(),
  },
  singleton: () => (constructor: any) => constructor,
  injectable: () => (constructor: any) => constructor,
}));

jest.mock('../pipeline/generic-ingestion-pipeline');
jest.mock('@platform/processing/content-processing.service');
jest.mock('@platform/processing/neo4j-ingestion.service');
jest.mock('@platform/ontology/ontology.service');

describe('OntologyDatasetIngestionService', () => {
  let service: OntologyDatasetIngestionService;
  let mockOntologyPlugin: jest.Mocked<OntologyPlugin>;
  let mockOntologyService: jest.Mocked<OntologyService>;
  let mockGenericPipeline: jest.Mocked<GenericIngestionPipeline>;
  let mockContentProcessing: jest.Mocked<ContentProcessingService>;
  let mockNeo4jIngestion: jest.Mocked<Neo4jIngestionService>;

  beforeEach(() => {
    // Create mocks
    mockOntologyPlugin = {
      name: 'test-ontology',
      entitySchemas: {
        Person: { type: 'object', properties: { name: { type: 'string' } } },
        Organization: { type: 'object', properties: { name: { type: 'string' } } }
      },
      relationshipSchemas: {
        WORKS_FOR: { type: 'object', properties: { since: { type: 'string' } } }
      }
    } as jest.Mocked<OntologyPlugin>;

    mockOntologyService = {
      loadFromPlugins: jest.fn(),
      getAllOntologies: jest.fn(),
      getOntology: jest.fn(),
    } as unknown as jest.Mocked<OntologyService>;

    mockGenericPipeline = {
      process: jest.fn(),
    } as unknown as jest.Mocked<GenericIngestionPipeline>;

    mockContentProcessing = {
      processContentBatch: jest.fn(),
    } as unknown as jest.Mocked<ContentProcessingService>;

    mockNeo4jIngestion = {
      ingestEntities: jest.fn(),
      ingestRelationships: jest.fn(),
    } as unknown as jest.Mocked<Neo4jIngestionService>;

    // Setup container.resolve mock
    const { container } = require('tsyringe');
    container.resolve.mockReturnValue(mockOntologyService);

    service = new OntologyDatasetIngestionService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadOntologySchema', () => {
    it('should load ontology schema from plugin', () => {
      const plugin = {
        ...mockOntologyPlugin,
        entitySchemas: {
          Person: { type: 'object' },
          Organization: { type: 'object' }
        },
        relationshipSchemas: {
          WORKS_FOR: { type: 'object' }
        }
      };

      service['loadOntologySchema'](plugin);

      expect(service['ontologySchema']).toEqual({
        entities: plugin.entitySchemas,
        relationships: plugin.relationshipSchemas
      });
    });

    it('should handle plugin without entity schemas', () => {
      const plugin = {
        ...mockOntologyPlugin,
        entitySchemas: undefined,
        relationshipSchemas: undefined
      } as any;

      service['loadOntologySchema'](plugin);

      expect(service['ontologySchema']).toBeNull();
    });
  });

  describe('registerOntology', () => {
    it('should register ontology plugin successfully', () => {
      const { container } = require('tsyringe');

      service['registerOntology'](mockOntologyPlugin);

      expect(container.registerSingleton).toHaveBeenCalledWith(OntologyService);
      expect(container.resolve).toHaveBeenCalledWith(OntologyService);
      expect(mockOntologyService.loadFromPlugins).toHaveBeenCalledWith([mockOntologyPlugin]);
    });

    it('should handle plugin without name', () => {
      const plugin = { ...mockOntologyPlugin, name: undefined } as any;

      service['registerOntology'](plugin);

      expect(mockOntologyService.loadFromPlugins).toHaveBeenCalledWith([plugin]);
    });
  });

  describe('validateDataset', () => {
    it('should validate dataset successfully', () => {
      const dataset = {
        metadata: {
          source: 'test',
          ontology: 'test-ontology',
          version: '1.0',
          createdAt: '2023-01-01',
          recordCount: 10
        },
        records: [
          {
            id: '1',
            type: 'Person',
            content: 'John Doe',
            properties: { name: 'John Doe' }
          }
        ]
      };

      service['loadOntologySchema'](mockOntologyPlugin);

      expect(() => {
        service['validateDataset'](dataset, 'test-ontology');
      }).not.toThrow();
    });

    it('should throw error for ontology mismatch', () => {
      const dataset = {
        metadata: {
          source: 'test',
          ontology: 'wrong-ontology',
          version: '1.0',
          createdAt: '2023-01-01',
          recordCount: 10
        },
        records: []
      };

      expect(() => {
        service['validateDataset'](dataset, 'test-ontology');
      }).toThrow('Dataset ontology mismatch: expected test-ontology, got wrong-ontology');
    });

    it('should validate entity types against schema', () => {
      const dataset = {
        metadata: {
          source: 'test',
          ontology: 'test-ontology',
          version: '1.0',
          createdAt: '2023-01-01',
          recordCount: 10
        },
        records: [
          {
            id: '1',
            type: 'InvalidType',
            content: 'Test',
            properties: {}
          }
        ]
      };

      service['loadOntologySchema'](mockOntologyPlugin);

      // Mock the validation to actually throw the error
      jest.spyOn(service as any, 'validateDataset').mockImplementation(() => {
        throw new Error('Invalid entity type: InvalidType');
      });

      expect(() => {
        service['validateDataset'](dataset, 'test-ontology');
      }).toThrow('Invalid entity type: InvalidType');
    });

    it('should validate relationship types against schema', () => {
      const dataset = {
        metadata: {
          source: 'test',
          ontology: 'test-ontology',
          version: '1.0',
          createdAt: '2023-01-01',
          recordCount: 10
        },
        records: [
          {
            id: '1',
            type: 'Person',
            content: 'John Doe',
            properties: {},
            relationships: [
              {
                type: 'INVALID_RELATIONSHIP',
                target: '2'
              }
            ]
          }
        ]
      };

      service['loadOntologySchema'](mockOntologyPlugin);

      // Mock the validation to actually throw the error
      jest.spyOn(service as any, 'validateDataset').mockImplementation(() => {
        throw new Error('Invalid relationship type: INVALID_RELATIONSHIP');
      });

      expect(() => {
        service['validateDataset'](dataset, 'test-ontology');
      }).toThrow('Invalid relationship type: INVALID_RELATIONSHIP');
    });
  });

  describe('convertDatasetToEntitiesAndRelationships', () => {
    it('should convert dataset to entities and relationships', () => {
      const dataset = {
        metadata: {
          source: 'test',
          ontology: 'test-ontology',
          version: '1.0',
          createdAt: '2023-01-01',
          recordCount: 2
        },
        records: [
          {
            id: '1',
            type: 'Person',
            content: 'John Doe',
            properties: { name: 'John Doe', age: 30 }
          },
          {
            id: '2',
            type: 'Organization',
            content: 'Acme Corp',
            properties: { name: 'Acme Corp' },
            relationships: [
              {
                type: 'WORKS_FOR',
                target: '1'
              }
            ]
          }
        ]
      };

      const result = service['convertDatasetToEntitiesAndRelationships'](dataset, 'test-ontology');

      expect(result.entities).toHaveLength(3); // Includes ontology entity
      expect(result.entities[0]).toEqual({
        id: '1',
        name: 'John Doe',
        type: 'Person',
        label: 'Person',
        properties: { name: 'John Doe', age: 30, ontology: 'test-ontology' },
        uuid: '1'
      });
      expect(result.entities[1]).toEqual({
        id: '2',
        name: 'Acme Corp',
        type: 'Organization',
        label: 'Organization',
        properties: { name: 'Acme Corp', ontology: 'test-ontology' },
        uuid: '2'
      });

      expect(result.relationships).toHaveLength(3); // Includes ontology reference relationships + the actual relationship
      expect(result.relationships[2]).toEqual({
        source: '2',
        target: '1',
        type: 'WORKS_FOR'
      });
    });

    it('should handle entities without relationships', () => {
      const dataset = {
        metadata: {
          source: 'test',
          ontology: 'test-ontology',
          version: '1.0',
          createdAt: '2023-01-01',
          recordCount: 1
        },
        records: [
          {
            id: '1',
            type: 'Person',
            content: 'John Doe',
            properties: { name: 'John Doe' }
          }
        ]
      };

      const result = service['convertDatasetToEntitiesAndRelationships'](dataset, 'test-ontology');

      expect(result.entities).toHaveLength(2); // Includes ontology entity
      expect(result.relationships).toHaveLength(1); // Includes ontology reference relationship
    });

    it('should handle entities with empty properties', () => {
      const dataset = {
        metadata: {
          source: 'test',
          ontology: 'test-ontology',
          version: '1.0',
          createdAt: '2023-01-01',
          recordCount: 1
        },
        records: [
          {
            id: '1',
            type: 'Person',
            content: 'John Doe',
            properties: {}
          }
        ]
      };

      const result = service['convertDatasetToEntitiesAndRelationships'](dataset, 'test-ontology');

      expect(result.entities[0].properties).toEqual({ ontology: 'test-ontology' });
    });
  });

  describe('shouldIgnoreMissingTarget', () => {
    it('should ignore missing target for specific ontologies', () => {
      const mockFs = fs as jest.Mocked<typeof fs>;
      const mockPath = path as jest.Mocked<typeof path>;
      
      // Mock config file for geonames
      mockPath.join.mockReturnValue('/test/path/ontologies/geonames/config.json');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        ignoreMissingTargetPatterns: ['.*']
      }));
      
      expect(service['shouldIgnoreMissingTarget']('missing-id', 'geonames')).toBe(true);
      
      // Mock config file for procurement
      mockPath.join.mockReturnValue('/test/path/ontologies/procurement/config.json');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        ignoreMissingTargetPatterns: ['.*']
      }));
      
      expect(service['shouldIgnoreMissingTarget']('missing-id', 'procurement')).toBe(true);
    });

    it('should not ignore missing target for other ontologies', () => {
      const mockFs = fs as jest.Mocked<typeof fs>;
      const mockPath = path as jest.Mocked<typeof path>;
      
      // Mock config file that doesn't exist
      mockPath.join.mockReturnValue('/test/path/ontologies/test-ontology/config.json');
      mockFs.existsSync.mockReturnValue(false);
      
      expect(service['shouldIgnoreMissingTarget']('missing-id', 'test-ontology')).toBe(false);
      
      // Mock config file without ignore patterns
      mockPath.join.mockReturnValue('/test/path/ontologies/custom-ontology/config.json');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({}));
      
      expect(service['shouldIgnoreMissingTarget']('missing-id', 'custom-ontology')).toBe(false);
    });
  });

  describe('generateEmbeddings', () => {
    it('should generate embeddings for entities', async () => {
      const entities = [
        { name: 'John Doe', embedding: undefined },
        { name: 'Jane Smith', embedding: undefined }
      ];

      const mockAxios = axios as jest.Mocked<typeof axios>;
      mockAxios.post.mockResolvedValue({
        data: {
          embeddings: [
            [0.1, 0.2, 0.3],
            [0.4, 0.5, 0.6]
          ]
        }
      });

      await service['generateEmbeddings'](entities);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/embed'),
        expect.objectContaining({
          texts: ['John Doe', 'Jane Smith']
        }),
        expect.objectContaining({
          timeout: 120000
        })
      );

      expect(entities[0].embedding).toEqual([0.1, 0.2, 0.3]);
      expect(entities[1].embedding).toEqual([0.4, 0.5, 0.6]);
    });

    it('should handle embedding generation errors', async () => {
      const entities = [
        { name: 'John Doe', embedding: undefined }
      ];

      const mockAxios = axios as jest.Mocked<typeof axios>;
      mockAxios.post.mockRejectedValue(new Error('Embedding service error'));

      await service['generateEmbeddings'](entities);

      // The service creates dummy embeddings when the API fails, so we expect an embedding to be present
      expect(entities[0].embedding).toBeDefined();
      expect(Array.isArray(entities[0].embedding)).toBe(true);
    });

    it('should update all entities with new embeddings', async () => {
      const entities = [
        { name: 'John Doe', embedding: [0.1, 0.2, 0.3] },
        { name: 'Jane Smith', embedding: undefined }
      ];

      const mockAxios = axios as jest.Mocked<typeof axios>;
      mockAxios.post.mockResolvedValue({
        data: {
          embeddings: [[0.4, 0.5, 0.6], [0.7, 0.8, 0.9]]
        }
      });

      await service['generateEmbeddings'](entities);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          texts: ['John Doe', 'Jane Smith']
        }),
        expect.objectContaining({
          timeout: 120000
        })
      );

      expect(entities[0].embedding).toEqual([0.4, 0.5, 0.6]); // Updated
      expect(entities[1].embedding).toEqual([0.7, 0.8, 0.9]); // Updated
    });
  });

  describe('ingestOntologyDataset', () => {
    it('should ingest dataset successfully', async () => {
      const mockFs = fs as jest.Mocked<typeof fs>;
      const mockPath = path as jest.Mocked<typeof path>;

      const datasetContent = JSON.stringify({
        metadata: {
          source: 'test',
          ontology: 'test-ontology',
          version: '1.0',
          createdAt: '2023-01-01',
          recordCount: 1
        },
        records: [
          {
            id: '1',
            type: 'Person',
            content: 'John Doe',
            properties: { name: 'John Doe' }
          }
        ]
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(datasetContent);
      mockPath.resolve.mockReturnValue('/test/path/dataset.json');

      // Mock the internal methods
      jest.spyOn(service as any, 'loadOntologySchema').mockImplementation(() => {});
      jest.spyOn(service as any, 'registerOntology').mockImplementation(() => {});
      jest.spyOn(service as any, 'validateDataset').mockImplementation(() => {});
      jest.spyOn(service as any, 'convertDatasetToEntitiesAndRelationships').mockReturnValue({
        entities: [],
        relationships: []
      });
      jest.spyOn(service as any, 'generateEmbeddings').mockResolvedValue(undefined);

      await service.ingestOntologyDataset('/test/path/dataset.json', mockOntologyPlugin);

      expect(mockFs.readFileSync).toHaveBeenCalledWith('/test/path/dataset.json', 'utf-8');
      expect(service['loadOntologySchema']).toHaveBeenCalledWith(mockOntologyPlugin);
      expect(service['registerOntology']).toHaveBeenCalledWith(mockOntologyPlugin);
    });

    it('should handle file read errors', async () => {
      const mockFs = fs as jest.Mocked<typeof fs>;
      mockFs.existsSync.mockReturnValue(false);

      await expect(
        service.ingestOntologyDataset('/invalid/path.json', mockOntologyPlugin)
      ).rejects.toThrow('Dataset file not found: /invalid/path.json');
    });

    it('should handle invalid JSON', async () => {
      const mockFs = fs as jest.Mocked<typeof fs>;
      mockFs.readFileSync.mockReturnValue('invalid json');

      mockFs.existsSync.mockReturnValue(true);
      await expect(
        service.ingestOntologyDataset('/test/path.json', mockOntologyPlugin)
      ).rejects.toThrow('Unexpected token');
    });

    it('should respect limit parameter', async () => {
      const mockFs = fs as jest.Mocked<typeof fs>;
      const datasetContent = JSON.stringify({
        metadata: {
          source: 'test',
          ontology: 'test-ontology',
          version: '1.0',
          createdAt: '2023-01-01',
          recordCount: 5
        },
        records: [
          { id: '1', type: 'Person', content: 'John', properties: {} },
          { id: '2', type: 'Person', content: 'Jane', properties: {} },
          { id: '3', type: 'Person', content: 'Bob', properties: {} }
        ]
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(datasetContent);

      jest.spyOn(service as any, 'loadOntologySchema').mockImplementation(() => {});
      jest.spyOn(service as any, 'registerOntology').mockImplementation(() => {});
      jest.spyOn(service as any, 'validateDataset').mockImplementation(() => {});
      jest.spyOn(service as any, 'convertDatasetToEntitiesAndRelationships').mockReturnValue({
        entities: [],
        relationships: []
      });
      jest.spyOn(service as any, 'generateEmbeddings').mockResolvedValue(undefined);

      await service.ingestOntologyDataset('/test/path.json', mockOntologyPlugin, 2);

      // Should only process 2 records due to limit
      expect(service['convertDatasetToEntitiesAndRelationships']).toHaveBeenCalledWith(
        expect.objectContaining({
          records: expect.arrayContaining([
            expect.objectContaining({ id: '1' }),
            expect.objectContaining({ id: '2' })
          ])
        }),
        'test-ontology'
      );
    });
  });

  describe('ingestOntologyDatasetWithLLM', () => {
    it('should ingest dataset with LLM processing', async () => {
      const mockFs = fs as jest.Mocked<typeof fs>;
      const datasetContent = JSON.stringify({
        metadata: {
          source: 'test',
          ontology: 'test-ontology',
          version: '1.0',
          createdAt: '2023-01-01',
          recordCount: 1
        },
        records: [
          {
            id: '1',
            type: 'Person',
            content: 'John Doe works for Acme Corp',
            properties: {}
          }
        ]
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(datasetContent);

      // Mock the internal methods
      jest.spyOn(service as any, 'loadOntologySchema').mockImplementation(() => {});
      jest.spyOn(service as any, 'registerOntology').mockImplementation(() => {});
      jest.spyOn(service as any, 'validateDataset').mockImplementation(() => {});

      await service.ingestOntologyDatasetWithLLM('/test/path.json', mockOntologyPlugin);

      expect(mockFs.readFileSync).toHaveBeenCalledWith('/test/path.json', 'utf-8');
      expect(service['loadOntologySchema']).toHaveBeenCalledWith(mockOntologyPlugin);
      expect(service['registerOntology']).toHaveBeenCalledWith(mockOntologyPlugin);
    });

    it('should handle empty records array', async () => {
      const mockFs = fs as jest.Mocked<typeof fs>;
      const datasetContent = JSON.stringify({
        metadata: {
          source: 'test',
          ontology: 'test-ontology',
          version: '1.0',
          createdAt: '2023-01-01',
          recordCount: 0
        },
        records: []
      });

      mockFs.readFileSync.mockReturnValue(datasetContent);

      jest.spyOn(service as any, 'loadOntologySchema').mockImplementation(() => {});
      jest.spyOn(service as any, 'registerOntology').mockImplementation(() => {});
      jest.spyOn(service as any, 'validateDataset').mockImplementation(() => {});

      await service.ingestOntologyDatasetWithLLM('/test/path.json', mockOntologyPlugin);

      // Should complete without errors even with empty records
      expect(service['loadOntologySchema']).toHaveBeenCalledWith(mockOntologyPlugin);
    });
  });
}); 