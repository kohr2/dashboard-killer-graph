import 'reflect-metadata';
import { QueryTranslator } from '@platform/chat/application/services/query-translator.service';
import { OntologyService } from '@platform/ontology/ontology.service';
import OpenAI from 'openai';

// Mock the dependencies using a factory function
const mockOpenAICreate = jest.fn();
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockOpenAICreate,
      },
    },
  })),
}));

const mockGetSchema = jest.fn(() => 'schema representation');
const mockGetEntities = jest.fn(() => ['Contact', 'Organization', 'Deal', 'Project']);
jest.mock('@platform/ontology/ontology.service', () => ({
  __esModule: true,
  OntologyService: jest.fn().mockImplementation(() => ({
    getSchemaRepresentation: mockGetSchema,
    getAllEntityTypes: mockGetEntities,
  })),
}));

describe('QueryTranslator', () => {
  it('should be true', () => {
    expect(true).toBe(true);
  });
}); 