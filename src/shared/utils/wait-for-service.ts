import axios from 'axios';

/**
 * Wait until a service responds successfully on its health endpoint.
 *
 * Useful during local development to avoid long stack traces when a dependent
 * micro-service (e.g. the Python NLP service) is still starting.
 *
 * @param url         The full URL of the service health endpoint (e.g. http://127.0.0.1:8000/health).
 * @param maxRetries  How many attempts before giving up. Default: 5.
 * @param intervalMs  Delay between attempts in milliseconds. Default: 1000 ms.
 *
 * @throws If the service does not respond with a 2xx status after the maximum number of retries.
 */
export async function waitForService(
  url: string,
  maxRetries = 5,
  intervalMs = 1000,
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await axios.get(url, { timeout: 2000 });
      if (response.status >= 200 && response.status < 300) {
        return; // Service is healthy
      }
    } catch (error) {
      // Swallow connection errors and retry unless max retries reached
      if (attempt === maxRetries) {
        throw new Error(
          `Service at ${url} not reachable after ${maxRetries} attempts. Last error: ${(error as Error).message}`,
        );
      }
    }
    // Wait before next attempt
    await new Promise((res) => setTimeout(res, intervalMs));
  }
} 