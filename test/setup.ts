import '@testing-library/jest-dom';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Add custom matchers
expect.extend({
  toBeValidRDFTriple(received: any) {
    const pass = 
      received &&
      typeof received.subject === 'string' &&
      typeof received.predicate === 'string' &&
      typeof received.object === 'string';
    
    return {
      message: () => `expected ${received} to be a valid RDF triple`,
      pass,
    };
  },
});

// Global test timeout
jest.setTimeout(10000); 