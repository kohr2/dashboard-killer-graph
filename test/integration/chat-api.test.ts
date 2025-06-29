import 'reflect-metadata';
import request from 'supertest';
import { container } from 'tsyringe';
import { ChatService } from '@platform/chat/application/services/chat.service';

// Mock the ChatService *before* it's imported by other modules
const mockChatService = {
  handleQuery: jest.fn(),
};
container.register<ChatService>(ChatService, { useValue: mockChatService as any });

// Now import the app, which will use the mocked service
import { app } from '../../src/api';

describe('POST /api/chat/query', () => {
  beforeEach(() => {
    // Reset the mock before each test
    mockChatService.handleQuery.mockClear();
  });

  it('should return a 200 OK with the chat response for a valid query', async () => {
    const mockResponse = 'Here are the deals you asked for.';
    mockChatService.handleQuery.mockResolvedValue(mockResponse);

    const response = await request(app)
      .post('/api/chat/query')
      .send({ query: 'show me all deals' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ response: mockResponse });
    expect(mockChatService.handleQuery).toHaveBeenCalledTimes(1);
    expect(mockChatService.handleQuery).toHaveBeenCalledWith(
      expect.any(Object), // We don't need to test the user object here
      'show me all deals'
    );
  });

  it('should return a 400 Bad Request if the query is missing', async () => {
    const response = await request(app)
      .post('/api/chat/query')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Query is required' });
    expect(mockChatService.handleQuery).not.toHaveBeenCalled();
  });

  /*
  it('should return a 500 Internal Server Error if the service fails', async () => {
    const errorMessage = 'Internal service error';
    mockChatService.handleQuery.mockRejectedValue(new Error(errorMessage));

    const response = await request(app)
      .post('/api/chat/query')
      .send({ query: 'a query that will fail' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('An internal error occurred');
    expect(response.body.details).toBe(errorMessage);
  });
  */
});
