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

  describe('close', () => {
    it('should close connections', async () => {
      await service.close();

      expect(mockAdvancedGraphService.close).toHaveBeenCalled();
      expect(mockNeo4jConnection.close).toHaveBeenCalled();
    });
  });
}); 