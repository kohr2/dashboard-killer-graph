import 'reflect-metadata';
import request from 'supertest';
import { container } from 'tsyringe';
import { ChatService } from '@platform/chat/application/services/chat.service';
import { app } from '@src/api';

// Mock the ChatService *before* the app uses it
const mockChatService = {
  handleQuery: jest.fn(),
};
container.register<ChatService>(ChatService, { useValue: mockChatService as any });

describe('POST /api/chat/query', () => {
  beforeEach(() => {
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
    expect(mockChatService.handleQuery).toHaveBeenCalledWith(expect.any(Object), 'show me all deals');
  });

  it('should return a 400 Bad Request if the query is missing', async () => {
    const response = await request(app)
      .post('/api/chat/query')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Query is required' });
    expect(mockChatService.handleQuery).not.toHaveBeenCalled();
  });
}); 