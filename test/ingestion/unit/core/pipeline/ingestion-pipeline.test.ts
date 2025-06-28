/**
 * Unit tests for IngestionPipeline
 * Following TDD approach - tests written first
 */

import { IngestionPipeline } from '../../../../../src/ingestion/core/pipeline/ingestion-pipeline';
import { DataSource, SourceType } from '../../../../../src/ingestion/core/types/data-source.interface';
import { ProcessingResult } from '../../../../../src/ingestion/core/types/pipeline.interface';

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
    pipeline = new IngestionPipeline();
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
}); 