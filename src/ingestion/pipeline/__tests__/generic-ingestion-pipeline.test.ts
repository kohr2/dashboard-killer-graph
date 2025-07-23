import { GenericIngestionPipeline, IngestionInput } from '../generic-ingestion-pipeline';

describe('GenericIngestionPipeline', () => {
  let pipeline: GenericIngestionPipeline;
  let mockProcessingService: any;
  let mockNeo4jService: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock processing service
    mockProcessingService = {
      processContentBatch: jest.fn().mockResolvedValue([
        {
          entities: [
            { id: '1', type: 'Contract', name: 'Contract A' },
            { id: '2', type: 'PaymentExecutor', name: 'Bank XYZ' }
          ],
          relationships: [
            { type: 'MENTIONS', source: '1', target: '2' }
          ]
        }
      ])
    };

    // Mock Neo4j service
    mockNeo4jService = {
      ingestEntitiesAndRelationships: jest.fn().mockResolvedValue({})
    };
  });

  describe('run method', () => {
    it('should process content and store entities and relationships', async () => {
      // Arrange
      pipeline = new GenericIngestionPipeline(
        mockProcessingService,
        mockNeo4jService,
        undefined,
        (input: IngestionInput) => input.content
      );

      const inputs: IngestionInput[] = [
        {
          id: 'test-1',
          content: 'Test content',
          meta: {}
        }
      ];

      // Act
      await pipeline.run(inputs);

      // Assert
      expect(mockProcessingService.processContentBatch).toHaveBeenCalledWith(['Test content'], undefined);
      expect(mockNeo4jService.ingestEntitiesAndRelationships).toHaveBeenCalledWith(
        expect.objectContaining({
          entities: expect.arrayContaining([
            { id: '1', type: 'Contract', name: 'Contract A' },
            { id: '2', type: 'PaymentExecutor', name: 'Bank XYZ' }
          ]),
          relationships: expect.arrayContaining([
            { type: 'MENTIONS', source: '1', target: '2' }
          ])
        })
      );
    });

    it('should handle empty inputs gracefully', async () => {
      // Arrange
      mockProcessingService.processContentBatch.mockResolvedValue([]);
      
      pipeline = new GenericIngestionPipeline(
        mockProcessingService,
        mockNeo4jService,
        undefined,
        (input: IngestionInput) => input.content
      );

      const inputs: IngestionInput[] = [];

      // Act
      await pipeline.run(inputs);

      // Assert
      expect(mockProcessingService.processContentBatch).toHaveBeenCalledWith([], undefined);
      expect(mockNeo4jService.ingestEntitiesAndRelationships).not.toHaveBeenCalled();
    });

    it('should handle processing service errors gracefully', async () => {
      // Arrange
      mockProcessingService.processContentBatch.mockRejectedValue(new Error('Processing failed'));
      
      pipeline = new GenericIngestionPipeline(
        mockProcessingService,
        mockNeo4jService,
        undefined,
        (input: IngestionInput) => input.content
      );

      const inputs: IngestionInput[] = [
        {
          id: 'test-1',
          content: 'Test content',
          meta: {}
        }
      ];

      // Act & Assert
      await expect(pipeline.run(inputs)).rejects.toThrow('Processing failed');
      expect(mockNeo4jService.ingestEntitiesAndRelationships).not.toHaveBeenCalled();
    });
  });
}); 