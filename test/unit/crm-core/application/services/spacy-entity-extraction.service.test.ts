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

  describe('extractEmailEntities', () => {
    test('should combine email parts and extract entities', async () => {
      const emailSubject = 'Project Alpha Kick-off';
      const emailBody = 'Hi team, Meeting with Acme Corp at 2 PM. Thanks, John Doe.';
      const mockSpacyResponse = {
        data: [
          { type: 'WORK_OF_ART', value: 'Project Alpha', confidence: 0.9, spacy_label: 'WORK_OF_ART', context: 'Subject: Project Alpha', start: 9, end: 22 },
          { type: 'COMPANY_NAME', value: 'Acme Corp', confidence: 0.95, spacy_label: 'ORG', context: 'Meeting with Acme Corp', start: 45, end: 54 },
          { type: 'PERSON_NAME', value: 'John Doe', confidence: 0.88, spacy_label: 'PERSON', context: 'Thanks, John Doe', start: 73, end: 81 },
          { type: 'TIME', value: '2 PM', confidence: 0.92, spacy_label: 'TIME', context: 'at 2 PM', start: 58, end: 62 },
        ],
        status: 200,
      };
      mockedAxios.post.mockResolvedValue(mockSpacyResponse);

      const result = await service.extractEmailEntities(emailSubject, emailBody);

      expect(result.entityCount).toBe(4);
      expect(result.entities.some(e => e.type === EntityType.WORK_OF_ART && e.value === 'Project Alpha')).toBe(true);
      expect(result.entities.some(e => e.type === EntityType.COMPANY_NAME && e.value === 'Acme Corp')).toBe(true);
    });
  });

  describe('extractEntitiesBatch', () => {
    test('should process a batch of texts and return multiple results', async () => {
      const texts = ['Text 1 with Apple', 'Text 2 about Microsoft', 'Text 3 mentioning Google'];
      
      mockedAxios.post.mockImplementation(async (url: string, data: any) => {
        const textData = data as { text: string };
        let responseData: any[] = [];
        if (textData.text.includes('Apple')) responseData = [{ type: 'COMPANY_NAME', value: 'Apple', confidence: 0.9, spacy_label: 'ORG', context: '', start: 0, end: 5 }];
        if (textData.text.includes('Microsoft')) responseData = [{ type: 'COMPANY_NAME', value: 'Microsoft', confidence: 0.9, spacy_label: 'ORG', context: '', start: 0, end: 9 }];
        if (textData.text.includes('Google')) responseData = [{ type: 'COMPANY_NAME', value: 'Google', confidence: 0.9, spacy_label: 'ORG', context: '', start: 0, end: 6 }];
        
        return Promise.resolve({ data: responseData, status: 200 });
      });

      const results = await service.extractEntitiesBatch(texts);

      expect(results).toHaveLength(3);
      expect(results[0].entities[0].value).toBe('Apple');
      expect(results[1].entities[0].value).toBe('Microsoft');
      expect(results[2].entities[0].value).toBe('Google');
    });

    test('should handle an empty array for batch processing', async () => {
      const results = await service.extractEntitiesBatch([]);
      expect(results).toEqual([]);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('Fallback Regex Extraction', () => {
    test('should use fallback regex extraction when spaCy service fails', async () => {
      const textWithEmail = 'Contact me at test@example.com for more details.';
      mockedAxios.post.mockRejectedValue(new Error('NLP service unavailable'));
      
      const fallbackSpy = jest.spyOn(service as any, 'fallbackExtraction');

      const result = await service.extractEntities(textWithEmail);

      expect(fallbackSpy).toHaveBeenCalled();
      expect(result.metadata.extractionMethod).toBe('regex');
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].type).toBe(EntityType.EMAIL_ADDRESS);
      expect(result.entities[0].value).toBe('test@example.com');
      
      fallbackSpy.mockRestore();
    });

    test('should extract multiple entity types using regex', async () => {
      const text = 'Visit our site at https://example.com or call 555-123-4567.';
      mockedAxios.post.mockRejectedValue(new Error('NLP service unavailable'));

      const result = await service.extractEntities(text);

      expect(result.metadata.extractionMethod).toBe('regex');
      expect(result.entities).toHaveLength(2);
      expect(result.entities.some(e => e.type === EntityType.URL && e.value === 'https://example.com')).toBe(true);
      expect(result.entities.some(e => e.type === EntityType.PHONE_NUMBER && e.value === '555-123-4567')).toBe(true);
    });
  });
}); 