import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { ContentProcessingService, buildOntologySyncPayload, buildCompactOntologySyncPayload } from '../content-processing.service';
import { EnrichmentOrchestratorService } from '@platform/enrichment';
import { OntologyService } from '@platform/ontology/ontology.service';
import { container } from 'tsyringe';
import axios from 'axios';

// Mock dependencies
jest.mock('@shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('axios');
jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn(),
  },
}));

jest.mock('@platform/enrichment', () => ({
  EnrichmentOrchestratorService: jest.fn(),
}));

jest.mock('@platform/ontology/ontology.service');

describe('ContentProcessingService', () => {
  let service: ContentProcessingService;
  let mockEnrichmentOrchestrator: jest.Mocked<EnrichmentOrchestratorService>;
  let mockOntologyService: jest.Mocked<OntologyService>;
  let mockAxios: jest.Mocked<typeof axios>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock enrichment orchestrator
    mockEnrichmentOrchestrator = {
      getService: jest.fn(),
    } as any;

    // Create mock ontology service
    mockOntologyService = {
      getAllOntologies: jest.fn(),
      getAllEntityTypes: jest.fn(),
      getEnrichmentServiceName: jest.fn(),
    } as any;

    // Setup container.resolve mocks
    (container.resolve as jest.Mock)
      .mockReturnValue(mockOntologyService)
      .mockReturnValueOnce(mockOntologyService);

    // Setup axios mock
    mockAxios = axios as jest.Mocked<typeof axios>;
    mockAxios.post = jest.fn() as any;
    mockAxios.isAxiosError = jest.fn() as any;

    // Create service instance
    service = new ContentProcessingService(mockEnrichmentOrchestrator);
  });

  describe('constructor', () => {
    it('should create service with provided enrichment orchestrator', () => {
      const customOrchestrator = {} as EnrichmentOrchestratorService;
      const customService = new ContentProcessingService(customOrchestrator);
      
      expect(customService).toBeInstanceOf(ContentProcessingService);
    });

    it('should create service with default enrichment orchestrator from container', () => {
      const defaultService = new ContentProcessingService();
      
      expect(defaultService).toBeInstanceOf(ContentProcessingService);
      expect(container.resolve).toHaveBeenCalledWith(EnrichmentOrchestratorService);
    });
  });

  describe('buildOntologySyncPayload', () => {
    it('should build payload with all ontology data', () => {
      const mockOntologies = [
        {
          name: 'test-ontology',
          entities: [
            { name: 'Person', description: 'A human being' },
            { name: 'Company', description: 'A business entity', isProperty: true },
          ],
          relationships: [
            { name: 'WORKS_FOR', source: 'Person', target: 'Company', description: 'Employment relationship' },
          ],
        },
      ];

      mockOntologyService.getAllOntologies.mockReturnValue(mockOntologies);

      const result = buildOntologySyncPayload(mockOntologyService);

      expect(result).toEqual({
        ontologyName: undefined,
        entity_types: ['Person', 'Company'],
        relationship_types: ['WORKS_FOR'],
        property_types: ['Company'],
        entity_descriptions: {
          'Person': 'A human being',
          'Company': 'A business entity',
        },
        relationship_descriptions: {
          'WORKS_FOR': 'Employment relationship',
        },
        relationship_patterns: ['Person-WORKS_FOR->Company'],
      });
    });

    it('should filter by ontology name when provided', () => {
      const mockOntologies = [
        {
          name: 'test-ontology',
          entities: [{ name: 'Person' }],
          relationships: [{ name: 'WORKS_FOR', source: 'Person', target: 'Company' }],
        },
        {
          name: 'other-ontology',
          entities: [{ name: 'OtherEntity' }],
          relationships: [{ name: 'OTHER_REL', source: 'OtherEntity', target: 'OtherTarget' }],
        },
      ];

      mockOntologyService.getAllOntologies.mockReturnValue(mockOntologies);

      const result = buildOntologySyncPayload(mockOntologyService, 'test-ontology');

      expect(result.entity_types).toContain('Person');
      expect(result.entity_types).not.toContain('OtherEntity');
      expect(result.relationship_types).toContain('WORKS_FOR');
      expect(result.relationship_types).not.toContain('OTHER_REL');
    });

    it('should handle entities as object format', () => {
      const mockOntologies = [
        {
          name: 'test-ontology',
          entities: {
            'Person': { name: 'Person', description: 'A human being' },
            'Company': { name: 'Company', description: 'A business entity' },
          },
          relationships: {
            'WORKS_FOR': { name: 'WORKS_FOR', source: 'Person', target: 'Company' },
          },
        },
      ];

      mockOntologyService.getAllOntologies.mockReturnValue(mockOntologies);

      const result = buildOntologySyncPayload(mockOntologyService);

      expect(result.entity_types).toEqual(['Person', 'Company']);
      expect(result.relationship_types).toEqual(['WORKS_FOR']);
    });

    it('should handle missing descriptions gracefully', () => {
      const mockOntologies = [
        {
          name: 'test-ontology',
          entities: [{ name: 'Person' }],
          relationships: [{ name: 'WORKS_FOR', source: 'Person', target: 'Company' }],
        },
      ];

      mockOntologyService.getAllOntologies.mockReturnValue(mockOntologies);

      const result = buildOntologySyncPayload(mockOntologyService);

      expect(result.entity_descriptions).toBeUndefined();
      expect(result.relationship_descriptions).toBeUndefined();
    });
  });

  describe('buildCompactOntologySyncPayload', () => {
    it('should build compact payload with entity and relationship arrays', () => {
      const mockOntologies = [
        {
          name: 'test-ontology',
          entities: [
            { name: 'Person' },
            { name: 'Company' },
          ],
          relationships: [
            { name: 'WORKS_FOR', source: 'Person', target: 'Company' },
          ],
        },
      ];

      mockOntologyService.getAllOntologies.mockReturnValue(mockOntologies);

      const result = buildCompactOntologySyncPayload(mockOntologyService);

      expect(result).toEqual({
        ontology: undefined,
        compact_ontology: {
          e: ['Person', 'Company'],
          r: [['Person', 'WORKS_FOR', 'Company']],
        },
      });
    });

    it('should filter by ontology name when provided', () => {
      const mockOntologies = [
        {
          name: 'test-ontology',
          entities: [{ name: 'Person' }],
          relationships: [{ name: 'WORKS_FOR', source: 'Person', target: 'Company' }],
        },
        {
          name: 'other-ontology',
          entities: [{ name: 'OtherEntity' }],
          relationships: [{ name: 'OTHER_REL', source: 'OtherEntity', target: 'OtherTarget' }],
        },
      ];

      mockOntologyService.getAllOntologies.mockReturnValue(mockOntologies);

      const result = buildCompactOntologySyncPayload(mockOntologyService, 'test-ontology');

      expect(result.compact_ontology.e).toContain('Person');
      expect(result.compact_ontology.e).not.toContain('OtherEntity');
    });
  });

  describe('processContentBatch', () => {
    it('should process content batch successfully', async () => {
      const mockOntologies = [{ name: 'test-ontology', entities: [{ name: 'Person' }] }];
      mockOntologyService.getAllOntologies.mockReturnValue(mockOntologies);
      mockOntologyService.getEnrichmentServiceName.mockReturnValue('test-service');

      const mockEnrichmentService = {
        name: 'test-service',
        enrich: (jest.fn() as any).mockResolvedValue({
          success: true,
          data: { enriched: true },
        }),
      } as any;
      mockEnrichmentOrchestrator.getService.mockReturnValue(mockEnrichmentService);

      const mockNlpResponse = {
        data: [
          {
            entities: [
              { value: 'John Doe', type: 'Person', properties: {} },
            ],
            relationships: [
              { source: 'John Doe', target: 'Company', type: 'WORKS_FOR' },
            ],
          },
        ],
      };

      const mockEmbeddingResponse = {
        data: { embeddings: [[0.1, 0.2, 0.3]] },
      };

      mockAxios.post
        .mockResolvedValueOnce(mockNlpResponse) // Ontology sync
        .mockResolvedValueOnce(mockEmbeddingResponse); // Embeddings

      const result = await service.processContentBatch(['Test content'], 'test-ontology');

      expect(result).toHaveLength(1);
      expect(result[0].entities).toHaveLength(1);
      expect(result[0].entities[0].name).toBe('John Doe');
      expect(result[0].entities[0].type).toBe('Person');
      expect(result[0].entities[0].embedding).toEqual([0.1, 0.2, 0.3]);
      expect(result[0].relationships).toHaveLength(1);
    });

    it('should handle ontology sync failure gracefully', async () => {
      const mockOntologies = [{ name: 'test-ontology', entities: [{ name: 'Person' }] }];
      mockOntologyService.getAllOntologies.mockReturnValue(mockOntologies);

      mockAxios.post
        .mockRejectedValueOnce(new Error('Sync failed')) // Ontology sync fails
        .mockResolvedValueOnce({ data: [] }); // NLP response

      const result = await service.processContentBatch(['Test content']);

      expect(result).toEqual([]);
    });

    it('should handle NLP service errors', async () => {
      const mockOntologies = [{ name: 'test-ontology', entities: [{ name: 'Person' }] }];
      mockOntologyService.getAllOntologies.mockReturnValue(mockOntologies);

      mockAxios.post
        .mockResolvedValueOnce({ data: [] }) // Ontology sync
        .mockRejectedValueOnce(new Error('NLP service error')); // NLP call fails

      const result = await service.processContentBatch(['Test content']);

      expect(result).toEqual([]);
    });

    it('should handle enrichment service errors', async () => {
      const mockOntologies = [{ name: 'test-ontology', entities: [{ name: 'Person' }] }];
      mockOntologyService.getAllOntologies.mockReturnValue(mockOntologies);
      mockOntologyService.getEnrichmentServiceName.mockReturnValue('test-service');

      const mockEnrichmentService = {
        name: 'test-service',
        enrich: (jest.fn() as any).mockRejectedValue(new Error('Enrichment failed')),
      } as any;
      mockEnrichmentOrchestrator.getService.mockReturnValue(mockEnrichmentService);

      const mockNlpResponse = {
        data: [
          {
            entities: [{ value: 'John Doe', type: 'Person', properties: {} }],
            relationships: [],
          },
        ],
      };

      mockAxios.post
        .mockResolvedValueOnce({ data: [] }) // Ontology sync
        .mockResolvedValueOnce(mockNlpResponse) // NLP response
        .mockResolvedValueOnce({ data: { embeddings: [[0.1, 0.2, 0.3]] } }); // Embeddings

      const result = await service.processContentBatch(['Test content']);

      expect(result).toHaveLength(1);
      expect(result[0].entities).toHaveLength(1);
      // Should still return the entity even if enrichment failed
      expect(result[0].entities[0].name).toBe('John Doe');
    });

    it('should handle different enrichment result formats', async () => {
      const mockOntologies = [{ name: 'test-ontology', entities: [{ name: 'Person' }] }];
      mockOntologyService.getAllOntologies.mockReturnValue(mockOntologies);
      mockOntologyService.getEnrichmentServiceName.mockReturnValue('test-service');

      const mockEnrichmentService = {
        name: 'test-service',
        enrich: (jest.fn() as any).mockResolvedValue({
          id: 'enriched-id',
          name: 'Enriched Name',
          type: 'Person',
        }),
      } as any;
      mockEnrichmentOrchestrator.getService.mockReturnValue(mockEnrichmentService);

      const mockNlpResponse = {
        data: [
          {
            entities: [{ value: 'John Doe', type: 'Person', properties: {} }],
            relationships: [],
          },
        ],
      };

      mockAxios.post
        .mockResolvedValueOnce({ data: [] }) // Ontology sync
        .mockResolvedValueOnce(mockNlpResponse) // NLP response
        .mockResolvedValueOnce({ data: { embeddings: [[0.1, 0.2, 0.3]] } }); // Embeddings

      const result = await service.processContentBatch(['Test content']);

      expect(result).toHaveLength(1);
      expect(result[0].entities).toHaveLength(1);
      expect(result[0].entities[0].properties).toHaveProperty('id', 'enriched-id');
    });

    it('should handle nested graphs response format', async () => {
      const mockOntologies = [{ name: 'test-ontology', entities: [{ name: 'Person' }] }];
      mockOntologyService.getAllOntologies.mockReturnValue(mockOntologies);

      const mockNlpResponse = {
        data: {
          graphs: [
            {
              entities: [{ value: 'John Doe', type: 'Person', properties: {} }],
              relationships: [],
            },
          ],
        },
      };

      mockAxios.post
        .mockResolvedValueOnce({ data: [] }) // Ontology sync
        .mockResolvedValueOnce(mockNlpResponse) // NLP response
        .mockResolvedValueOnce({ data: { embeddings: [[0.1, 0.2, 0.3]] } }); // Embeddings

      const result = await service.processContentBatch(['Test content']);

      expect(result).toHaveLength(1);
      expect(result[0].entities).toHaveLength(1);
    });

    it('should handle invalid NLP response gracefully', async () => {
      const mockOntologies = [{ name: 'test-ontology', entities: [{ name: 'Person' }] }];
      mockOntologyService.getAllOntologies.mockReturnValue(mockOntologies);

      const mockNlpResponse = {
        data: 'invalid-response',
      };

      mockAxios.post
        .mockResolvedValueOnce({ data: [] }) // Ontology sync
        .mockResolvedValueOnce(mockNlpResponse); // Invalid NLP response

      const result = await service.processContentBatch(['Test content']);

      expect(result).toEqual([]);
    });

    it('should handle embedding generation failure', async () => {
      const mockOntologies = [{ name: 'test-ontology', entities: [{ name: 'Person' }] }];
      mockOntologyService.getAllOntologies.mockReturnValue(mockOntologies);

      const mockNlpResponse = {
        data: [
          {
            entities: [{ value: 'John Doe', type: 'Person', properties: {} }],
            relationships: [],
          },
        ],
      };

      mockAxios.post
        .mockResolvedValueOnce({ data: [] }) // Ontology sync
        .mockResolvedValueOnce(mockNlpResponse) // NLP response
        .mockRejectedValueOnce(new Error('Embedding failed')); // Embeddings fail

      const result = await service.processContentBatch(['Test content']);

      expect(result).toHaveLength(1);
      expect(result[0].entities).toHaveLength(1);
      // Should still return entities even if embeddings failed
      expect(result[0].entities[0].name).toBe('John Doe');
    });
  });

  describe('normaliseEntityType', () => {
    it('should return exact match when found', () => {
      mockOntologyService.getAllEntityTypes.mockReturnValue(['Person', 'Company']);

      const result = ContentProcessingService.normaliseEntityType('Person');

      expect(result).toBe('Person');
    });

    it('should return undefined when no match found', () => {
      mockOntologyService.getAllEntityTypes.mockReturnValue(['Person', 'Company']);

      const result = ContentProcessingService.normaliseEntityType('UnknownType');

      expect(result).toBeUndefined();
    });

    it('should handle case-insensitive matching', () => {
      mockOntologyService.getAllEntityTypes.mockReturnValue(['Person', 'Company']);

      const result = ContentProcessingService.normaliseEntityType('person');

      expect(result).toBe('Person');
    });

    it('should handle whitespace and special characters', () => {
      mockOntologyService.getAllEntityTypes.mockReturnValue(['Person', 'Company']);

      const result = ContentProcessingService.normaliseEntityType('  Person-Entity  ');

      expect(result).toBe('Person');
    });

    it('should handle underscores and dashes', () => {
      mockOntologyService.getAllEntityTypes.mockReturnValue(['Person', 'Company']);

      const result = ContentProcessingService.normaliseEntityType('person_entity');

      expect(result).toBe('Person');
    });
  });

  describe('ontology synchronization', () => {
    it('should sync ontology only once per ontology name', async () => {
      const mockOntologies = [{ name: 'test-ontology', entities: [{ name: 'Person' }] }];
      mockOntologyService.getAllOntologies.mockReturnValue(mockOntologies);

      mockAxios.post.mockResolvedValue({ data: [] });

      // First call
      await service.processContentBatch(['Content 1'], 'test-ontology');
      // Second call with same ontology
      await service.processContentBatch(['Content 2'], 'test-ontology');

      // Should only sync once per ontology
      expect(mockAxios.post).toHaveBeenCalledTimes(3); // 1 sync + 2 NLP calls
    });

    it('should sync different ontologies separately', async () => {
      const mockOntologies = [
        { name: 'test-ontology', entities: [{ name: 'Person' }] },
        { name: 'other-ontology', entities: [{ name: 'Company' }] },
      ];
      mockOntologyService.getAllOntologies.mockReturnValue(mockOntologies);

      mockAxios.post.mockResolvedValue({ data: [] });

      await service.processContentBatch(['Content 1'], 'test-ontology');
      await service.processContentBatch(['Content 2'], 'other-ontology');

      // Should sync both ontologies
      expect(mockAxios.post).toHaveBeenCalledTimes(4); // 2 syncs + 2 NLP calls
    });
  });
}); 