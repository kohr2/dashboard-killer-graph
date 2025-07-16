import { RelationshipInferenceService, Entity, InferredRelationship } from '../relationship-inference.service';
import { promises as fs } from 'fs';
import path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
  },
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn(),
}));

// Mock process.cwd
jest.mock('process', () => ({
  cwd: jest.fn(),
}));

describe('RelationshipInferenceService', () => {
  let service: RelationshipInferenceService;
  let mockFs: jest.Mocked<typeof fs>;
  let mockPath: jest.Mocked<typeof path>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockFs = fs as jest.Mocked<typeof fs>;
    mockPath = path as jest.Mocked<typeof path>;
    
    // Mock path.join to return predictable paths
    mockPath.join.mockImplementation((...args) => args.join('/'));
    
    // Mock process.cwd to return a predictable path
    const mockCwd = '/mock/project/root';
    jest.spyOn(process, 'cwd').mockReturnValue(mockCwd);
    
    service = new RelationshipInferenceService();
  });

  describe('inferRelationships', () => {
    it('should infer relationships based on ontology rules', async () => {
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

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockOntologyData));

      const entities: Entity[] = [
        { id: '1', type: 'Contract', name: 'Contract A' },
        { id: '2', type: 'PaymentExecutor', name: 'Bank XYZ' },
        { id: '3', type: 'Buyer', name: 'Government Agency' },
        { id: '4', type: 'Winner', name: 'Company ABC' }
      ];

      // Act
      const result = await service.inferRelationships(entities, { ontologyName: 'procurement' });

      // Assert
      expect(mockFs.access).toHaveBeenCalledWith('/mock/project/root/ontologies/procurement/ontology.json');
      expect(mockFs.readFile).toHaveBeenCalledWith('/mock/project/root/ontologies/procurement/ontology.json', 'utf8');
      expect(result).toHaveLength(2);
      expect(result).toEqual(
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

    it('should handle missing ontology file gracefully', async () => {
      // Arrange
      mockFs.access.mockRejectedValue(new Error('File not found'));

      const entities: Entity[] = [
        { id: '1', type: 'Contract', name: 'Contract A' },
        { id: '2', type: 'PaymentExecutor', name: 'Bank XYZ' }
      ];

      // Act
      const result = await service.inferRelationships(entities, { ontologyName: 'nonexistent' });

      // Assert
      expect(mockFs.access).toHaveBeenCalledWith('/mock/project/root/ontologies/nonexistent/ontology.json');
      expect(mockFs.readFile).not.toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });

    it('should handle malformed ontology file gracefully', async () => {
      // Arrange
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue(new Error('Invalid JSON'));

      const entities: Entity[] = [
        { id: '1', type: 'Contract', name: 'Contract A' },
        { id: '2', type: 'PaymentExecutor', name: 'Bank XYZ' }
      ];

      // Act
      const result = await service.inferRelationships(entities, { ontologyName: 'malformed' });

      // Assert
      expect(mockFs.access).toHaveBeenCalledWith('/mock/project/root/ontologies/malformed/ontology.json');
      expect(mockFs.readFile).toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });

    it('should work with different ontologies without hardcoded rules', async () => {
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

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockFinancialOntology));

      const entities: Entity[] = [
        { id: '1', type: 'Investor', name: 'Venture Capital' },
        { id: '2', type: 'Company', name: 'Tech Startup' },
        { id: '3', type: 'FundManager', name: 'John Doe' },
        { id: '4', type: 'Portfolio', name: 'Growth Fund' }
      ];

      // Act
      const result = await service.inferRelationships(entities, { ontologyName: 'financial' });

      // Assert
      expect(mockFs.access).toHaveBeenCalledWith('/mock/project/root/ontologies/financial/ontology.json');
      expect(result).toHaveLength(2);
      expect(result).toEqual(
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

    it('should not create relationships when entities do not match ontology patterns', async () => {
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

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockOntologyData));

      const entities: Entity[] = [
        { id: '1', type: 'Contract', name: 'Contract A' },
        { id: '2', type: 'Buyer', name: 'Government Agency' }
        // Missing PaymentExecutor entity
      ];

      // Act
      const result = await service.inferRelationships(entities, { ontologyName: 'procurement' });

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should respect confidence threshold option', async () => {
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

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockOntologyData));

      const entities: Entity[] = [
        { id: '1', type: 'Contract', name: 'Contract A' },
        { id: '2', type: 'PaymentExecutor', name: 'Bank XYZ' }
      ];

      // Act
      const result = await service.inferRelationships(entities, { 
        ontologyName: 'procurement',
        confidenceThreshold: 0.9
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].confidence).toBe(0.9);
    });

    it('should respect max relationships limit', async () => {
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
          },
          {
            name: 'manages',
            source: 'Manager',
            target: 'Project'
          }
        ]
      };

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockOntologyData));

      const entities: Entity[] = [
        { id: '1', type: 'Contract', name: 'Contract A' },
        { id: '2', type: 'PaymentExecutor', name: 'Bank XYZ' },
        { id: '3', type: 'Buyer', name: 'Government Agency' },
        { id: '4', type: 'Winner', name: 'Company ABC' },
        { id: '5', type: 'Manager', name: 'John Doe' },
        { id: '6', type: 'Project', name: 'Infrastructure Project' }
      ];

      // Act
      const result = await service.inferRelationships(entities, { 
        ontologyName: 'procurement',
        maxRelationships: 2
      });

      // Assert
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no ontology name is provided', async () => {
      // Arrange
      const entities: Entity[] = [
        { id: '1', type: 'Contract', name: 'Contract A' },
        { id: '2', type: 'PaymentExecutor', name: 'Bank XYZ' }
      ];

      // Act
      const result = await service.inferRelationships(entities);

      // Assert
      expect(mockFs.access).not.toHaveBeenCalled();
      expect(mockFs.readFile).not.toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });
  });

  describe('validateInferredRelationships', () => {
    it('should filter out relationships with invalid entity IDs', () => {
      // Arrange
      const entities: Entity[] = [
        { id: '1', type: 'Contract', name: 'Contract A' },
        { id: '2', type: 'PaymentExecutor', name: 'Bank XYZ' }
      ];

      const relationships: InferredRelationship[] = [
        { type: 'definesPaymentExecutor', source: '1', target: '2', confidence: 0.8 },
        { type: 'definesPaymentExecutor', source: '1', target: '3', confidence: 0.8 }, // Invalid target
        { type: 'definesPaymentExecutor', source: '4', target: '2', confidence: 0.8 }  // Invalid source
      ];

      // Act
      const result = service.validateInferredRelationships(relationships, entities);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'definesPaymentExecutor',
        source: '1',
        target: '2',
        confidence: 0.8
      });
    });

    it('should return all relationships when all are valid', () => {
      // Arrange
      const entities: Entity[] = [
        { id: '1', type: 'Contract', name: 'Contract A' },
        { id: '2', type: 'PaymentExecutor', name: 'Bank XYZ' }
      ];

      const relationships: InferredRelationship[] = [
        { type: 'definesPaymentExecutor', source: '1', target: '2', confidence: 0.8 }
      ];

      // Act
      const result = service.validateInferredRelationships(relationships, entities);

      // Assert
      expect(result).toHaveLength(1);
      expect(result).toEqual(relationships);
    });
  });

  describe('deduplicateRelationships', () => {
    it('should remove duplicate relationships', () => {
      // Arrange
      const relationships: InferredRelationship[] = [
        { type: 'definesPaymentExecutor', source: '1', target: '2', confidence: 0.8 },
        { type: 'definesPaymentExecutor', source: '1', target: '2', confidence: 0.9 }, // Duplicate
        { type: 'awardsTo', source: '3', target: '4', confidence: 0.8 },
        { type: 'definesPaymentExecutor', source: '1', target: '2', confidence: 0.7 }  // Duplicate
      ];

      // Act
      const result = service.deduplicateRelationships(relationships);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'definesPaymentExecutor',
            source: '1',
            target: '2'
          }),
          expect.objectContaining({
            type: 'awardsTo',
            source: '3',
            target: '4'
          })
        ])
      );
    });

    it('should preserve relationships with different types', () => {
      // Arrange
      const relationships: InferredRelationship[] = [
        { type: 'definesPaymentExecutor', source: '1', target: '2', confidence: 0.8 },
        { type: 'awardsTo', source: '1', target: '2', confidence: 0.8 } // Different type, same entities
      ];

      // Act
      const result = service.deduplicateRelationships(relationships);

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe('getInferenceStats', () => {
    it('should return correct statistics', () => {
      // Arrange
      const entities: Entity[] = [
        { id: '1', type: 'Contract', name: 'Contract A' },
        { id: '2', type: 'PaymentExecutor', name: 'Bank XYZ' },
        { id: '3', type: 'Contract', name: 'Contract B' }
      ];

      const relationships: InferredRelationship[] = [
        { type: 'definesPaymentExecutor', source: '1', target: '2', confidence: 0.8 },
        { type: 'definesPaymentExecutor', source: '3', target: '2', confidence: 0.9 }
      ];

      // Act
      const result = service.getInferenceStats(entities, relationships);

      // Assert
      expect(result).toEqual({
        entityCount: 3,
        relationshipCount: 2,
        averageConfidence: expect.closeTo(0.85, 5),
        entityTypes: ['Contract', 'PaymentExecutor'],
        relationshipTypes: ['definesPaymentExecutor']
      });
    });

    it('should handle empty relationships', () => {
      // Arrange
      const entities: Entity[] = [
        { id: '1', type: 'Contract', name: 'Contract A' }
      ];

      const relationships: InferredRelationship[] = [];

      // Act
      const result = service.getInferenceStats(entities, relationships);

      // Assert
      expect(result).toEqual({
        entityCount: 1,
        relationshipCount: 0,
        averageConfidence: 0,
        entityTypes: ['Contract'],
        relationshipTypes: []
      });
    });
  });

  describe('LLM-based and ontology-agnostic inference', () => {
    class MockLLMService {
      async generateResponse(prompt: string): Promise<string> {
        return `\n\`\`\`json\n[
          { "relationshipName": "reportsTo", "sourceEntity": "buyer-1", "targetEntity": "payment-1", "explanation": "Michael Chen as buyer reports to the Finance Department for payment execution" },
          { "relationshipName": "supplies", "sourceEntity": "vendor-1", "targetEntity": "contract-1", "explanation": "BlueOcean Logistics supplies goods/services for the Purchase Order contract" },
          { "relationshipName": "oversees", "sourceEntity": "mediator-1", "targetEntity": "contract-1", "explanation": "Christopher Davis as mediator oversees the Purchase Order contract process" },
          { "relationshipName": "evaluates", "sourceEntity": "reviewer-1", "targetEntity": "contract-1", "explanation": "Dr. Rebecca Kim as reviewer evaluates the Purchase Order contract" },
          { "relationshipName": "governs", "sourceEntity": "framework-1", "targetEntity": "contract-1", "explanation": "Framework Agreement FA-2025-006 governs the Purchase Order contract" },
          { "relationshipName": "contains", "sourceEntity": "lot-group-1", "targetEntity": "contract-1", "explanation": "Lot Group LG-Materials-03 contains the items for the Purchase Order contract" },
          { "relationshipName": "processes", "sourceEntity": "payment-1", "targetEntity": "contract-1", "explanation": "Finance Department processes payment for the Purchase Order contract" },
          { "relationshipName": "signs", "sourceEntity": "buyer-1", "targetEntity": "contract-1", "explanation": "Michael Chen as buyer signs the Purchase Order contract" }
        ]\n\`\`\``;
      }
    }

    const mockEntities = [
      { id: 'buyer-1', type: 'Buyer', name: 'Michael Chen' },
      { id: 'vendor-1', type: 'Business', name: 'BlueOcean Logistics' },
      { id: 'contract-1', type: 'Contract', name: 'Purchase Order' },
      { id: 'framework-1', type: 'FrameworkAgreement', name: 'FA-2025-006' },
      { id: 'lot-group-1', type: 'LotGroup', name: 'LG-Materials-03' },
      { id: 'mediator-1', type: 'Mediator', name: 'Christopher Davis' },
      { id: 'reviewer-1', type: 'Reviewer', name: 'Dr. Rebecca Kim' },
      { id: 'payment-1', type: 'PaymentExecutor', name: 'Finance Department' }
    ];

    it('should infer relationships using only LLM (ontology-agnostic)', async () => {
      const service = new RelationshipInferenceService();
      const mockLLMService = new MockLLMService();
      const result = await service.inferRelationships(mockEntities, {
        useLLM: true,
        llmService: mockLLMService,
        confidenceThreshold: 0.8
      });
      expect(result).toHaveLength(8);
      expect(result.every(r => r.isInferred)).toBe(true);
      expect(result.map(r => r.type)).toEqual(
        expect.arrayContaining([
          'reportsTo:INFERRED',
          'supplies:INFERRED',
          'oversees:INFERRED',
          'evaluates:INFERRED',
          'governs:INFERRED',
          'contains:INFERRED',
          'processes:INFERRED',
          'signs:INFERRED'
        ])
      );
    });

    it('should infer relationships using both ontology and LLM', async () => {
      const service = new RelationshipInferenceService();
      // Mock ontology with only one relationship
      const mockOntologyData = {
        relationships: [
          { name: 'definesPaymentExecutor', source: 'Contract', target: 'PaymentExecutor' }
        ]
      };
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockOntologyData));
      const mockLLMService = new MockLLMService();
      const result = await service.inferRelationships(mockEntities, {
        ontologyName: 'procurement',
        useLLM: true,
        llmService: mockLLMService,
        confidenceThreshold: 0.8
      });
      // Should include both ontology and inferred relationships
      expect(result.length).toBeGreaterThan(8); // 8 LLM + 1 ontology
      expect(result.some(r => r.type === 'definesPaymentExecutor')).toBe(true);
      expect(result.some(r => r.type === 'reportsTo:INFERRED')).toBe(true);
      expect(result.some(r => r.isInferred)).toBe(true);
      expect(result.some(r => !r.isInferred)).toBe(true);
    });
  });
}); 