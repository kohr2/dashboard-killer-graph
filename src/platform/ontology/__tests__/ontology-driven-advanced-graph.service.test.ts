import 'reflect-metadata';
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { OntologyDrivenAdvancedGraphService, OntologyAdvancedConfig, AdvancedRelationshipsConfig } from '../ontology-driven-advanced-graph.service';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { AdvancedGraphService } from '../../processing/advanced-graph.service';
import { container } from 'tsyringe';
import * as fs from 'fs';
import * as path from 'path';
import { Session } from 'neo4j-driver';
import { Driver } from 'neo4j-driver';

// Mock dependencies
jest.mock('@platform/database/neo4j-connection');
jest.mock('../../processing/advanced-graph.service');
jest.mock('fs');
jest.mock('path');
jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn(),
  },
  injectable: () => (constructor: any) => constructor,
  singleton: () => (constructor: any) => constructor,
}));

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;

describe('OntologyDrivenAdvancedGraphService', () => {
  let service: OntologyDrivenAdvancedGraphService;
  let mockNeo4jConnection: jest.Mocked<Neo4jConnection>;
  let mockAdvancedGraphService: jest.Mocked<AdvancedGraphService>;

  beforeEach(() => {
    // @ts-ignore - Jest mock typing issues
    const mockSession = {
      run: jest.fn<(query: string, params?: any) => Promise<{ records: any[] }>>().mockResolvedValue({ records: [] }),
      close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    } as unknown as Session;

    const mockDriver = {
      session: jest.fn().mockReturnValue(mockSession),
    } as unknown as Driver;

    // @ts-ignore - Jest mock typing issues
    mockNeo4jConnection = {
      getSession: jest.fn().mockReturnValue(mockSession),
      getDatabase: jest.fn(),
      switchDatabase: jest.fn(),
      // @ts-ignore - Jest mock typing issues
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn(),
      initializeSchema: jest.fn(),
      clearDatabase: jest.fn(),
      listDatabases: jest.fn(),
      dropDatabase: jest.fn(),
      findSimilarOrganizationEmbedding: jest.fn(),
      getDriver: jest.fn().mockReturnValue(mockDriver),
    } as unknown as jest.Mocked<Neo4jConnection>;

    // @ts-ignore - Jest mock typing issues
    mockAdvancedGraphService = {
      initialize: jest.fn(),
      createTemporalRelationships: jest.fn(),
      createHierarchicalRelationships: jest.fn(),
      createSimilarityRelationships: jest.fn(),
      createComplexRelationships: jest.fn(),
      createComplexPatterns: jest.fn(),
      analyzeTimelinePatterns: jest.fn(),
      buildHierarchicalStructure: jest.fn(),
      calculateEntitySimilarity: jest.fn(),
      queryAdvancedPatterns: jest.fn(),
      executeCustomAnalysis: jest.fn(),
      getGraphStatistics: jest.fn(),
      close: jest.fn(),
    } as unknown as jest.Mocked<AdvancedGraphService>;

    (AdvancedGraphService as jest.MockedClass<typeof AdvancedGraphService>).mockImplementation(() => mockAdvancedGraphService);

    // Mock the container to return our mocked services
    (container.resolve as jest.Mock).mockImplementation((serviceClass: any) => {
      if (serviceClass === AdvancedGraphService) {
        return mockAdvancedGraphService;
      }
      if (serviceClass === Neo4jConnection) {
        return mockNeo4jConnection;
      }
      return undefined;
    });

    service = new OntologyDrivenAdvancedGraphService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize service with dependencies', () => {
      expect(service).toBeInstanceOf(OntologyDrivenAdvancedGraphService);
      expect(container.resolve).toHaveBeenCalledWith(AdvancedGraphService);
      expect(container.resolve).toHaveBeenCalledWith(Neo4jConnection);
    });
  });

  describe('initialize', () => {
    it('should initialize Neo4j connection', async () => {
      await service.initialize();

      expect(mockNeo4jConnection.connect).toHaveBeenCalled();
      expect(mockAdvancedGraphService.initialize).toHaveBeenCalled();
    });
  });

  describe('loadOntology', () => {
    it('should load ontology from file', async () => {
      const mockOntologyConfig: OntologyAdvancedConfig = {
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        entities: {},
        relationships: {},
        advancedRelationships: {
          temporal: { enabled: false, patterns: [] },
          hierarchical: { enabled: false, structures: [] },
          similarity: { enabled: false, algorithms: [] },
          complex: { enabled: false, patterns: [] }
        }
      };

      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockOntologyConfig));
      mockedPath.resolve.mockReturnValue('/mock/path/ontology.json');

      await service.loadOntology('/mock/path/ontology.json');

      expect(mockedFs.readFileSync).toHaveBeenCalledWith('/mock/path/ontology.json', 'utf8');
    });

    it('should handle file read errors', async () => {
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(service.loadOntology('/invalid/path')).rejects.toThrow('File not found');
    });
  });

  describe('loadOntologiesFromDirectory', () => {
    it('should load multiple ontologies from directory', async () => {
      const mockFiles = ['ontology1.ontology.json', 'ontology2.ontology.json'];
      mockedFs.readdirSync.mockReturnValue(mockFiles as any);
      mockedFs.statSync.mockReturnValue({ isFile: () => true } as any);
      mockedPath.join.mockImplementation((...args) => args.join('/'));
      mockedPath.resolve.mockReturnValue('/mock/directory');
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        entities: {},
        relationships: {},
        advancedRelationships: {
          temporal: { enabled: false, patterns: [] },
          hierarchical: { enabled: false, structures: [] },
          similarity: { enabled: false, algorithms: [] },
          complex: { enabled: false, patterns: [] }
        }
      }));

      await service.loadOntologiesFromDirectory('/mock/directory');

      expect(mockedFs.readdirSync).toHaveBeenCalledWith('/mock/directory');
      expect(mockedFs.readFileSync).toHaveBeenCalledTimes(2);
    });

    it('should skip non-json files', async () => {
      const mockFiles = ['ontology1.ontology.json', 'readme.md', 'ontology2.ontology.json'];
      mockedFs.readdirSync.mockReturnValue(mockFiles as any);
      mockedFs.statSync.mockReturnValue({ isFile: () => true } as any);
      mockedPath.join.mockImplementation((...args) => args.join('/'));
      mockedPath.resolve.mockReturnValue('/mock/directory');
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        entities: {},
        relationships: {},
        advancedRelationships: {
          temporal: { enabled: false, patterns: [] },
          hierarchical: { enabled: false, structures: [] },
          similarity: { enabled: false, algorithms: [] },
          complex: { enabled: false, patterns: [] }
        }
      }));

      await service.loadOntologiesFromDirectory('/mock/directory');

      expect(mockedFs.readFileSync).toHaveBeenCalledTimes(2); // Only JSON files
    });
  });

  describe('applyOntologyConfiguration', () => {
    it('should apply temporal configuration when enabled', async () => {
      const mockOntologyConfig: OntologyAdvancedConfig = {
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        entities: {},
        relationships: {},
        advancedRelationships: {
          temporal: { 
            enabled: true, 
            patterns: [{
              name: 'test-pattern',
              description: 'Test pattern',
              entityTypes: ['Person'],
              relationshipType: 'WORKS_FOR',
              confidence: 0.8
            }]
          },
          hierarchical: { enabled: false, structures: [] },
          similarity: { enabled: false, algorithms: [] },
          complex: { enabled: false, patterns: [] }
        }
      };

      // Manually add the ontology to the service's internal map
      (service as any).ontologies.set('test-ontology', mockOntologyConfig);
      
      // Mock the private method
      const applyTemporalSpy = jest.spyOn(service as any, 'applyTemporalConfiguration');
      applyTemporalSpy.mockResolvedValue(undefined);

      await (service as any).applyOntologyConfiguration(mockOntologyConfig);

      expect(applyTemporalSpy).toHaveBeenCalledWith('test-ontology', mockOntologyConfig.advancedRelationships.temporal);
    });

    it('should apply hierarchical configuration when enabled', async () => {
      const mockOntologyConfig: OntologyAdvancedConfig = {
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        entities: {},
        relationships: {},
        advancedRelationships: {
          temporal: { enabled: false, patterns: [] },
          hierarchical: { 
            enabled: true, 
            structures: [{
              name: 'org-structure',
              description: 'Organization structure',
              parentType: 'Organization',
              childType: 'Department',
              relationshipType: 'HAS_DEPARTMENT',
              maxLevels: 3
            }]
          },
          similarity: { enabled: false, algorithms: [] },
          complex: { enabled: false, patterns: [] }
        }
      };

      // Manually add the ontology to the service's internal map
      (service as any).ontologies.set('test-ontology', mockOntologyConfig);
      
      // Mock the private method
      const applyHierarchicalSpy = jest.spyOn(service as any, 'applyHierarchicalConfiguration');
      applyHierarchicalSpy.mockResolvedValue(undefined);

      await (service as any).applyOntologyConfiguration(mockOntologyConfig);

      expect(applyHierarchicalSpy).toHaveBeenCalledWith('test-ontology', mockOntologyConfig.advancedRelationships.hierarchical);
    });
  });

  describe('queryOntologyPatterns', () => {
    beforeEach(async () => {
      // Load a test ontology first
      const mockOntologyConfig: OntologyAdvancedConfig = {
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        entities: {},
        relationships: {},
        advancedRelationships: {
          temporal: { enabled: false, patterns: [] },
          hierarchical: { enabled: false, structures: [] },
          similarity: { enabled: false, algorithms: [] },
          complex: { enabled: false, patterns: [] },
          queries: {
            timeline: { enabled: true, customQuery: 'MATCH (n) RETURN n' },
            hierarchy: { enabled: true, customQuery: 'MATCH (n) RETURN n' },
            similarity: { enabled: true, customQuery: 'MATCH (n) RETURN n' },
            complex: { enabled: true, customQuery: 'MATCH (n) RETURN n' }
          }
        }
      };

      // Manually add the ontology to the service's internal map
      (service as any).ontologies.set('test-ontology', mockOntologyConfig);
      
      // Initialize the service to set up the session
      await service.initialize();
    });

    it('should query temporal patterns', async () => {
      // @ts-ignore - Jest mock typing issues
      const mockSession = {
        run: jest.fn<(query: string, params?: any) => Promise<{ records: any[] }>>().mockResolvedValue({ records: [] }),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      } as unknown as Session;
      
      const mockDriver = {
        session: jest.fn().mockReturnValue(mockSession),
      } as unknown as Driver;
      
      mockNeo4jConnection.getDriver.mockReturnValue(mockDriver);
      mockAdvancedGraphService.queryAdvancedPatterns.mockResolvedValue([
        { pattern: 'employment_timeline', results: [] }
      ]);

      const result = await service.queryOntologyPatterns('test-ontology', 'timeline');

      // The service should use the driver from the connection
      expect(mockNeo4jConnection.getDriver).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should query hierarchy patterns', async () => {
      mockAdvancedGraphService.queryAdvancedPatterns.mockResolvedValue([
        { pattern: 'org_hierarchy', results: [] }
      ]);

      const result = await service.queryOntologyPatterns('test-ontology', 'hierarchy');
      expect(result).toBeDefined();
    });

    it('should query similarity patterns', async () => {
      mockAdvancedGraphService.queryAdvancedPatterns.mockResolvedValue([
        { pattern: 'entity_similarity', results: [] }
      ]);

      const result = await service.queryOntologyPatterns('test-ontology', 'similarity');
      expect(result).toBeDefined();
    });

    it('should query complex patterns', async () => {
      mockAdvancedGraphService.queryAdvancedPatterns.mockResolvedValue([
        { pattern: 'complex_pattern', results: [] }
      ]);

      const result = await service.queryOntologyPatterns('test-ontology', 'complex');
      expect(result).toBeDefined();
    });

    it('should throw error for unknown pattern type', async () => {
      await expect(service.queryOntologyPatterns('test-ontology', 'unknown'))
        .rejects.toThrow('Query type unknown not enabled or configured for ontology test-ontology');
    });

    it('should throw error for unknown ontology', async () => {
      await expect(service.queryOntologyPatterns('unknown-ontology', 'timeline'))
        .rejects.toThrow('Ontology unknown-ontology not found');
    });
  });

  describe('getLoadedOntologies', () => {
    it('should return list of loaded ontologies', () => {
      const ontologies = service.getLoadedOntologies();
      expect(Array.isArray(ontologies)).toBe(true);
    });
  });

  describe('getOntologyConfig', () => {
    it('should return ontology configuration when found', () => {
      const mockConfig: OntologyAdvancedConfig = {
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        entities: {},
        relationships: {},
        advancedRelationships: {
          temporal: { enabled: false, patterns: [] },
          hierarchical: { enabled: false, structures: [] },
          similarity: { enabled: false, algorithms: [] },
          complex: { enabled: false, patterns: [] }
        }
      };

      // Manually add the ontology to the service's internal map
      (service as any).ontologies.set('test-ontology', mockConfig);

      const result = service.getOntologyConfig('test-ontology');
      expect(result).toEqual(mockConfig);
    });

    it('should return undefined for unknown ontology', () => {
      const result = service.getOntologyConfig('unknown-ontology');
      expect(result).toBeUndefined();
    });
  });

  describe('getOntologyStatistics', () => {
    it('should return ontology statistics', async () => {
      const mockOntologyConfig: OntologyAdvancedConfig = {
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        entities: { Person: {}, Organization: {} },
        relationships: { WORKS_FOR: {} },
        advancedRelationships: {
          temporal: { enabled: false, patterns: [] },
          hierarchical: { enabled: false, structures: [] },
          similarity: { enabled: false, algorithms: [] },
          complex: { enabled: false, patterns: [] }
        }
      };

      // Manually add the ontology to the service's internal map
      (service as any).ontologies.set('test-ontology', mockOntologyConfig);

      const stats = await service.getOntologyStatistics();
      expect(stats).toHaveProperty('test-ontology');
      expect(stats['test-ontology']).toHaveProperty('entities', 2);
      expect(stats['test-ontology']).toHaveProperty('relationships', 1);
    });
  });

  describe('executeOntologyAnalysis', () => {
    beforeEach(async () => {
      const mockOntologyConfig: OntologyAdvancedConfig = {
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        entities: {},
        relationships: {},
        advancedRelationships: {
          temporal: { enabled: true, patterns: [] },
          hierarchical: { enabled: true, structures: [] },
          similarity: { enabled: true, algorithms: [] },
          complex: { enabled: true, patterns: [] }
        }
      };

      (service as any).ontologies.set('test-ontology', mockOntologyConfig);
      await service.initialize();
    });

    it('should execute temporal analysis', async () => {
      const mockSession = {
        run: jest.fn<(query: string, params?: any) => Promise<{ records: any[] }>>().mockResolvedValue({ records: [] }),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      } as unknown as Session;

      const mockDriver = {
        session: jest.fn().mockReturnValue(mockSession),
      } as unknown as Driver;

      mockNeo4jConnection.getDriver.mockReturnValue(mockDriver);

      const result = await service.executeOntologyAnalysis('test-ontology', 'temporal');
      expect(result).toBeDefined();
    });

    it('should execute hierarchical analysis', async () => {
      const mockSession = {
        run: jest.fn<(query: string, params?: any) => Promise<{ records: any[] }>>().mockResolvedValue({ records: [] }),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      } as unknown as Session;

      const mockDriver = {
        session: jest.fn().mockReturnValue(mockSession),
      } as unknown as Driver;

      mockNeo4jConnection.getDriver.mockReturnValue(mockDriver);

      const result = await service.executeOntologyAnalysis('test-ontology', 'hierarchical');
      expect(result).toBeDefined();
    });

    it('should execute similarity analysis', async () => {
      const mockSession = {
        run: jest.fn<(query: string, params?: any) => Promise<{ records: any[] }>>().mockResolvedValue({ records: [] }),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      } as unknown as Session;

      const mockDriver = {
        session: jest.fn().mockReturnValue(mockSession),
      } as unknown as Driver;

      mockNeo4jConnection.getDriver.mockReturnValue(mockDriver);

      const result = await service.executeOntologyAnalysis('test-ontology', 'similarity');
      expect(result).toBeDefined();
    });

    it('should execute complex analysis', async () => {
      const mockSession = {
        run: jest.fn<(query: string, params?: any) => Promise<{ records: any[] }>>().mockResolvedValue({ records: [] }),
        close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      } as unknown as Session;

      const mockDriver = {
        session: jest.fn().mockReturnValue(mockSession),
      } as unknown as Driver;

      mockNeo4jConnection.getDriver.mockReturnValue(mockDriver);

      const result = await service.executeOntologyAnalysis('test-ontology', 'complex');
      expect(result).toBeDefined();
    });

    it('should throw error for unknown analysis type', async () => {
      await expect(service.executeOntologyAnalysis('test-ontology', 'unknown'))
        .rejects.toThrow('Unknown analysis type: unknown');
    });

    it('should throw error for unknown ontology', async () => {
      await expect(service.executeOntologyAnalysis('unknown-ontology', 'temporal'))
        .rejects.toThrow('Ontology unknown-ontology not found');
    });
  });

  describe('close', () => {
    it('should close connections', async () => {
      await service.close();

      expect(mockAdvancedGraphService.close).toHaveBeenCalled();
      expect(mockNeo4jConnection.close).toHaveBeenCalled();
    });
  });
}); 