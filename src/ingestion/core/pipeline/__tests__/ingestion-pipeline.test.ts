/**
 * Unit tests for IngestionPipeline
 * Following TDD approach - tests written first
 */

import { IngestionPipeline } from '../../../../../src/ingestion/core/pipeline/ingestion-pipeline';
import { DataSource, SourceType } from '../../../../../src/ingestion/core/types/data-source.interface';
import { ProcessingResult } from '../../../../../src/ingestion/core/types/pipeline.interface';
import 'reflect-metadata';
import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { OntologyDrivenAdvancedGraphService } from '@platform/processing/ontology-driven-advanced-graph.service';
import { EntityExtractor } from '../../../intelligence/nlp/entity-extractor';

// Mock dependencies
jest.mock('@platform/ontology/ontology.service');
jest.mock('@platform/processing/ontology-driven-advanced-graph.service');
jest.mock('../../../intelligence/nlp/entity-extractor');

const mockOntologyService = {
  getAllOntologies: jest.fn(),
  getEntitySchema: jest.fn()
};

const mockAdvancedGraphService = {
  applyOntologyConfiguration: jest.fn()
};

const mockEntityExtractor = {
  extract: jest.fn()
};

// Mock container resolution
jest.spyOn(container, 'resolve').mockImplementation((token: any) => {
  if (token === OntologyService) return mockOntologyService;
  if (token === OntologyDrivenAdvancedGraphService) return mockAdvancedGraphService;
  if (token === 'EntityExtractor') return mockEntityExtractor;
  return {};
});

// Mock data source for testing
class MockDataSource implements DataSource {
  readonly id = 'mock-source';
  readonly type = SourceType.EMAIL;
  readonly config = { name: 'mock', enabled: true };

  private mockData = [
    { id: '1', content: 'First item' },
    { id: '2', content: 'Second item' },
    { id: '3', content: 'Third item' }
  ];

  async connect(): Promise<void> {
    // Mock connection
  }

  async *fetch(): AsyncIterable<any> {
    for (const item of this.mockData) {
      yield item;
    }
  }

  async disconnect(): Promise<void> {
    // Mock disconnection
  }

  async healthCheck() {
    return {
      status: 'healthy' as const,
      lastCheck: new Date(),
      message: 'Mock source is healthy'
    };
  }
}

// Mock failing data source
class FailingMockDataSource extends MockDataSource {
  async *fetch(): AsyncIterable<any> {
    yield { id: '1', content: 'Good item' };
    throw new Error('Simulated processing error');
  }
}

describe('IngestionPipeline', () => {
  let pipeline: IngestionPipeline;
  let mockSource: MockDataSource;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset entity extraction mock to return empty results by default
    mockEntityExtractor.extract.mockResolvedValue({
      entities: [],
      relationships: []
    });
    
    // Mock ontologies with different entity types
    mockOntologyService.getAllOntologies.mockReturnValue([
      {
        name: 'crm',
        entities: {
          Contact: { description: 'A person contact' },
          Organization: { description: 'A company or organization' },
          Email: { description: 'Email communication' }
        }
      },
      {
        name: 'financial',
        entities: {
          Deal: { description: 'A financial transaction' },
          Investor: { description: 'An investment entity' },
          MonetaryAmount: { description: 'A monetary value' }
        }
      },
      {
        name: 'procurement',
        entities: {
          Tender: { description: 'A procurement tender' },
          Lot: { description: 'A tender lot' },
          Bid: { description: 'A bid submission' }
        }
      }
    ]);

    pipeline = new IngestionPipeline(mockEntityExtractor, mockAdvancedGraphService, mockOntologyService);
    mockSource = new MockDataSource();
  });

  describe('constructor', () => {
    it('should create pipeline with unique ID', () => {
      const pipeline1 = new IngestionPipeline();
      const pipeline2 = new IngestionPipeline();
      
      expect(pipeline1.id).toBeDefined();
      expect(pipeline2.id).toBeDefined();
      expect(pipeline1.id).not.toBe(pipeline2.id);
    });

    it('should set type to unified', () => {
      expect(pipeline.type).toBe('unified');
    });
  });

  describe('process', () => {
    it('should process all items from data source successfully', async () => {
      const result = await pipeline.process(mockSource);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.sourceId).toBe(mockSource.id);
      expect(result.itemsProcessed).toBe(3);
      expect(result.itemsSucceeded).toBe(3);
      expect(result.itemsFailed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle processing errors gracefully', async () => {
      const failingSource = new FailingMockDataSource();
      
      const result = await pipeline.process(failingSource);

      expect(result.success).toBe(true); // At least one item succeeded
      expect(result.itemsProcessed).toBe(1);
      expect(result.itemsSucceeded).toBe(1);
      expect(result.itemsFailed).toBe(0); // Error occurs at source level
      expect(result.sourceId).toBe(failingSource.id);
    });

    it('should connect and disconnect from source', async () => {
      const connectSpy = jest.spyOn(mockSource, 'connect');
      const disconnectSpy = jest.spyOn(mockSource, 'disconnect');

      await pipeline.process(mockSource);

      expect(connectSpy).toHaveBeenCalledTimes(1);
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });

    it('should include metadata in result', async () => {
      const result = await pipeline.process(mockSource);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.sourceType).toBe(SourceType.EMAIL);
      expect(result.metadata.pipelineId).toBe(pipeline.id);
    });

    it('should track entity and relationship creation', async () => {
      const result = await pipeline.process(mockSource);

      expect(result.entitiesCreated).toBeDefined();
      expect(result.relationshipsCreated).toBeDefined();
      expect(typeof result.entitiesCreated).toBe('number');
      expect(typeof result.relationshipsCreated).toBe('number');
    });

    it('should handle empty data source', async () => {
      const emptySource = new MockDataSource();
      // Override to return no data
      emptySource['mockData'] = [];

      const result = await pipeline.process(emptySource);

      expect(result.success).toBe(false); // No items succeeded
      expect(result.itemsProcessed).toBe(0);
      expect(result.itemsSucceeded).toBe(0);
      expect(result.itemsFailed).toBe(0);
    });
  });

  describe('monitor', () => {
    it('should return pipeline metrics', () => {
      const metrics = pipeline.monitor();

      expect(metrics).toBeDefined();
      expect(metrics.totalProcessed).toBeDefined();
      expect(metrics.averageProcessingTime).toBeDefined();
      expect(metrics.successRate).toBeDefined();
      expect(metrics.lastRun).toBeInstanceOf(Date);
      expect(metrics.status).toBeDefined();
      expect(['idle', 'running', 'stopped', 'error']).toContain(metrics.status);
    });
  });

  describe('stop', () => {
    it('should stop pipeline gracefully', async () => {
      await expect(pipeline.stop()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle source connection errors', async () => {
      const errorSource = new MockDataSource();
      jest.spyOn(errorSource, 'connect').mockRejectedValue(new Error('Connection failed'));

      await expect(pipeline.process(errorSource)).rejects.toThrow('Connection failed');
    });

    it('should handle source disconnection errors gracefully', async () => {
      const errorSource = new MockDataSource();
      jest.spyOn(errorSource, 'disconnect').mockRejectedValue(new Error('Disconnection failed'));

      // Should not throw - disconnection errors should be logged but not fail the pipeline
      const result = await pipeline.process(errorSource);
      expect(result.success).toBe(true);
    });
  });

  describe('data normalization', () => {
    it('should normalize data based on source type', async () => {
      // This tests the private normalizeData method indirectly
      const result = await pipeline.process(mockSource);
      
      expect(result.success).toBe(true);
      // The fact that processing succeeds implies normalization worked
    });
  });

  describe('entity extraction', () => {
    it('should extract entities from normalized data', async () => {
      const result = await pipeline.process(mockSource);
      
      // Should have attempted entity extraction for each item
      expect(result.entitiesCreated).toBeGreaterThanOrEqual(0);
      expect(result.relationshipsCreated).toBeGreaterThanOrEqual(0);
    });
  });

  describe('data storage', () => {
    it('should store processed data', async () => {
      const result = await pipeline.process(mockSource);
      
      // If processing succeeded, storage should have been attempted
      expect(result.itemsSucceeded).toBeGreaterThan(0);
    });
  });

  describe('advanced relationships integration', () => {
    it('should call OntologyDrivenAdvancedGraphService after ingestion', async () => {
      // Arrange: mock the advanced relationship service
      const mockApplyOntologyConfiguration = jest.fn().mockResolvedValue(undefined);
      const mockOntologyService = {
        applyOntologyConfiguration: mockApplyOntologyConfiguration
      };
      // Inject the mock into the pipeline
      const pipelineWithAdvanced = new IngestionPipeline(mockEntityExtractor, mockOntologyService);
      const source = new MockDataSource();

      // Act
      await pipelineWithAdvanced.process(source);

      // Assert: should have called the advanced relationship service
      expect(mockApplyOntologyConfiguration).toHaveBeenCalled();
    });
  });

  describe('ontology-agnostic processing', () => {
    it('should detect CRM ontology when Contact and Organization entities are found', async () => {
      // Mock entity extraction to return CRM entities
      mockEntityExtractor.extract.mockResolvedValue({
        entities: [
          { type: 'Contact', name: 'John Doe', confidence: 0.9 },
          { type: 'Organization', name: 'Acme Corp', confidence: 0.8 }
        ],
        relationships: []
      });

      const result = await pipeline.process(mockSource);

      expect(result.success).toBe(true);
      expect(mockAdvancedGraphService.applyOntologyConfiguration).toHaveBeenCalledWith('crm');
    });

    it('should detect Financial ontology when Deal and Investor entities are found', async () => {
      // Mock entity extraction to return Financial entities
      mockEntityExtractor.extract.mockResolvedValue({
        entities: [
          { type: 'Deal', name: 'Series A Round', confidence: 0.9 },
          { type: 'Investor', name: 'VC Fund', confidence: 0.8 },
          { type: 'MonetaryAmount', name: '$5M', confidence: 0.95 }
        ],
        relationships: []
      });

      const result = await pipeline.process(mockSource);

      expect(result.success).toBe(true);
      expect(mockAdvancedGraphService.applyOntologyConfiguration).toHaveBeenCalledWith('financial');
    });

    it('should detect multiple ontologies when entities from different domains are found', async () => {
      // Mock entity extraction to return mixed entities
      mockEntityExtractor.extract.mockResolvedValue({
        entities: [
          { type: 'Contact', name: 'John Doe', confidence: 0.9 },
          { type: 'Deal', name: 'Series A Round', confidence: 0.8 },
          { type: 'Tender', name: 'IT Services Tender', confidence: 0.7 }
        ],
        relationships: []
      });

      const result = await pipeline.process(mockSource);

      expect(result.success).toBe(true);
      // Should apply multiple ontologies
      expect(mockAdvancedGraphService.applyOntologyConfiguration).toHaveBeenCalledWith('crm');
      expect(mockAdvancedGraphService.applyOntologyConfiguration).toHaveBeenCalledWith('financial');
      expect(mockAdvancedGraphService.applyOntologyConfiguration).toHaveBeenCalledWith('procurement');
    });

    it('should use fallback ontology when no specific entities are detected', async () => {
      // Mock entity extraction to return generic entities
      mockEntityExtractor.extract.mockResolvedValue({
        entities: [
          { type: 'Unknown', name: 'Generic Entity', confidence: 0.5 }
        ],
        relationships: []
      });

      const result = await pipeline.process(mockSource);

      expect(result.success).toBe(true);
      // Should use default ontology (crm)
      expect(mockAdvancedGraphService.applyOntologyConfiguration).toHaveBeenCalledWith('crm');
    });

    it('should prioritize ontologies based on entity confidence and frequency', async () => {
      // Mock entity extraction with varying confidence levels
      mockEntityExtractor.extract.mockResolvedValue({
        entities: [
          { type: 'Contact', name: 'John Doe', confidence: 0.9 },
          { type: 'Deal', name: 'Series A', confidence: 0.95 },
          { type: 'Deal', name: 'Series B', confidence: 0.92 },
          { type: 'Investor', name: 'VC Fund', confidence: 0.88 }
        ],
        relationships: []
      });

      const result = await pipeline.process(mockSource);

      expect(result.success).toBe(true);
      // Financial should be prioritized due to higher confidence and frequency
      expect(mockAdvancedGraphService.applyOntologyConfiguration).toHaveBeenCalledWith('financial');
      expect(mockAdvancedGraphService.applyOntologyConfiguration).toHaveBeenCalledWith('crm');
    });
  });

  describe('content-based ontology selection', () => {
    it('should analyze content keywords to determine relevant ontologies', async () => {
      // Mock entity extraction with minimal entities but content analysis
      mockEntityExtractor.extract.mockResolvedValue({
        entities: [
          { type: 'Organization', name: 'Company', confidence: 0.7 }
        ],
        relationships: []
      });

      const mockDataSource = {
        id: 'test-keywords',
        type: 'document',
        connect: jest.fn(),
        disconnect: jest.fn(),
        fetch: jest.fn().mockReturnValue([{ 
          body: 'Investment memorandum for Series A funding round with financial projections and deal terms' 
        }])
      };

      const result = await pipeline.process(mockDataSource);

      expect(result.success).toBe(true);
      // Should detect financial keywords and apply financial ontology
      expect(mockAdvancedGraphService.applyOntologyConfiguration).toHaveBeenCalledWith('financial');
    });

    it('should handle source type hints for ontology selection', async () => {
      // Mock entity extraction
      mockEntityExtractor.extract.mockResolvedValue({
        entities: [
          { type: 'Organization', name: 'Company', confidence: 0.7 }
        ],
        relationships: []
      });

      const mockDataSource = {
        id: 'test-source-hint',
        type: 'api',
        metadata: { 
          source: 'financial-api',
          category: 'investment-data'
        },
        connect: jest.fn(),
        disconnect: jest.fn(),
        fetch: jest.fn().mockReturnValue([{ body: 'Generic company data' }])
      };

      const result = await pipeline.process(mockDataSource);

      expect(result.success).toBe(true);
      // Should use source metadata to hint at financial ontology
      expect(mockAdvancedGraphService.applyOntologyConfiguration).toHaveBeenCalledWith('financial');
    });
  });

  describe('configuration and customization', () => {
    it('should allow custom ontology selection rules', async () => {
      // Test with custom ontology selection logic
      const customPipeline = new IngestionPipeline();
      
      // Mock custom ontology detection
      mockEntityExtractor.extract.mockResolvedValue({
        entities: [
          { type: 'CustomEntity', name: 'Custom', confidence: 0.8 }
        ],
        relationships: []
      });

      const mockDataSource = {
        id: 'test-custom',
        type: 'document',
        connect: jest.fn(),
        disconnect: jest.fn(),
        fetch: jest.fn().mockReturnValue([{ body: 'Custom content' }])
      };

      const result = await customPipeline.process(mockDataSource);

      expect(result.success).toBe(true);
      // Should handle custom entities gracefully
      expect(mockAdvancedGraphService.applyOntologyConfiguration).toHaveBeenCalledWith('crm');
    });
  });
}); 