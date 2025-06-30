import axios from 'axios';
import { waitForService } from '@shared/utils/wait-for-service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('waitForService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('resolves once the service becomes healthy', async () => {
    // First call fails, second call succeeds
    mockedAxios.get
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce({ status: 200, data: { status: 'ok' } });

    await expect(
      waitForService('http://localhost:8000/health', 2, 10),
    ).resolves.not.toThrow();

    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });

  it('rejects after exceeding max retries', async () => {
    mockedAxios.get.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      waitForService('http://localhost:8000/health', 3, 1),
    ).rejects.toThrow();

    expect(mockedAxios.get).toHaveBeenCalledTimes(3);
  });
}); 