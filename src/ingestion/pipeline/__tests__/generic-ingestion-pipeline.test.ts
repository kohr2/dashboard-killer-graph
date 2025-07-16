import { GenericIngestionPipeline, IngestionInput } from '../generic-ingestion-pipeline';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('GenericIngestionPipeline - Ontology-Agnostic Relationship Inference', () => {
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
            { id: '2', type: 'PaymentExecutor', name: 'Bank XYZ' },
            { id: '3', type: 'Buyer', name: 'Government Agency' },
            { id: '4', type: 'Winner', name: 'Company ABC' }
          ],
          relationships: []
        }
      ])
    };

    // Mock Neo4j service
    mockNeo4jService = {
      ingestEntitiesAndRelationships: jest.fn().mockResolvedValue({})
    };

          // Mock path.join to return predictable paths
      mockPath.join.mockImplementation((...args) => args.join('/'));
      
      // Mock process.cwd to return a predictable path
      const mockCwd = '/mock/project/root';
      jest.spyOn(process, 'cwd').mockReturnValue(mockCwd);
  });

  describe('inferRelationships - Ontology-Agnostic Behavior', () => {
    it('should load relationships from ontology.json file when ontologyName is provided', () => {
      // Arrange
      const mockOntologyData = {
        relationships: [
          {
            name: 'definesPaymentExecutor',
            source: 'Contract',
            target: 'PaymentExecutor'
          },
          {
            name: 'awardsTo',
            source: 'Buyer',
            target: 'Winner'
          }
        ]
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockOntologyData));

      pipeline = new GenericIngestionPipeline(
        mockProcessingService,
        mockNeo4jService,
        undefined,
        (input: IngestionInput) => input.content,
        'procurement'
      );

      // Act - Access the private method through reflection or create a test helper
      const entities = [
        { id: '1', type: 'Contract', name: 'Contract A' },
        { id: '2', type: 'PaymentExecutor', name: 'Bank XYZ' },
        { id: '3', type: 'Buyer', name: 'Government Agency' },
        { id: '4', type: 'Winner', name: 'Company ABC' }
      ];

      // Use a test helper to access the private method
      const inferredRelationships = (pipeline as any).inferRelationships(entities);

      // Assert
      expect(mockFs.existsSync).toHaveBeenCalledWith('/mock/project/root/ontologies/procurement/ontology.json');
      expect(mockFs.readFileSync).toHaveBeenCalledWith('/mock/project/root/ontologies/procurement/ontology.json', 'utf8');
      expect(inferredRelationships).toHaveLength(2);
      expect(inferredRelationships).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'definesPaymentExecutor',
            source: '1',
            target: '2',
            confidence: 0.8
          }),
          expect.objectContaining({
            type: 'awardsTo',
            source: '3',
            target: '4',
            confidence: 0.8
          })
        ])
      );
    });

    it('should handle missing ontology.json file gracefully', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);

      pipeline = new GenericIngestionPipeline(
        mockProcessingService,
        mockNeo4jService,
        undefined,
        (input: IngestionInput) => input.content,
        'ocream' // Use a real ontology that might not have ontology.json
      );

      const entities = [
        { id: '1', type: 'Contract', name: 'Contract A' },
        { id: '2', type: 'PaymentExecutor', name: 'Bank XYZ' }
      ];

      // Act
      const inferredRelationships = (pipeline as any).inferRelationships(entities);

      // Assert
      expect(mockFs.existsSync).toHaveBeenCalledWith('/mock/project/root/ontologies/ocream/ontology.json');
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
      expect(inferredRelationships).toHaveLength(0);
    });

    it('should handle malformed ontology.json file gracefully', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      pipeline = new GenericIngestionPipeline(
        mockProcessingService,
        mockNeo4jService,
        undefined,
        (input: IngestionInput) => input.content,
        'testont' // Use a real ontology that might have malformed JSON
      );

      const entities = [
        { id: '1', type: 'Contract', name: 'Contract A' },
        { id: '2', type: 'PaymentExecutor', name: 'Bank XYZ' }
      ];

      // Act
      const inferredRelationships = (pipeline as any).inferRelationships(entities);

      // Assert
      expect(mockFs.existsSync).toHaveBeenCalledWith('/mock/project/root/ontologies/testont/ontology.json');
      expect(mockFs.readFileSync).toHaveBeenCalled();
      expect(inferredRelationships).toHaveLength(0);
    });

    it('should work with different ontologies without hardcoded rules', () => {
      // Arrange - Financial ontology
      const mockFinancialOntology = {
        relationships: [
          {
            name: 'investsIn',
            source: 'Investor',
            target: 'Company'
          },
          {
            name: 'manages',
            source: 'FundManager',
            target: 'Portfolio'
          }
        ]
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockFinancialOntology));

      pipeline = new GenericIngestionPipeline(
        mockProcessingService,
        mockNeo4jService,
        undefined,
        (input: IngestionInput) => input.content,
        'financial'
      );

      const entities = [
        { id: '1', type: 'Investor', name: 'Venture Capital' },
        { id: '2', type: 'Company', name: 'Tech Startup' },
        { id: '3', type: 'FundManager', name: 'John Doe' },
        { id: '4', type: 'Portfolio', name: 'Growth Fund' }
      ];

      // Act
      const inferredRelationships = (pipeline as any).inferRelationships(entities);

      // Assert
      expect(mockFs.existsSync).toHaveBeenCalledWith('/mock/project/root/ontologies/financial/ontology.json');
      expect(inferredRelationships).toHaveLength(2);
      expect(inferredRelationships).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'investsIn',
            source: '1',
            target: '2',
            confidence: 0.8
          }),
          expect.objectContaining({
            type: 'manages',
            source: '3',
            target: '4',
            confidence: 0.8
          })
        ])
      );
    });

    it('should not create relationships when entities do not match ontology patterns', () => {
      // Arrange
      const mockOntologyData = {
        relationships: [
          {
            name: 'definesPaymentExecutor',
            source: 'Contract',
            target: 'PaymentExecutor'
          }
        ]
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockOntologyData));

      pipeline = new GenericIngestionPipeline(
        mockProcessingService,
        mockNeo4jService,
        undefined,
        (input: IngestionInput) => input.content,
        'procurement'
      );

      // Entities that don't match the ontology relationship patterns
      const entities = [
        { id: '1', type: 'Buyer', name: 'Government Agency' },
        { id: '2', type: 'Winner', name: 'Company ABC' }
      ];

      // Act
      const inferredRelationships = (pipeline as any).inferRelationships(entities);

      // Assert
      expect(inferredRelationships).toHaveLength(0);
    });

    it('should work without ontologyName (no relationships inferred)', () => {
      // Arrange
      pipeline = new GenericIngestionPipeline(
        mockProcessingService,
        mockNeo4jService,
        undefined,
        (input: IngestionInput) => input.content
        // No ontologyName provided
      );

      const entities = [
        { id: '1', type: 'Contract', name: 'Contract A' },
        { id: '2', type: 'PaymentExecutor', name: 'Bank XYZ' }
      ];

      // Act
      const inferredRelationships = (pipeline as any).inferRelationships(entities);

      // Assert
      expect(mockFs.existsSync).not.toHaveBeenCalled();
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
      expect(inferredRelationships).toHaveLength(0);
    });
  });

  describe('run method - Integration with relationship inference', () => {
    it('should merge inferred relationships with extracted relationships', async () => {
      // Arrange
      const mockOntologyData = {
        relationships: [
          {
            name: 'definesPaymentExecutor',
            source: 'Contract',
            target: 'PaymentExecutor'
          }
        ]
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockOntologyData));

      mockProcessingService.processContentBatch.mockResolvedValue([
        {
          entities: [
            { id: '1', type: 'Contract', name: 'Contract A' },
            { id: '2', type: 'PaymentExecutor', name: 'Bank XYZ' }
          ],
          relationships: [
            { type: 'MENTIONS', source: '1', target: '2' }
          ]
        }
      ]);

      pipeline = new GenericIngestionPipeline(
        mockProcessingService,
        mockNeo4jService,
        undefined,
        (input: IngestionInput) => input.content,
        'procurement'
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
      expect(mockNeo4jService.ingestEntitiesAndRelationships).toHaveBeenCalledWith(
        expect.objectContaining({
          entities: expect.arrayContaining([
            { id: '1', type: 'Contract', name: 'Contract A' },
            { id: '2', type: 'PaymentExecutor', name: 'Bank XYZ' }
          ]),
          relationships: expect.arrayContaining([
            { type: 'MENTIONS', source: '1', target: '2' },
            { type: 'definesPaymentExecutor', source: '1', target: '2', confidence: 0.8 }
          ])
        })
      );
    });
  });
}); 