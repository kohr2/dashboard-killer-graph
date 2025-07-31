import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { waitForService } from '../wait-for-service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('waitForService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful service response', () => {
    it('should return immediately when service responds with 200', async () => {
      mockAxios.get.mockResolvedValue({ status: 200 });

      await waitForService('http://localhost:8000/health');

      expect(mockAxios.get).toHaveBeenCalledWith('http://localhost:8000/health', {
        timeout: 2000,
      });
    });

    it('should return when service responds with 2xx status', async () => {
      mockAxios.get.mockResolvedValue({ status: 204 });

      await waitForService('http://localhost:8000/health');

      expect(mockAxios.get).toHaveBeenCalledWith('http://localhost:8000/health', {
        timeout: 2000,
      });
    });
  });

  describe('service not responding', () => {
    it('should retry and eventually throw error after max retries', async () => {
      const networkError = new Error('Network error');
      mockAxios.get.mockRejectedValue(networkError);

      await expect(waitForService('http://localhost:8000/health', 3, 100)).rejects.toThrow(
        'Service at http://localhost:8000/health not reachable after 3 attempts. Last error: Network error'
      );

      expect(mockAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should use default retry settings', async () => {
      const networkError = new Error('Network error');
      mockAxios.get.mockRejectedValue(networkError);

      await expect(waitForService('http://localhost:8000/health')).rejects.toThrow(
        'Service at http://localhost:8000/health not reachable after 5 attempts. Last error: Network error'
      );

      expect(mockAxios.get).toHaveBeenCalledTimes(5);
    });
  });

  describe('service responding with error status', () => {
    it('should retry when service responds with 4xx status', async () => {
      mockAxios.get.mockResolvedValue({ status: 404 });

      // The function will retry but eventually succeed if we change the mock
      mockAxios.get
        .mockResolvedValueOnce({ status: 404 })
        .mockResolvedValueOnce({ status: 404 })
        .mockResolvedValueOnce({ status: 200 });

      await waitForService('http://localhost:8000/health', 3, 100);

      expect(mockAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should retry when service responds with 5xx status', async () => {
      mockAxios.get.mockResolvedValue({ status: 500 });

      // The function will retry but eventually succeed if we change the mock
      mockAxios.get
        .mockResolvedValueOnce({ status: 500 })
        .mockResolvedValueOnce({ status: 500 })
        .mockResolvedValueOnce({ status: 200 });

      await waitForService('http://localhost:8000/health', 3, 100);

      expect(mockAxios.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('custom retry settings', () => {
    it('should use custom max retries', async () => {
      const networkError = new Error('Network error');
      mockAxios.get.mockRejectedValue(networkError);

      await expect(waitForService('http://localhost:8000/health', 2, 100)).rejects.toThrow(
        'Service at http://localhost:8000/health not reachable after 2 attempts. Last error: Network error'
      );

      expect(mockAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should use custom interval', async () => {
      const networkError = new Error('Network error');
      mockAxios.get.mockRejectedValue(networkError);

      const startTime = Date.now();
      await expect(waitForService('http://localhost:8000/health', 2, 200)).rejects.toThrow();
      const endTime = Date.now();

      // Should have waited at least 200ms between attempts
      expect(endTime - startTime).toBeGreaterThanOrEqual(200);
    });
  });
}); 