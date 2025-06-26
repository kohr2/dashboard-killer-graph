// End-to-end test setup
// This file configures the environment for E2E tests

import 'jest-extended';

// Define the type for our custom global helper
declare global {
  var e2eHelpers: {
    api: {
      baseUrl: string;
      timeout: number;
    };
    db: {
      cleanup: () => Promise<void>;
      seed: () => Promise<void>;
    };
    wait: (ms: number) => Promise<void>;
    waitFor: (condition: () => boolean | Promise<boolean>, timeout?: number) => Promise<boolean>;
  };
}

// Set longer timeout for E2E tests
jest.setTimeout(60000);

// E2E test utilities
(global as any).e2eHelpers = {
  // API testing helpers
  api: {
    baseUrl: process.env.TEST_API_URL || 'http://localhost:3000',
    timeout: 30000,
  },
  
  // Database helpers
  db: {
    cleanup: async () => {
      // Clean up test data
      console.log('Cleaning up E2E test data...');
    },
    
    seed: async () => {
      // Seed test data
      console.log('Seeding E2E test data...');
    },
  },
  
  // Wait utilities
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  waitFor: async (condition: () => boolean | Promise<boolean>, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await (global as any).e2eHelpers.wait(100);
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },
};

beforeEach(async () => {
  // Setup for each E2E test
  jest.clearAllMocks();
});

afterEach(async () => {
  // Cleanup after each E2E test
  jest.restoreAllMocks();
}); 