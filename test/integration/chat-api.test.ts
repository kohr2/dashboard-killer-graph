import 'reflect-metadata';
import request from 'supertest';
import express from 'express';
import { ChatService } from '@platform/chat/application/services/chat.service';
import { apiRouter } from '../../src/api'; // Import the router, not the app

// Mock the ChatService module
jest.mock('@platform/chat/application/services/chat.service');

// Create a typed mock
const MockedChatService = ChatService as jest.MockedClass<typeof ChatService>;

// Create a test-specific Express app
const testApp = express();
testApp.use(express.json());
testApp.use('/api', apiRouter); // Mount the actual router

describe('POST /api/chat', () => {
    beforeEach(() => {
        // Reset the mock before each test
        MockedChatService.mockClear();
        // Also clear any mock implementations on the methods
        (MockedChatService.prototype.handleQuery as jest.Mock).mockClear();
    });

    it('should return a 200 OK status and a response for a valid query', async () => {
        const mockResponse = 'This is a test response.';
        // Mock the implementation for this specific test
        (MockedChatService.prototype.handleQuery as jest.Mock).mockResolvedValue(mockResponse);

        const response = await request(testApp)
            .post('/api/chat')
            .send({ query: 'hello world' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ response: mockResponse });

        expect(MockedChatService.prototype.handleQuery).toHaveBeenCalledWith(expect.any(Object), 'hello world');
        expect(MockedChatService.prototype.handleQuery).toHaveBeenCalledTimes(1);
    });

    it('should return a 500 status when the service throws an error', async () => {
        // Mock the implementation to throw an error for this test
        (MockedChatService.prototype.handleQuery as jest.Mock).mockRejectedValue(new Error('Service failure'));

        const response = await request(testApp)
            .post('/api/chat')
            .send({ query: 'a query that fails' });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'An internal server error occurred.' });
    });
});
