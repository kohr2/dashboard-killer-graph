import axios from 'axios';
import { ContentProcessingService } from '../../../../src/platform/processing/content-processing.service';

// Mock axios pour contrôler les appels réseau
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ContentProcessingService', () => {
  let service: ContentProcessingService;

  beforeEach(() => {
    // Réinitialise les mocks avant chaque test
    mockedAxios.post.mockClear();
    service = new ContentProcessingService();
  });

  describe('when NLP service fails', () => {
    it('should handle the error gracefully and return an empty array', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const errorMessage = 'Network Error';
      // Simule un échec de l'appel à l'API NLP
      mockedAxios.post.mockRejectedValueOnce(new Error(errorMessage));

      const contents = ['This is a test content.'];

      // Act
      const result = await service.processContentBatch(contents);

      // Assert
      expect(result).toEqual([]); // Doit retourner un tableau vide en cas d'échec
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // S'assure que l'appel a été tenté
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '   ❌ An unexpected error occurred during batch NLP processing:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('when NLP service succeeds but embedding service fails', () => {
    it('should return entities and relationships but without embeddings', async () => {
      // Arrange
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockGraphResponse = [
        {
          entities: [{ value: 'TestCorp', type: 'ORGANIZATION', properties: {} }],
          relationships: [],
          refinement_info: '',
        },
      ];

      // Simule un succès pour le premier appel (NLP)
      mockedAxios.post.mockResolvedValueOnce({ data: mockGraphResponse });
      // Simule un échec pour le second appel (embedding)
      mockedAxios.post.mockRejectedValueOnce(new Error('Embedding service unavailable'));

      const contents = ['A document mentioning TestCorp.'];

      // Act
      const result = await service.processContentBatch(contents);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].entities).toHaveLength(1);
      expect(result[0].entities[0].name).toBe('TestCorp');
      expect(result[0].entities[0].embedding).toBeUndefined(); // L'embedding ne doit pas être défini
      expect(result[0].relationships).toEqual([]);
      
      expect(mockedAxios.post).toHaveBeenCalledTimes(2); // Un appel à NLP, un à l'embedding
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '   ❌ Error generating batch entity embeddings:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('when both services succeed', () => {
    it('should process content, attach embeddings, and link relationships correctly', async () => {
      // Arrange
      const mockGraphResponse = [
        {
          entities: [
            { value: 'Source Corp', type: 'ORGANIZATION', properties: {} },
            { value: 'Target Inc', type: 'ORGANIZATION', properties: {} },
          ],
          relationships: [
            { source: 'Source Corp', target: 'Target Inc', type: 'PARTNERS_WITH' },
            // This relationship should be filtered out as "Ghost LLC" is not in entities
            { source: 'Source Corp', target: 'Ghost LLC', type: 'INVESTED_IN' },
          ],
          refinement_info: '',
        },
      ];
      const mockEmbeddings = [[0.1, 0.2], [0.3, 0.4]];

      // Mock NLP call
      mockedAxios.post.mockResolvedValueOnce({ data: mockGraphResponse });
      // Mock Embedding call
      mockedAxios.post.mockResolvedValueOnce({ data: { embeddings: mockEmbeddings } });

      const contents = ['Source Corp is a partner of Target Inc.'];

      // Act
      const result = await service.processContentBatch(contents);

      // Assert
      expect(result).toHaveLength(1);
      const { entities, relationships } = result[0];

      // Check entities
      expect(entities).toHaveLength(2);
      expect(entities[0].name).toBe('Source Corp');
      expect(entities[0].embedding).toEqual(mockEmbeddings[0]);
      expect(entities[1].name).toBe('Target Inc');
      expect(entities[1].embedding).toEqual(mockEmbeddings[1]);

      // Check relationships
      expect(relationships).toHaveLength(1);
      expect(relationships[0].type).toBe('PARTNERS_WITH');
      expect(relationships[0].source).toBe(entities[0].id); // Check if IDs are correctly linked
      expect(relationships[0].target).toBe(entities[1].id);

      // Verify axios calls
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/batch-extract-graph'), expect.any(Object), expect.any(Object));
      expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/embed'), { texts: ['Source Corp', 'Target Inc'] }, expect.any(Object));
    });
  });
}); 