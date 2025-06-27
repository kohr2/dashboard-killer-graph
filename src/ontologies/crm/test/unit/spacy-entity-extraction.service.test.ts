import axios from 'axios';
import {
  SpacyEntityExtractionService,
  EntityType,
} from '../../application/services/spacy-entity-extraction.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SpacyEntityExtractionService', () => {
  let service: SpacyEntityExtractionService;
  const nlpServiceUrl = 'http://127.0.0.1:8000';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SpacyEntityExtractionService();
  });

  describe('extractEntities', () => {
    it('should call the NLP service and return mapped entities on success', async () => {
      // Arrange
      const textToProcess = 'Apple is looking at buying U.K. startup for $1 billion.';
      const mockNlpResponse = {
        data: {
          entities: [
            {
              value: 'Apple',
              type: 'ORG',
              confidence: 0.9,
              spacy_label: 'ORG',
              context: 'Apple is looking',
              start: 0,
              end: 5,
            },
            {
              value: '$1 billion',
              type: 'MONEY',
              confidence: 0.95,
              spacy_label: 'MONEY',
              context: 'for $1 billion',
              start: 44,
              end: 54,
            },
          ],
          relationships: [],
          refinement_info: '',
          embedding: [0.1, 0.2],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
      mockedAxios.post.mockResolvedValue(mockNlpResponse);

      // Act
      const result = await service.extractEntities(textToProcess);

      // Assert
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${nlpServiceUrl}/extract-graph`,
        { text: textToProcess },
      );
      expect(result.entities).toHaveLength(2);
      expect(result.entities[0].type).toBe(EntityType.COMPANY_NAME);
      expect(result.entities[0].value).toBe('Apple');
      expect(result.entities[1].type).toBe(EntityType.MONETARY_AMOUNT);
      expect(result.metadata.extractionMethod).toBe('spacy');
    });

    it('should use fallback regex extraction when the NLP service fails', async () => {
      // Arrange
      const textToProcess = 'Contact me at test@example.com.';
      mockedAxios.post.mockRejectedValue(new Error('NLP service is down'));

      // Act
      const result = await service.extractEntities(textToProcess);

      // Assert
      expect(mockedAxios.post).toHaveBeenCalled();
      expect(result.metadata.extractionMethod).toBe('regex');
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].type).toBe(EntityType.EMAIL_ADDRESS);
      expect(result.entities[0].value).toBe('test@example.com');
    });
  });
}); 