// Integration test setup
// This file configures the environment for integration tests

import 'jest-extended';

// Set longer timeout for integration tests
jest.setTimeout(30000);

// Mock external dependencies for integration tests
global.integrationMocks = {
  // Neo4j mock
  neo4j: {
    driver: jest.fn(),
    session: jest.fn(),
  },
  
  // Microsoft Graph API mock
  graphAPI: {
    getAccessToken: jest.fn(),
    getEmails: jest.fn(),
  },
  
  // External services mock
  externalServices: {
    isAvailable: true,
  },
};

beforeAll(async () => {
  // Setup test database connections
  console.log('Setting up integration test environment...');
});

afterAll(async () => {
  // Cleanup test database connections
  console.log('Cleaning up integration test environment...');
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
}); 