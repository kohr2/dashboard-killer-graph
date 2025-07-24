import 'reflect-metadata';
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { OntologyDrivenAdvancedGraphService, OntologyAdvancedConfig, AdvancedRelationshipsConfig } from '../ontology-driven-advanced-graph.service';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { AdvancedGraphService } from '../../processing/advanced-graph.service';
import { container } from 'tsyringe';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('@platform/database/neo4j-connection');
jest.mock('../../processing/advanced-graph.service');
jest.mock('fs');
jest.mock('path');
jest.mock('tsyringe');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;

describe('OntologyDrivenAdvancedGraphService', () => {
  let service: OntologyDrivenAdvancedGraphService;
  let mockNeo4jConnection: jest.Mocked<Neo4jConnection>;
  let mockAdvancedGraphService: jest.Mocked<AdvancedGraphService>;

  beforeEach(() => {
    const mockSession = {
      run: jest.fn().mockResolvedValue({ records: [] as any[] }),
      close: jest.fn(),
    };

    const mockDriver = {
      session: jest.fn().mockReturnValue(mockSession),
    };

    mockNeo4jConnection = {
      getSession: jest.fn().mockReturnValue(mockSession),
      getDatabase: jest.fn(),
      switchDatabase: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn(),
      initializeSchema: jest.fn(),
      clearDatabase: jest.fn(),
      listDatabases: jest.fn(),
      dropDatabase: jest.fn(),
      findSimilarOrganizationEmbedding: jest.fn(),
      getDriver: jest.fn().mockReturnValue(mockDriver),
    } as any;

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
      queryTemporalPatterns: jest.fn(),
      queryHierarchicalPatterns: jest.fn(),
      querySimilarityPatterns: jest.fn(),
      queryComplexPatterns: jest.fn(),
      close: jest.fn(),
    } as any;

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
      expect(AdvancedGraphService).toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    it('should initialize Neo4j connection', async () => {
      await service.initialize();

      expect(mockNeo4jConnection.connect).toHaveBeenCalled();
      expect(mockAdvancedGraphService.initialize).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Connection failed');
      mockNeo4jConnection.connect.mockRejectedValue(error);

      await expect(service.initialize()).rejects.toThrow('Connection failed');
    });
  });

  describe('loadOntology', () => {
    it('should load ontology from file', async () => {
      const mockOntologyConfig: OntologyAdvancedConfig = {
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        entities: {
          Person: { type: 'node', properties: { name: 'string' } },
          Organization: { type: 'node', properties: { name: 'string' } }
        },
        relationships: {
          WORKS_FOR: { type: 'relationship', properties: { since: 'date' } }
        },
        advancedRelationships: {
          temporal: { enabled: true, patterns: [] },
          hierarchical: { enabled: true, structures: [] },
          similarity: { enabled: true, algorithms: [] },
          complex: { enabled: true, patterns: [] }
        }
      };

      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockOntologyConfig));
      mockedPath.resolve.mockReturnValue('/path/to/ontology.json');

      await service.loadOntology('/path/to/ontology.json');

      expect(mockedFs.readFileSync).toHaveBeenCalledWith('/path/to/ontology.json', 'utf8');
      expect(service.getLoadedOntologies()).toContain('test-ontology');
    });

    it('should handle invalid JSON in ontology file', async () => {
      mockedFs.readFileSync.mockReturnValue('invalid json');
      mockedPath.resolve.mockReturnValue('/path/to/ontology.json');

      await expect(service.loadOntology('/path/to/ontology.json')).rejects.toThrow();
    });

    it('should handle file read errors', async () => {
      const error = new Error('File not found');
      mockedFs.readFileSync.mockImplementation(() => { throw error; });
      mockedPath.resolve.mockReturnValue('/path/to/ontology.json');

      await expect(service.loadOntology('/path/to/ontology.json')).rejects.toThrow('File not found');
    });
  });

  describe('loadOntologiesFromDirectory', () => {
    it('should load all ontology files from directory', async () => {
      const mockFiles = ['ontology1.json', 'ontology2.json', 'other.txt'];
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

      mockedFs.readdirSync.mockReturnValue(mockFiles as any);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockOntologyConfig));
      mockedPath.join.mockImplementation((...args) => args.join('/'));
      mockedPath.extname.mockReturnValue('.json');

      await service.loadOntologiesFromDirectory('/path/to/ontologies');

      expect(mockedFs.readdirSync).toHaveBeenCalledWith('/path/to/ontologies');
      expect(mockedFs.readFileSync).toHaveBeenCalledTimes(2); // Only .ontology.json files
      expect(mockedFs.readFileSync).toHaveBeenCalledTimes(2); // Only .json files
    });

    it('should handle directory read errors', async () => {
      const error = new Error('Directory not found');
      mockedFs.readdirSync.mockImplementation(() => { throw error; });

      await expect(service.loadOntologiesFromDirectory('/nonexistent')).rejects.toThrow('Directory not found');
    });
  });

  describe('applyOntologyConfiguration', () => {
    it('should apply temporal configuration', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn(),
      };
      mockNeo4jConnection.getSession.mockReturnValue(mockSession as any);

      const ontologyConfig: OntologyAdvancedConfig = {
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        entities: {},
        relationships: {},
        advancedRelationships: {
          temporal: {
            enabled: true,
            patterns: [
              {
                name: 'employment_timeline',
                description: 'Track employment history',
                entityTypes: ['Person', 'Organization'],
                relationshipType: 'WORKS_FOR',
                confidence: 0.8
              }
            ]
          },
          hierarchical: { enabled: false, structures: [] },
          similarity: { enabled: false, algorithms: [] },
          complex: { enabled: false, patterns: [] }
        }
      };

      await (service as any).applyOntologyConfiguration(ontologyConfig);

      expect(mockAdvancedGraphService.createTemporalRelationships).toHaveBeenCalled();
    });

    it('should apply hierarchical configuration', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn(),
      };
      mockNeo4jConnection.getSession.mockReturnValue(mockSession as any);

      const ontologyConfig: OntologyAdvancedConfig = {
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        entities: {},
        relationships: {},
        advancedRelationships: {
          temporal: { enabled: false, patterns: [] },
          hierarchical: {
            enabled: true,
            structures: [
              {
                name: 'org_hierarchy',
                description: 'Organization hierarchy',
                parentType: 'Organization',
                childType: 'Department',
                relationshipType: 'HAS_DEPARTMENT',
                maxLevels: 5
              }
            ]
          },
          similarity: { enabled: false, algorithms: [] },
          complex: { enabled: false, patterns: [] }
        }
      };

      await (service as any).applyOntologyConfiguration(ontologyConfig);

      expect(mockAdvancedGraphService.createHierarchicalRelationships).toHaveBeenCalled();
    });

    it('should apply similarity configuration', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn(),
      };
      mockNeo4jConnection.getSession.mockReturnValue(mockSession as any);

      const ontologyConfig: OntologyAdvancedConfig = {
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        entities: {},
        relationships: {},
        advancedRelationships: {
          temporal: { enabled: false, patterns: [] },
          hierarchical: { enabled: false, structures: [] },
          similarity: {
            enabled: true,
            algorithms: [
              {
                name: 'person_similarity',
                description: 'Person similarity based on attributes',
                entityType: 'Person',
                factors: [
                  { property: 'name', weight: 0.5, type: 'fuzzy' },
                  { property: 'age', weight: 0.3, type: 'numeric' }
                ],
                threshold: 0.7
              }
            ]
          },
          complex: { enabled: false, patterns: [] }
        }
      };

      await (service as any).applyOntologyConfiguration(ontologyConfig);

      expect(mockAdvancedGraphService.createSimilarityRelationships).toHaveBeenCalled();
    });

    it('should apply complex configuration', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn(),
      };
      mockNeo4jConnection.getSession.mockReturnValue(mockSession as any);

      const ontologyConfig: OntologyAdvancedConfig = {
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        entities: {},
        relationships: {},
        advancedRelationships: {
          temporal: { enabled: false, patterns: [] },
          hierarchical: { enabled: false, structures: [] },
          similarity: { enabled: false, algorithms: [] },
          complex: {
            enabled: true,
            patterns: [
              {
                name: 'deal_flow',
                description: 'Complex deal flow pattern',
                cypherQuery: 'MATCH (d:Deal)-[:HAS_STAGE]->(s:Stage) RETURN d, s',
                confidence: 0.9,
                enabled: true
              }
            ]
          }
        }
      };

      await (service as any).applyOntologyConfiguration(ontologyConfig);

      expect(mockAdvancedGraphService.createComplexPatterns).toHaveBeenCalled();
    });
  });

  describe('queryOntologyPatterns', () => {
    it('should query temporal patterns', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn(),
      };
      mockNeo4jConnection.getSession.mockReturnValue(mockSession as any);

      mockAdvancedGraphService.queryTemporalPatterns.mockResolvedValue([
        { pattern: 'employment_timeline', results: [] }
      ]);

      const result = await service.queryOntologyPatterns('test-ontology', 'temporal');

      expect(mockAdvancedGraphService.queryTemporalPatterns).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should query hierarchical patterns', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn(),
      };
      mockNeo4jConnection.getSession.mockReturnValue(mockSession as any);

      mockAdvancedGraphService.queryHierarchicalPatterns.mockResolvedValue([
        { pattern: 'org_hierarchy', results: [] }
      ]);

      const result = await service.queryOntologyPatterns('test-ontology', 'hierarchical');

      expect(mockAdvancedGraphService.queryHierarchicalPatterns).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should query similarity patterns', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn(),
      };
      mockNeo4jConnection.getSession.mockReturnValue(mockSession as any);

      mockAdvancedGraphService.querySimilarityPatterns.mockResolvedValue([
        { pattern: 'person_similarity', results: [] }
      ]);

      const result = await service.queryOntologyPatterns('test-ontology', 'similarity');

      expect(mockAdvancedGraphService.querySimilarityPatterns).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should query complex patterns', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn(),
      };
      mockNeo4jConnection.getSession.mockReturnValue(mockSession as any);

      mockAdvancedGraphService.queryComplexPatterns.mockResolvedValue([
        { pattern: 'deal_flow', results: [] }
      ]);

      const result = await service.queryOntologyPatterns('test-ontology', 'complex');

      expect(mockAdvancedGraphService.queryComplexPatterns).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw error for unknown pattern type', async () => {
      await expect(service.queryOntologyPatterns('test-ontology', 'unknown'))
        .rejects.toThrow('Unknown pattern type: unknown');
    });

    it('should throw error for unknown ontology', async () => {
      await expect(service.queryOntologyPatterns('unknown-ontology', 'temporal'))
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

      (service as any).ontologies.set('test-ontology', mockConfig);

      const result = service.getOntologyConfig('test-ontology');
      expect(result).toEqual(mockConfig);
    });

    it('should return undefined when ontology not found', () => {
      const result = service.getOntologyConfig('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('getOntologyStatistics', () => {
    it('should return ontology statistics', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn(),
      };
      mockNeo4jConnection.getSession.mockReturnValue(mockSession as any);

      const mockConfig: OntologyAdvancedConfig = {
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        entities: { Person: {}, Organization: {} },
        relationships: { WORKS_FOR: {} },
        advancedRelationships: {
          temporal: { enabled: true, patterns: [{ name: 'test' }] },
          hierarchical: { enabled: false, structures: [] },
          similarity: { enabled: false, algorithms: [] },
          complex: { enabled: false, patterns: [] }
        }
      };

      (service as any).ontologies.set('test-ontology', mockConfig);

      const stats = await service.getOntologyStatistics();

      expect(stats).toBeDefined();
      expect(stats['test-ontology']).toBeDefined();
      expect(stats['test-ontology'].entityTypes).toBe(2);
      expect(stats['test-ontology'].relationshipTypes).toBe(1);
    });
  });

  describe('executeOntologyAnalysis', () => {
    it('should execute temporal analysis', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn(),
      };
      mockNeo4jConnection.getSession.mockReturnValue(mockSession as any);

      const mockConfig: OntologyAdvancedConfig = {
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        entities: {},
        relationships: {},
        advancedRelationships: {
          temporal: { enabled: true, patterns: [] },
          hierarchical: { enabled: false, structures: [] },
          similarity: { enabled: false, algorithms: [] },
          complex: { enabled: false, patterns: [] }
        }
      };

      (service as any).ontologies.set('test-ontology', mockConfig);

      mockAdvancedGraphService.queryTemporalPatterns.mockResolvedValue([]);

      const result = await service.executeOntologyAnalysis('test-ontology', 'temporal');

      expect(result).toBeDefined();
      expect(mockAdvancedGraphService.queryTemporalPatterns).toHaveBeenCalled();
    });

    it('should execute hierarchical analysis', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn(),
      };
      mockNeo4jConnection.getSession.mockReturnValue(mockSession as any);

      const mockConfig: OntologyAdvancedConfig = {
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        entities: {},
        relationships: {},
        advancedRelationships: {
          temporal: { enabled: false, patterns: [] },
          hierarchical: { enabled: true, structures: [] },
          similarity: { enabled: false, algorithms: [] },
          complex: { enabled: false, patterns: [] }
        }
      };

      (service as any).ontologies.set('test-ontology', mockConfig);

      mockAdvancedGraphService.queryHierarchicalPatterns.mockResolvedValue([]);

      const result = await service.executeOntologyAnalysis('test-ontology', 'hierarchical');

      expect(result).toBeDefined();
      expect(mockAdvancedGraphService.queryHierarchicalPatterns).toHaveBeenCalled();
    });

    it('should execute similarity analysis', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn(),
      };
      mockNeo4jConnection.getSession.mockReturnValue(mockSession as any);

      const mockConfig: OntologyAdvancedConfig = {
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        entities: {},
        relationships: {},
        advancedRelationships: {
          temporal: { enabled: false, patterns: [] },
          hierarchical: { enabled: false, structures: [] },
          similarity: { enabled: true, algorithms: [] },
          complex: { enabled: false, patterns: [] }
        }
      };

      (service as any).ontologies.set('test-ontology', mockConfig);

      mockAdvancedGraphService.querySimilarityPatterns.mockResolvedValue([]);

      const result = await service.executeOntologyAnalysis('test-ontology', 'similarity');

      expect(result).toBeDefined();
      expect(mockAdvancedGraphService.querySimilarityPatterns).toHaveBeenCalled();
    });

    it('should execute complex analysis', async () => {
      const mockSession = {
        run: jest.fn().mockResolvedValue({ records: [] }),
        close: jest.fn(),
      };
      mockNeo4jConnection.getSession.mockReturnValue(mockSession as any);

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
          complex: { enabled: true, patterns: [] }
        }
      };

      (service as any).ontologies.set('test-ontology', mockConfig);

      mockAdvancedGraphService.queryComplexPatterns.mockResolvedValue([]);

      const result = await service.executeOntologyAnalysis('test-ontology', 'complex');

      expect(result).toBeDefined();
      expect(mockAdvancedGraphService.queryComplexPatterns).toHaveBeenCalled();
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
    it('should close Neo4j connection', async () => {
      await service.close();

      expect(mockNeo4jConnection.close).toHaveBeenCalled();
    });
  });

  describe('interfaces', () => {
    it('should validate OntologyAdvancedConfig structure', () => {
      const config: OntologyAdvancedConfig = {
        name: 'test',
        version: '1.0.0',
        description: 'Test config',
        entities: { Person: {} },
        relationships: { WORKS_FOR: {} },
        advancedRelationships: {
          temporal: { enabled: true, patterns: [] },
          hierarchical: { enabled: false, structures: [] },
          similarity: { enabled: false, algorithms: [] },
          complex: { enabled: false, patterns: [] }
        }
      };

      expect(config.name).toBe('test');
      expect(config.version).toBe('1.0.0');
      expect(config.entities).toEqual({ Person: {} });
      expect(config.advancedRelationships.temporal.enabled).toBe(true);
    });

    it('should validate AdvancedRelationshipsConfig structure', () => {
      const config: AdvancedRelationshipsConfig = {
        temporal: {
          enabled: true,
          patterns: [
            {
              name: 'test_pattern',
              description: 'Test pattern',
              entityTypes: ['Person'],
              relationshipType: 'WORKS_FOR',
              confidence: 0.8
            }
          ]
        },
        hierarchical: { enabled: false, structures: [] },
        similarity: { enabled: false, algorithms: [] },
        complex: { enabled: false, patterns: [] }
      };

      expect(config.temporal?.enabled).toBe(true);
      expect(config.temporal?.patterns).toHaveLength(1);
      expect(config.temporal?.patterns[0].name).toBe('test_pattern');
    });
  });
}); 