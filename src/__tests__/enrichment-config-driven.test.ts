import { registerAllEnrichments } from '../register-enrichments';
import { OntologyAgnosticEnrichmentService } from '../platform/enrichment/ontology-agnostic-enrichment.service';
import * as fs from 'fs';

// Mock fs.readFileSync to return a test config
jest.mock('fs', () => ({
  readFileSync: jest.fn()
}));

describe('Enrichment Config-Driven Registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Config-driven service creation', () => {
    it('should create services entirely from config', () => {
      // Mock config file content
      const mockConfig = {
        services: [
          {
            name: 'testService',
            type: 'api',
            enabled: true,
            config: {
              baseUrl: 'https://api.test.com',
              enrichmentLogic: {
                type: 'api_call',
                endpoint: '/test/{entityName}',
                method: 'GET'
              }
            },
            timeout: 5000,
            retries: 2
          }
        ],
        rules: [],
        global: {
          defaultTimeout: 10000,
          defaultRetries: 3,
          enableLogging: true,
          defaults: {
            enabled: false,
            priority: 10
          }
        }
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

      const result = registerAllEnrichments();
      
      expect(result).toBeInstanceOf(OntologyAgnosticEnrichmentService);
    });

    it('should skip disabled services in config', () => {
      const mockConfig = {
        services: [
          {
            name: 'enabledService',
            type: 'api',
            enabled: true,
            config: {
              baseUrl: 'https://api.test.com'
            }
          },
          {
            name: 'disabledService',
            type: 'api',
            enabled: false,
            config: {
              baseUrl: 'https://api.test.com'
            }
          }
        ],
        rules: [],
        global: {
          defaultTimeout: 10000,
          defaultRetries: 3,
          enableLogging: true,
          defaults: {
            enabled: false,
            priority: 10
          }
        }
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

      const result = registerAllEnrichments();
      
      expect(result).toBeInstanceOf(OntologyAgnosticEnrichmentService);
    });

    it('should handle missing config file gracefully', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = registerAllEnrichments();
      
      expect(result).toBeInstanceOf(OntologyAgnosticEnrichmentService);
    });

    it('should create services with enrichment logic from config', () => {
      const mockConfig = {
        services: [
          {
            name: 'logicService',
            type: 'api',
            enabled: true,
            config: {
              baseUrl: 'https://api.test.com',
              enrichmentLogic: {
                type: 'api_call',
                endpoint: '/companies/{entityName}',
                method: 'GET',
                headers: {
                  'User-Agent': 'Test Bot',
                  'Accept': 'application/json'
                },
                responseMapping: {
                  companyName: 'name',
                  ticker: 'ticker'
                }
              }
            }
          }
        ],
        rules: [],
        global: {
          defaultTimeout: 10000,
          defaultRetries: 3,
          enableLogging: true,
          defaults: {
            enabled: false,
            priority: 10
          }
        }
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

      const result = registerAllEnrichments();
      
      expect(result).toBeInstanceOf(OntologyAgnosticEnrichmentService);
    });
  });

  describe('Service configuration', () => {
    it('should merge config with service creation', () => {
      const mockConfig = {
        services: [
          {
            name: 'mergeService',
            type: 'api',
            enabled: true,
            config: {
              baseUrl: 'https://api.test.com',
              timeout: 5000
            }
          }
        ],
        rules: [],
        global: {
          defaultTimeout: 10000,
          defaultRetries: 3,
          enableLogging: true,
          defaults: {
            enabled: false,
            priority: 10
          }
        }
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

      const result = registerAllEnrichments();
      
      expect(result).toBeInstanceOf(OntologyAgnosticEnrichmentService);
    });
  });
}); 