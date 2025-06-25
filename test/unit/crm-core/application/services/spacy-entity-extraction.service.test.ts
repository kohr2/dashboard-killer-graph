import axios from 'axios';
import { SpacyEntityExtractionService, EntityType, SpacyExtractedEntity } from '../../../../../src/crm-core/application/services/spacy-entity-extraction.service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SpacyEntityExtractionService', () => {
  let service: SpacyEntityExtractionService;

  beforeEach(() => {
    service = new SpacyEntityExtractionService('http://localhost:8000');
    jest.clearAllMocks();
  });

  describe('extractEntities', () => {
    it('should extract entities successfully from the NLP service', async () => {
      const text = 'Apple is looking at buying U.K. startup for $1 billion';
      const mockSpacyResponse = {
        data: [
          { type: 'COMPANY_NAME', value: 'Apple', confidence: 0.9, spacy_label: 'ORG', context: 'Apple is looking', start: 0, end: 5 },
          { type: 'LOCATION', value: 'U.K.', confidence: 0.85, spacy_label: 'GPE', context: 'buying U.K. startup', start: 27, end: 31 },
          { type: 'MONETARY_AMOUNT', value: '$1 billion', confidence: 0.95, spacy_label: 'MONEY', context: 'for $1 billion', start: 44, end: 54 },
        ],
        status: 200
      };
      mockedAxios.post.mockResolvedValue(mockSpacyResponse);

      const result = await service.extractEntities(text);

      expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:8000/extract-entities', { text });
      expect(result.entities).toHaveLength(3);
      expect(result.entities[0]).toMatchObject({
        type: EntityType.COMPANY_NAME,
        value: 'Apple',
        confidence: 0.9
      });
      expect(result.metadata.extractionMethod).toBe('spacy');
    });

    it('should fall back to regex extraction when NLP service fails', async () => {
      const text = 'Contact me at test@example.com';
      mockedAxios.post.mockRejectedValue(new Error('NLP service unavailable'));

      // Simple spy on the private method - might need to be adjusted depending on test setup
      const fallbackSpy = jest.spyOn(service as any, 'fallbackExtraction');

      const result = await service.extractEntities(text);

      expect(fallbackSpy).toHaveBeenCalled();
      expect(result.metadata.extractionMethod).toBe('regex');
      expect(result.entities.length).toBeGreaterThan(0);
      expect(result.entities[0]).toMatchObject({
        type: EntityType.EMAIL_ADDRESS,
        value: 'test@example.com',
      });
      fallbackSpy.mockRestore();
    });

    it('should filter entities by type', async () => {
        const text = 'Apple is a company and my email is test@example.com';
        const mockSpacyResponse = {
          data: [
            { type: 'COMPANY_NAME', value: 'Apple', confidence: 0.9, spacy_label: 'ORG', context: 'Apple is a company', start: 0, end: 5 },
            { type: 'EMAIL_ADDRESS', value: 'test@example.com', confidence: 0.98, spacy_label: 'EMAIL', context: 'email is test@example.com', start: 32, end: 49 },
          ],
          status: 200
        };
        mockedAxios.post.mockResolvedValue(mockSpacyResponse);
  
        const result = await service.extractEntities(text, { entityTypes: [EntityType.COMPANY_NAME] });
  
        expect(result.entities).toHaveLength(1);
        expect(result.entities[0].type).toBe(EntityType.COMPANY_NAME);
    });
  });

  describe('getCapabilities', () => {
    it('should return available status when NLP service is reachable', async () => {
      mockedAxios.post.mockResolvedValue({ data: [], status: 200 });
      const capabilities = await service.getCapabilities();
      expect(capabilities.status).toBe('available');
      expect(capabilities.supportedEntityTypes.length).toBeGreaterThan(0);
    });

    it('should return unavailable status when NLP service fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('NLP service unavailable'));
      const capabilities = await service.getCapabilities();
      expect(capabilities.status).toBe('unavailable');
    });
  });
}); 