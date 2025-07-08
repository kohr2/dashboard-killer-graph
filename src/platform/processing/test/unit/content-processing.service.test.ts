import 'reflect-metadata';
import { ContentProcessingService } from '../../content-processing.service';
import axios from 'axios';

// Mock axios pour contrôler les appels réseau
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ContentProcessingService', () => {
  let service: ContentProcessingService;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Réinitialise les mocks avant chaque test
    mockedAxios.post.mockClear();
    service = new ContentProcessingService();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('when NLP service fails', () => {
    it('should handle the error gracefully and return an empty array', async () => {
      // Mock axios pour qu'il lance une erreur
      mockedAxios.post
        .mockResolvedValueOnce({ data: 'OK' }) // Ontology sync succeeds
        .mockRejectedValueOnce(new Error('Network error')); // NLP service fails

      const contents = ['Sample text for processing'];
      const result = await service.processContentBatch(contents);

      expect(result).toEqual([]); // Doit retourner un tableau vide en cas d'échec
      expect(mockedAxios.post).toHaveBeenCalledTimes(2); // Ontology sync + NLP call
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('An unexpected error occurred during batch NLP processing:')
      );
    });
  });

  describe('when NLP service succeeds but embedding service fails', () => {
    it('should return entities and relationships but without embeddings', async () => {
      // Mock du service NLP qui réussit
      const nlpResponse = {
        data: [
          {
            entities: [
              { value: 'John Doe', type: 'Person', properties: {} }
            ],
            relationships: [
              { source: 'John Doe', target: 'Acme Corp', type: 'WORKS_FOR' }
            ]
          }
        ]
      };

      // Mock du service d'embedding qui échoue
      mockedAxios.post
        .mockResolvedValueOnce({ data: 'OK' }) // Ontology sync succeeds
        .mockResolvedValueOnce(nlpResponse) // NLP service succeeds
        .mockRejectedValueOnce(new Error('Embedding service down')); // Embedding service fails

      const contents = ['John Doe works for Acme Corp'];
      const result = await service.processContentBatch(contents);

      // Doit retourner les entités et relations sans embeddings
      expect(result).toHaveLength(1);
      expect(result[0].entities).toHaveLength(1);
      expect(result[0].entities[0]).toMatchObject({
        id: 'john_doe',
        name: 'John Doe',
        type: 'Person'
      });
      expect(result[0].relationships).toHaveLength(0); // Pas de relation car target n'existe pas
      
      expect(mockedAxios.post).toHaveBeenCalledTimes(3); // Ontology sync + NLP + embedding
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error generating batch entity embeddings:')
      );
    });
  });

  describe('when both services succeed', () => {
    it('should return complete processing results with embeddings', async () => {
      // Mock des deux services qui réussissent
      const nlpResponse = {
        data: [
          {
            entities: [
              { value: 'Jane Smith', type: 'Person', properties: {} },
              { value: 'Tech Corp', type: 'Organization', properties: {} }
            ],
            relationships: [
              { source: 'Jane Smith', target: 'Tech Corp', type: 'MANAGES' }
            ]
          }
        ]
      };

      const embeddingResponse = {
        data: {
          embeddings: [
            [0.1, 0.2, 0.3],
            [0.4, 0.5, 0.6]
          ]
        }
      };

      mockedAxios.post
        .mockResolvedValueOnce({ data: 'OK' }) // Ontology sync succeeds
        .mockResolvedValueOnce(nlpResponse) // NLP service succeeds
        .mockResolvedValueOnce(embeddingResponse); // Embedding service succeeds

      const contents = ['Jane Smith manages Tech Corp'];
      const result = await service.processContentBatch(contents);

      // Doit retourner les résultats complets
      expect(result).toHaveLength(1);
      expect(result[0].entities).toHaveLength(2);
      expect(result[0].entities[0]).toMatchObject({
        id: 'jane_smith',
        name: 'Jane Smith',
        type: 'Person',
        embedding: [0.1, 0.2, 0.3]
      });
      expect(result[0].entities[1]).toMatchObject({
        id: 'tech_corp',
        name: 'Tech Corp',
        type: 'Organization',
        embedding: [0.4, 0.5, 0.6]
      });
      expect(result[0].relationships).toHaveLength(1);
      expect(result[0].relationships[0]).toMatchObject({
        source: 'jane_smith',
        target: 'tech_corp',
        type: 'MANAGES'
      });

      expect(mockedAxios.post).toHaveBeenCalledTimes(3); // Ontology sync + NLP + embedding
      
      // Verify that no actual ERRORS were logged
      const errorCalls = consoleErrorSpy.mock.calls.filter(call =>
        call[0].includes('ERROR')
      );
      expect(errorCalls).toHaveLength(0);
    });
  });
}); 