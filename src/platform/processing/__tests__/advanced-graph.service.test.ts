import { AdvancedGraphService, TemporalRelationship, HierarchicalRelationship, SimilarityRelationship, ComplexRelationship, GraphPattern } from '../advanced-graph.service';
import { Neo4jConnection } from '@platform/database/neo4j-connection';
import { logger } from '@shared/utils/logger';

// Mock external dependencies
jest.mock('@platform/database/neo4j-connection');
jest.mock('@shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AdvancedGraphService', () => {
  let advancedGraphService: AdvancedGraphService;
  let mockNeo4jConnection: jest.Mocked<Neo4jConnection>;
  let mockSession: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Neo4j session
    mockSession = {
      run: jest.fn(),
      close: jest.fn(),
    };

    // Mock Neo4j connection
    mockNeo4jConnection = {
      connect: jest.fn().mockResolvedValue(undefined),
      getDriver: jest.fn().mockReturnValue({
        session: jest.fn().mockReturnValue(mockSession),
      }),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Directly inject the mocked Neo4jConnection
    advancedGraphService = new AdvancedGraphService(mockNeo4jConnection);
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await advancedGraphService.initialize();

      expect(mockNeo4jConnection.connect).toHaveBeenCalled();
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX temporal_relationships_start_date')
      );
    });

    it('should handle initialization errors gracefully', async () => {
      mockNeo4jConnection.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(advancedGraphService.initialize()).rejects.toThrow('Connection failed');
    });
  });

  describe('temporal relationships', () => {
    beforeEach(async () => {
      await advancedGraphService.initialize();
    });

    it('should create temporal relationships successfully', async () => {
      const relationships: TemporalRelationship[] = [
        {
          source: 'org_123',
          target: 'org_456',
          type: 'PARTNERSHIP_FORMED',
          startDate: new Date('2023-01-15'),
          endDate: new Date('2023-12-31'),
          duration: 350,
          confidence: 0.9,
          metadata: {
            source: 'email_analysis',
            patternType: 'business_partnership',
          },
        },
      ];

      mockSession.run.mockResolvedValue({ records: [] });

      await advancedGraphService.createTemporalRelationships(relationships);

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('TEMPORAL_RELATIONSHIP'),
        expect.objectContaining({
          sourceId: 'org_123',
          targetId: 'org_456',
          type: 'PARTNERSHIP_FORMED',
          confidence: 0.9,
        })
      );
    });

    it('should handle empty relationships array', async () => {
      const initialCallCount = mockSession.run.mock.calls.length;
      await advancedGraphService.createTemporalRelationships([]);
      // Should not make any additional calls for empty array
      expect(mockSession.run.mock.calls.length).toBe(initialCallCount);
    });
  });

  describe('hierarchical relationships', () => {
    beforeEach(async () => {
      await advancedGraphService.initialize();
    });

    it('should create hierarchical relationships successfully', async () => {
      const relationships: HierarchicalRelationship[] = [
        {
          parent: 'fund_001',
          child: 'deal_789',
          level: 1,
          hierarchyType: 'FUND_DEAL',
          properties: {
            ownershipPercentage: 75,
            investmentStage: 'Series A',
          },
          metadata: {
            source: 'deal_flow_analysis',
            confidence: 1.0,
          },
        },
      ];

      mockSession.run.mockResolvedValue({ records: [] });

      await advancedGraphService.createHierarchicalRelationships(relationships);

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('HIERARCHICAL_RELATIONSHIP'),
        expect.objectContaining({
          parentId: 'fund_001',
          childId: 'deal_789',
          level: 1,
          hierarchyType: 'FUND_DEAL',
        })
      );
    });
  });

  describe('similarity relationships', () => {
    beforeEach(async () => {
      await advancedGraphService.initialize();
    });

    it('should create similarity relationships successfully', async () => {
      const relationships: SimilarityRelationship[] = [
        {
          entity1: 'org_123',
          entity2: 'org_456',
          similarityType: 'ORGANIZATION_SIMILARITY',
          score: 0.85,
          factors: ['sector', 'size', 'geography'],
          calculatedAt: new Date(),
          metadata: {
            algorithm: 'property_based_similarity',
            entityType: 'Organization',
          },
        },
      ];

      mockSession.run.mockResolvedValue({ records: [] });

      await advancedGraphService.createSimilarityRelationships(relationships);

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('SIMILARITY_RELATIONSHIP'),
        expect.objectContaining({
          entity1Id: 'org_123',
          entity2Id: 'org_456',
          similarityType: 'ORGANIZATION_SIMILARITY',
          score: 0.85,
        })
      );
    });
  });

  describe('complex relationships', () => {
    beforeEach(async () => {
      await advancedGraphService.initialize();
    });

    it('should create complex relationships successfully', async () => {
      const relationships: ComplexRelationship[] = [
        {
          source: 'org_123',
          target: 'org_456',
          type: 'COMPETITIVE_RELATIONSHIP',
          properties: {
            sector: 'Technology',
            competitionType: 'direct',
          },
          metadata: {
            source: 'pattern_analysis',
            confidence: 0.9,
            createdAt: new Date(),
            lastUpdated: new Date(),
            algorithm: 'competition_detection',
          },
        },
      ];

      mockSession.run.mockResolvedValue({ records: [] });

      await advancedGraphService.createComplexRelationships(relationships);

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('COMPLEX_RELATIONSHIP'),
        expect.objectContaining({
          sourceId: 'org_123',
          targetId: 'org_456',
          type: 'COMPETITIVE_RELATIONSHIP',
          confidence: 0.9,
        })
      );
    });
  });

  describe('timeline pattern analysis', () => {
    beforeEach(async () => {
      await advancedGraphService.initialize();
    });

    it('should analyze timeline patterns successfully', async () => {
      const mockRecords = [
        { get: (key: string) => ({ entityId: 'entity_1', relatedEntityId: 'entity_2', date: '2023-01-15', subject: 'Test' }[key]) },
        { get: (key: string) => ({ entityId: 'entity_2', relatedEntityId: 'entity_3', date: '2023-02-15', subject: 'Test 2' }[key]) },
      ];

      mockSession.run.mockResolvedValue({ records: mockRecords });

      const result = await advancedGraphService.analyzeTimelinePatterns('org_123', 'Organization');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        source: 'entity_2', // First entity becomes source in the timeline sequence
        target: 'entity_3', // Second entity becomes target
        type: 'TIMELINE_SEQUENCE',
        confidence: 0.8,
      });
    });

    it('should handle empty timeline results', async () => {
      mockSession.run.mockResolvedValue({ records: [] });

      const result = await advancedGraphService.analyzeTimelinePatterns('org_123');

      expect(result).toHaveLength(0);
    });
  });

  describe('hierarchical structure building', () => {
    beforeEach(async () => {
      await advancedGraphService.initialize();
    });

    it('should build hierarchical structure successfully', async () => {
      const mockRecords = [
        { get: (key: string) => ({ parentId: 'fund_001', childId: 'deal_789' }[key]) },
        { get: (key: string) => ({ parentId: 'fund_002', childId: 'deal_101' }[key]) },
      ];

      mockSession.run.mockResolvedValue({ records: mockRecords });

      const result = await advancedGraphService.buildHierarchicalStructure('Fund', 'Deal', 'OWNS');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        parent: 'fund_001',
        child: 'deal_789',
        level: 1,
        hierarchyType: 'Fund_Deal',
      });
    });
  });

  describe('entity similarity calculation', () => {
    beforeEach(async () => {
      await advancedGraphService.initialize();
    });

    it('should calculate entity similarity successfully', async () => {
      const mockRecords = [
        { get: (key: string) => ({ entity1Id: 'org_123', entity2Id: 'org_456', totalScore: 0.85 }[key]) },
      ];

      mockSession.run.mockResolvedValue({ records: mockRecords });

      const result = await advancedGraphService.calculateEntitySimilarity('Organization', ['sector', 'size']);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        entity1: 'org_123',
        entity2: 'org_456',
        similarityType: 'Organization_SIMILARITY',
        score: 0.85,
        factors: ['sector', 'size'],
      });
    });
  });

  describe('complex pattern creation', () => {
    beforeEach(async () => {
      await advancedGraphService.initialize();
    });

    it('should create complex patterns successfully', async () => {
      const patternDefinitions: GraphPattern[] = [
        {
          name: 'TEST_PATTERN',
          description: 'Test pattern',
          cypherQuery: 'MATCH (a:Test) RETURN a.id as source, "test" as target',
          resultMapping: {
            source: 'source',
            target: 'target',
          },
        },
      ];

      const mockRecords = [
        { get: (key: string) => ({ source: 'test_entity', target: 'test_target' }[key]) },
      ];

      mockSession.run.mockResolvedValue({ records: mockRecords });

      const result = await advancedGraphService.createComplexPatterns(patternDefinitions);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        source: 'test_entity',
        target: 'test_target',
        type: 'TEST_PATTERN',
      });
    });

    it('should handle pattern execution errors gracefully', async () => {
      const patternDefinitions: GraphPattern[] = [
        {
          name: 'ERROR_PATTERN',
          description: 'Error pattern',
          cypherQuery: 'INVALID CYPHER QUERY',
        },
      ];

      mockSession.run.mockRejectedValue(new Error('Cypher syntax error'));

      const result = await advancedGraphService.createComplexPatterns(patternDefinitions);

      expect(result).toHaveLength(0);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error executing pattern ERROR_PATTERN'),
        expect.any(Error)
      );
    });
  });

  describe('advanced pattern querying', () => {
    beforeEach(async () => {
      await advancedGraphService.initialize();
    });

    it('should query timeline patterns successfully', async () => {
      const mockRecords = [
        { toObject: () => ({ entityName: 'Test Entity', timeline: [] }) },
      ];

      mockSession.run.mockResolvedValue({ records: mockRecords });

      const result = await advancedGraphService.queryAdvancedPatterns('timeline');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        entityName: 'Test Entity',
        timeline: [],
      });
    });

    it('should throw error for unknown pattern type', async () => {
      await expect(advancedGraphService.queryAdvancedPatterns('unknown_pattern')).rejects.toThrow(
        'Unknown pattern type: unknown_pattern'
      );
    });
  });

  describe('custom analysis', () => {
    beforeEach(async () => {
      await advancedGraphService.initialize();
    });

    it('should execute custom analysis successfully', async () => {
      const customQuery = 'MATCH (n) RETURN n.name as name LIMIT 1';
      const mockRecords = [
        { toObject: () => ({ name: 'Test Node' }) },
      ];

      mockSession.run.mockResolvedValue({ records: mockRecords });

      const result = await advancedGraphService.executeCustomAnalysis(customQuery);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ name: 'Test Node' });
    });
  });

  describe('graph statistics', () => {
    beforeEach(async () => {
      await advancedGraphService.initialize();
    });

    it('should get graph statistics successfully', async () => {
      const mockCounts = [10, 5, 15, 8, 100, 50];
      mockSession.run
        .mockResolvedValueOnce({ records: [{ get: () => ({ toNumber: () => mockCounts[0] }) }] })
        .mockResolvedValueOnce({ records: [{ get: () => ({ toNumber: () => mockCounts[1] }) }] })
        .mockResolvedValueOnce({ records: [{ get: () => ({ toNumber: () => mockCounts[2] }) }] })
        .mockResolvedValueOnce({ records: [{ get: () => ({ toNumber: () => mockCounts[3] }) }] })
        .mockResolvedValueOnce({ records: [{ get: () => ({ toNumber: () => mockCounts[4] }) }] })
        .mockResolvedValueOnce({ records: [{ get: () => ({ toNumber: () => mockCounts[5] }) }] });

      const stats = await advancedGraphService.getGraphStatistics();

      expect(stats).toMatchObject({
        temporalRelationships: 10,
        hierarchicalRelationships: 5,
        similarityRelationships: 15,
        complexRelationships: 8,
        totalNodes: 100,
        totalRelationships: 50,
      });
    });
  });

  describe('cleanup', () => {
    it('should close connections properly', async () => {
      await advancedGraphService.initialize();
      await advancedGraphService.close();

      expect(mockSession.close).toHaveBeenCalled();
      expect(mockNeo4jConnection.close).toHaveBeenCalled();
    });
  });
}); 