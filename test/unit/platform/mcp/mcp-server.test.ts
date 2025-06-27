import 'reflect-metadata';
import axios from 'axios';
import { serverConfig } from '../../../../src/mcp-server.config';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MCP Server Tool Handler - Unit Test', () => {
  const queryTool = serverConfig.tools.find((t: any) => t.name === 'query');

  if (!queryTool) {
    throw new Error('Query tool not found in server configuration');
  }

  const handler = queryTool.handler as (args: { query: string }) => Promise<any>;

  beforeEach(() => {
    mockedAxios.post.mockClear();
  });

  it('should call the chat API and return the response on success', async () => {
    const userQuery = { query: 'What is the status of the new deal?' };
    const mockApiResponse = { response: 'The deal is in the final stages.' };
    mockedAxios.post.mockResolvedValue({ data: mockApiResponse });

    const result = await handler(userQuery);

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenCalledWith(expect.any(String), userQuery);
    expect(result).toEqual({ content: [{ type: 'text', text: mockApiResponse.response }] });
  });

  it('should return an error object when the chat API call fails', async () => {
    const userQuery = { query: 'A query that will fail' };
    const errorMessage = 'Request failed with status code 500';
    mockedAxios.post.mockRejectedValue(new Error(errorMessage));

    const result = await handler(userQuery);

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(result.isError).toBe(true);
    expect(result.content).toEqual([{ type: 'text', text: `Failed to query platform: ${errorMessage}` }]);
  });
}); 