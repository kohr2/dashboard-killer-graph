import { GenericIngestionPipeline, IngestionInput, IngestionResult } from '../generic-ingestion-pipeline';
import { mocked } from 'jest-mock';

describe('GenericIngestionPipeline', () => {
  const mockProcessingService = {
    processContentBatch: jest.fn()
  };
  const mockNeo4jService = {
    ingestEntitiesAndRelationships: jest.fn()
  };

  const sampleInput: IngestionInput[] = [
    { id: '1', content: 'foo', meta: { source: 'test1' } },
    { id: '2', content: 'bar', meta: { source: 'test2' } }
  ];

  const sampleProcessingResult: IngestionResult[] = [
    {
      entities: [{ id: 'a', type: 'EntityA' }],
      relationships: [{ source: 'a', target: 'b', type: 'REL' }]
    },
    {
      entities: [{ id: 'b', type: 'EntityB' }],
      relationships: []
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockProcessingService.processContentBatch.mockResolvedValue(sampleProcessingResult);
    mockNeo4jService.ingestEntitiesAndRelationships.mockResolvedValue(true);
  });

  it('should process content and ingest results into Neo4j', async () => {
    const pipeline = new GenericIngestionPipeline(
      mockProcessingService as any,
      mockNeo4jService as any
    );
    await pipeline.run(sampleInput);
    expect(mockProcessingService.processContentBatch).toHaveBeenCalledWith(['foo', 'bar']);
    expect(mockNeo4jService.ingestEntitiesAndRelationships).toHaveBeenCalledWith(sampleProcessingResult[0]);
    expect(mockNeo4jService.ingestEntitiesAndRelationships).toHaveBeenCalledWith(sampleProcessingResult[1]);
  });

  it('should allow custom extraction logic per input', async () => {
    const customExtractor = (input: IngestionInput) => input.content.toUpperCase();
    const pipeline = new GenericIngestionPipeline(
      mockProcessingService as any,
      mockNeo4jService as any,
      customExtractor
    );
    await pipeline.run(sampleInput);
    expect(mockProcessingService.processContentBatch).toHaveBeenCalledWith(['FOO', 'BAR']);
  });
}); 