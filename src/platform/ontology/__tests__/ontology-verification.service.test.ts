import { OntologyVerificationService } from '../ontology-verification.service';
import * as neo4j from 'neo4j-driver';
import { logger } from '@shared/utils/logger';

// Mock neo4j driver
jest.mock('neo4j-driver', () => ({
  driver: jest.fn(),
  auth: {
    basic: jest.fn().mockReturnValue({ username: 'test', password: 'test' })
  }
}));

// Mock logger
jest.mock('@shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

describe('OntologyVerificationService', () => {
  let service: OntologyVerificationService;
  let mockDriver: any;
  let mockSession: any;

  // Helper function to create mock Neo4j result
  const createMockResult = (records: any[] = []) => ({
    records,
    summary: {
      query: { text: 'test', parameters: {} },
      queryType: 'r',
      counters: { nodesCreated: 0, nodesDeleted: 0, relationshipsCreated: 0, relationshipsDeleted: 0, propertiesSet: 0, labelsAdded: 0, labelsRemoved: 0, indexesAdded: 0, indexesRemoved: 0, constraintsAdded: 0, constraintsRemoved: 0 },
      updateStatistics: () => ({}),
      plan: undefined,
      profile: undefined,
      notifications: [],
      server: { address: 'localhost:7687', version: 'neo4j/5.0.0', protocolVersion: 5.0 },
      database: { name: 'neo4j' }
    }
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock session with proper Result structure
    mockSession = {
      run: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined)
    };

    // Create mock driver
    mockDriver = {
      verifyConnectivity: jest.fn().mockResolvedValue(undefined),
      session: jest.fn().mockReturnValue(mockSession),
      close: jest.fn().mockResolvedValue(undefined)
    };

    // Mock neo4j.driver to return our mock driver
    (neo4j.driver as jest.Mock).mockReturnValue(mockDriver);

    // Create service instance
    service = new OntologyVerificationService();
  });

  describe('constructor', () => {
    it('should create service with default parameters', () => {
      expect(neo4j.driver).toHaveBeenCalledWith(
        'bolt://localhost:7687',
        expect.any(Object)
      );
      expect(neo4j.auth.basic).toHaveBeenCalledWith('neo4j', 'dashboard-killer');
    });

    it('should create service with custom parameters', () => {
      const customService = new OntologyVerificationService(
        'bolt://custom:7687',
        'customuser',
        'custompass',
        'customdb'
      );

      expect(neo4j.driver).toHaveBeenCalledWith(
        'bolt://custom:7687',
        expect.any(Object)
      );
      expect(neo4j.auth.basic).toHaveBeenCalledWith('customuser', 'custompass');
    });
  });

  describe('verifyOntologyData', () => {
    it('should successfully verify ontology data', async () => {
      // Mock successful connectivity
      mockDriver.verifyConnectivity.mockResolvedValue(undefined);

      // Mock entity query result
      const entityRecords = [
        {
          get: jest.fn((key: string) => {
            if (key === 'labels') return ['TestEntity', 'TestOntology'];
            if (key === 'count') return { toNumber: () => 10 };
            return null;
          })
        },
        {
          get: jest.fn((key: string) => {
            if (key === 'labels') return ['AnotherEntity'];
            if (key === 'count') return { toNumber: () => 5 };
            return null;
          })
        }
      ];

      // Mock sample entities query result
      const sampleRecords = [
        {
          get: jest.fn((key: string) => {
            if (key === 'name') return 'Test Entity 1';
            if (key === 'code') return 'TE001';
            if (key === 'description') return 'A test entity';
            if (key === 'type') return 'TestType';
            return null;
          })
        }
      ];

      // Mock relationship query result
      const relationshipRecords = [
        {
          get: jest.fn((key: string) => {
            if (key === 'type') return 'RELATES_TO';
            if (key === 'count') return { toNumber: () => 15 };
            return null;
          })
        }
      ];

      // Setup mock session to return different results for different queries
      mockSession.run.mockImplementation((query: string) => {
        if (query.includes('MATCH (n)') && query.includes('labels(n)')) {
          return Promise.resolve(createMockResult(entityRecords));
        } else if (query.includes('MATCH (n:TestEntity')) {
          return Promise.resolve(createMockResult(sampleRecords));
        } else if (query.includes('MATCH ()-[r]-()')) {
          return Promise.resolve(createMockResult(relationshipRecords));
        }
        return Promise.resolve(createMockResult());
      });

      const result = await service.verifyOntologyData('test');

      expect(result).toEqual({
        ontologyName: 'test',
        entityCounts: {
          'TestEntity:TestOntology': 10,
          'AnotherEntity': 5
        },
        relationshipCounts: {
          'RELATES_TO': 15
        },
        sampleEntities: {
          'TestEntity:TestOntology': [
            {
              name: 'Test Entity 1',
              code: 'TE001',
              description: 'A test entity',
              type: 'TestType'
            }
          ],
          'AnotherEntity': []
        },
        totalEntities: 15,
        totalRelationships: 15,
        success: true
      });

      expect(logger.info).toHaveBeenCalledWith('🔍 Verifying test data in database: dashboardkiller...');
      expect(logger.info).toHaveBeenCalledWith('✅ Connected to Neo4j successfully!');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('✅ test data has been successfully ingested'));
    });

    it('should handle no entities found', async () => {
      mockDriver.verifyConnectivity.mockResolvedValue(undefined);
      mockSession.run.mockResolvedValue(createMockResult());

      const result = await service.verifyOntologyData('empty');

      expect(result).toEqual({
        ontologyName: 'empty',
        entityCounts: {},
        relationshipCounts: {},
        sampleEntities: {},
        totalEntities: 0,
        totalRelationships: 0,
        success: false
      });

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('❌ No empty data found'));
    });

    it('should handle database connection failure', async () => {
      mockDriver.verifyConnectivity.mockRejectedValue(new Error('Connection failed'));

      const result = await service.verifyOntologyData('test');

      expect(result.success).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('❌ Failed to connect to Neo4j:', 'Connection failed');
    });

    it('should handle database query failure', async () => {
      mockDriver.verifyConnectivity.mockResolvedValue(undefined);
      mockSession.run.mockRejectedValue(new Error('Query failed'));

      const result = await service.verifyOntologyData('test');

      expect(result.success).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('❌ Database query failed:', 'Query failed');
    });

    it('should handle entities with no sample data', async () => {
      mockDriver.verifyConnectivity.mockResolvedValue(undefined);

      const entityRecords = [
        {
          get: jest.fn((key: string) => {
            if (key === 'labels') return ['TestEntity'];
            if (key === 'count') return { toNumber: () => 5 };
            return null;
          })
        }
      ];

      mockSession.run.mockImplementation((query: string) => {
        if (query.includes('labels(n)')) {
          return Promise.resolve(createMockResult(entityRecords));
        } else if (query.includes('MATCH (n:TestEntity')) {
          return Promise.resolve(createMockResult([])); // No sample entities
        } else if (query.includes('MATCH ()-[r]-()')) {
          return Promise.resolve(createMockResult([]));
        }
        return Promise.resolve(createMockResult([]));
      });

      const result = await service.verifyOntologyData('test');

      expect(result.entityCounts).toEqual({ 'TestEntity': 5 });
      expect(result.sampleEntities).toEqual({ 
        'TestEntity': [
          {
            name: null,
            code: null,
            description: null,
            type: null
          }
        ]
      });
      expect(result.totalEntities).toBe(5);
      expect(result.success).toBe(true);
    });
  });

  describe('verifyMultipleOntologies', () => {
    it('should verify multiple ontologies successfully', async () => {
      // Mock the verifyOntologyData method
      const mockVerifyResult = {
        ontologyName: 'test',
        entityCounts: { 'TestEntity': 5 },
        relationshipCounts: { 'RELATES_TO': 10 },
        sampleEntities: {},
        totalEntities: 5,
        totalRelationships: 10,
        success: true
      };

      jest.spyOn(service, 'verifyOntologyData').mockResolvedValue(mockVerifyResult);

      const results = await service.verifyMultipleOntologies(['test1', 'test2']);

      expect(results).toEqual({
        test1: mockVerifyResult,
        test2: mockVerifyResult
      });

      expect(service.verifyOntologyData).toHaveBeenCalledWith('test1');
      expect(service.verifyOntologyData).toHaveBeenCalledWith('test2');
      expect(logger.info).toHaveBeenCalledWith('='.repeat(50));
      expect(logger.info).toHaveBeenCalledWith('Verifying TEST1');
      expect(logger.info).toHaveBeenCalledWith('Verifying TEST2');
    });

    it('should handle empty ontology list', async () => {
      const results = await service.verifyMultipleOntologies([]);

      expect(results).toEqual({});
    });
  });

  describe('getOntologySummary', () => {
    it('should get ontology summary successfully', async () => {
      mockDriver.verifyConnectivity.mockResolvedValue(undefined);

      const summaryRecords = [
        {
          get: jest.fn((key: string) => {
            if (key === 'ontology') return 'test1';
            if (key === 'labels') return ['Entity1'];
            if (key === 'count') return { toNumber: () => 10 };
            return null;
          })
        },
        {
          get: jest.fn((key: string) => {
            if (key === 'ontology') return 'test1';
            if (key === 'labels') return ['Entity2'];
            if (key === 'count') return { toNumber: () => 5 };
            return null;
          })
        },
        {
          get: jest.fn((key: string) => {
            if (key === 'ontology') return 'test2';
            if (key === 'labels') return ['Entity3'];
            if (key === 'count') return { toNumber: () => 8 };
            return null;
          })
        }
      ];

      mockSession.run.mockResolvedValue(createMockResult(summaryRecords));

      const summary = await service.getOntologySummary();

      expect(summary).toEqual({
        test1: {
          entities: {
            'Entity1': 10,
            'Entity2': 5
          },
          totalEntities: 15
        },
        test2: {
          entities: {
            'Entity3': 8
          },
          totalEntities: 8
        }
      });

      expect(logger.info).toHaveBeenCalledWith('🔍 Getting ontology summary from database...');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('📊 Ontology Summary'));
    });

    it('should handle no ontologies in database', async () => {
      mockDriver.verifyConnectivity.mockResolvedValue(undefined);
      mockSession.run.mockResolvedValue(createMockResult());

      const summary = await service.getOntologySummary();

      expect(summary).toEqual({});
    });

    it('should handle database connection failure', async () => {
      mockDriver.verifyConnectivity.mockRejectedValue(new Error('Connection failed'));

      const summary = await service.getOntologySummary();

      expect(summary).toEqual({});
      expect(logger.error).toHaveBeenCalledWith('❌ Failed to get ontology summary:', 'Connection failed');
    });

    it('should handle database query failure', async () => {
      mockDriver.verifyConnectivity.mockResolvedValue(undefined);
      mockSession.run.mockRejectedValue(new Error('Query failed'));

      const summary = await service.getOntologySummary();

      expect(summary).toEqual({});
      expect(logger.error).toHaveBeenCalledWith('❌ Failed to get ontology summary:', 'Query failed');
    });
  });

  describe('error handling', () => {
    it('should properly close session and driver on success', async () => {
      mockDriver.verifyConnectivity.mockResolvedValue(undefined);
      mockSession.run.mockResolvedValue(createMockResult());

      await service.verifyOntologyData('test');

      expect(mockSession.close).toHaveBeenCalled();
      expect(mockDriver.close).toHaveBeenCalled();
    });

    it('should properly close session and driver on error', async () => {
      mockDriver.verifyConnectivity.mockRejectedValue(new Error('Connection failed'));

      await service.verifyOntologyData('test');

      expect(mockDriver.close).toHaveBeenCalled();
    });

    it('should handle session close failure', async () => {
      mockDriver.verifyConnectivity.mockResolvedValue(undefined);
      mockSession.run.mockResolvedValue(createMockResult());
      mockSession.close.mockRejectedValue(new Error('Close failed'));

      // Should not throw error
      await expect(service.verifyOntologyData('test')).resolves.toBeDefined();
    });
  });
}); 