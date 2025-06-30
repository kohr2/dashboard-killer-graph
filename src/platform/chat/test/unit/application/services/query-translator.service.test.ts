import 'reflect-metadata';
import { QueryTranslator } from '@platform/chat/application/services/query-translator.service';
import { OntologyService } from '@platform/ontology/ontology.service';
import OpenAI from 'openai';

// Mock OntologyService
jest.mock('@platform/ontology/ontology.service');
const mockOntologyService = new OntologyService(null as any) as jest.Mocked<OntologyService>;

// Mock OpenAI
jest.mock('openai');
const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
const mockCreate = jest.fn();
mockOpenAI.prototype.chat = {
  completions: {
    create: mockCreate,
  },
} as any;

describe('QueryTranslator', () => {
  let queryTranslator: QueryTranslator;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Provide a mock implementation for getSchemaRepresentation
    mockOntologyService.getSchemaRepresentation.mockReturnValue('schema representation');
    mockOntologyService.getAllEntityTypes.mockReturnValue(['Contact', 'Organization', 'Deal', 'Project']);

    queryTranslator = new QueryTranslator(mockOntologyService);
  });

  it('should translate a complex French relational query correctly', async () => {
    const rawQuery = 'liste moi les projets liés à Offshore Holdings Ltd.';
    const expectedStructuredQuery = {
      command: 'show_related',
      resourceTypes: ['Project', 'Deal'],
      relatedTo: ['Organization'],
      filters: { name: 'Offshore Holdings Ltd.' },
    };

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(expectedStructuredQuery) } }],
    });

    const result = await queryTranslator.translate(rawQuery);

    expect(result).toEqual(expectedStructuredQuery);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const sentPrompt = mockCreate.mock.calls[0][0].messages[0].content;
    expect(sentPrompt).toContain('liste moi les projets liés à Offshore Holdings Ltd.');
  });

  it('should handle a follow-up query by using conversation history', async () => {
    const history = [
        {
            userQuery: 'montre moi les organisations',
            assistantResponse: [{ id: 'org-123', name: 'Offshore Holdings Ltd.', __type: 'Organization' }]
        }
    ];
    const rawQuery = 'je cherche les projets liés';
    const expectedStructuredQuery = {
        command: 'show_related',
        resourceTypes: ['Project', 'Deal'],
        relatedTo: ['Organization'],
        sourceEntityName: 'Offshore Holdings Ltd.'
    };

    mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(expectedStructuredQuery) } }],
    });

    const result = await queryTranslator.translate(rawQuery, history);

    expect(result).toEqual(expectedStructuredQuery);
    const sentPrompt = mockCreate.mock.calls[0][0].messages[0].content;
    expect(sentPrompt).toContain('The user just asked: "montre moi les organisations"');
  });

  it('should correctly identify ambiguous resource types', async () => {
    const rawQuery = 'montre moi les projets';
    const expectedStructuredQuery = {
      command: 'show',
      resourceTypes: ['Deal', 'Project'],
    };

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(expectedStructuredQuery) } }],
    });

    const result = await queryTranslator.translate(rawQuery);

    expect(result).toEqual(expectedStructuredQuery);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
}); 