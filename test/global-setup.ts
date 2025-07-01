// Global setup for E2E tests
// This runs once before all E2E tests

import net from 'net';
import { waitForService } from '../src/shared/utils/wait-for-service';

const NEO4J_PORT = 7688; // Port for the test database
const NLP_SERVICE_URL = 'http://127.0.0.1:8000/health';
const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 2000;

const checkTcpPort = (port: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    let retries = 0;

    const attemptConnection = () => {
      const socket = new net.Socket();
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('error', (err) => {
        socket.destroy();
        retries += 1;
        if (retries >= MAX_RETRIES) {
          reject(new Error(`Neo4j not reachable on port ${port} after ${MAX_RETRIES} attempts.`));
        } else {
          setTimeout(attemptConnection, RETRY_INTERVAL_MS);
        }
      });
      socket.connect(port, '127.0.0.1');
    };

    attemptConnection();
  });
};

export default async () => {
  try {
    console.log('\nWaiting for dependent services to start...');
    
    const neo4jPromise = checkTcpPort(NEO4J_PORT);
    const nlpPromise = waitForService(NLP_SERVICE_URL, MAX_RETRIES, RETRY_INTERVAL_MS);

    await Promise.all([
      neo4jPromise.then(() => console.log('✅ Neo4j test database is responsive.')),
      nlpPromise.then(() => console.log('✅ Python NLP service is responsive.'))
    ]);
    
    console.log('All services are up. Starting tests...');
  } catch (error) {
    console.error('\n❌ A required service is not available.');
    console.error((error as Error).message);
    console.error('\nPlease ensure all dependent services are running before executing tests.');
    console.error('You can typically start them with: npm run services:up');
    process.exit(1);
  }
}; 