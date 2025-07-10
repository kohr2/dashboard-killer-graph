import * as fs from 'fs';
import * as path from 'path';
import { GenericDatasetIngestionService } from '../generic-dataset-ingestion';

// Mock the logger
jest.mock('../../../src/common/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock the services
jest.mock('../../../src/platform/processing/content-processing.service');
jest.mock('../../../src/platform/processing/neo4j-ingestion.service');
jest.mock('../../../src/register-ontologies', () => ({
  registerAllOntologies: jest.fn()
}));

describe('GenericDatasetIngestionService', () => {
  let service: GenericDatasetIngestionService;
  let tempOntologyDir: string;
  let tempDataDir: string;

  beforeEach(() => {
    // Create temporary ontology directory
    tempOntologyDir = path.join(__dirname, 'temp-ontology');
    tempDataDir = path.join(tempOntologyDir, 'data');
    
    if (!fs.existsSync(tempOntologyDir)) {
      fs.mkdirSync(tempOntologyDir, { recursive: true });
    }
    if (!fs.existsSync(tempDataDir)) {
      fs.mkdirSync(tempDataDir, { recursive: true });
    }

    service = new GenericDatasetIngestionService('test-ontology');
    
    // Mock the ontology directory path
    (service as any).ontologyDir = tempOntologyDir;
  });

  afterEach(() => {
    // Clean up temporary files
    if (fs.existsSync(tempOntologyDir)) {
      fs.rmSync(tempOntologyDir, { recursive: true, force: true });
    }
  });

  describe('loadConfiguration', () => {
    it('should load config.json and ontology.json successfully', () => {
      // Create mock config.json
      const config = {
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        enabled: true,
        priority: 1,
        source: {
          url: 'https://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test source'
        },
        extraction: {
          entities: {},
          relationships: {}
        }
      };

      // Create mock ontology.json
      const ontology = {
        entities: {
          TestEntity: {
            name: 'TestEntity',
            description: 'Test entity',
            properties: {}
          }
        },
        relationships: {
          TEST_RELATIONSHIP: {
            name: 'TEST_RELATIONSHIP',
            description: 'Test relationship',
            source: 'TestEntity',
            target: 'TestEntity'
          }
        }
      };

      fs.writeFileSync(path.join(tempOntologyDir, 'config.json'), JSON.stringify(config));
      fs.writeFileSync(path.join(tempOntologyDir, 'ontology.json'), JSON.stringify(ontology));

      // Call private method
      (service as any).loadConfiguration();

      expect((service as any).config).toEqual(config);
      expect((service as any).ontologySchema).toEqual(ontology);
    });

    it('should throw error when config.json is missing', () => {
      expect(() => {
        (service as any).loadConfiguration();
      }).toThrow('Config file not found');
    });

    it('should throw error when ontology.json is missing', () => {
      // Create only config.json
      const config = {
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        enabled: true,
        priority: 1,
        source: {
          url: 'https://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test source'
        },
        extraction: {
          entities: {},
          relationships: {}
        }
      };

      fs.writeFileSync(path.join(tempOntologyDir, 'config.json'), JSON.stringify(config));

      expect(() => {
        (service as any).loadConfiguration();
      }).toThrow('Ontology file not found');
    });
  });

  describe('validateDataset', () => {
    beforeEach(() => {
      // Setup configuration
      const config = {
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        enabled: true,
        priority: 1,
        source: {
          url: 'https://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test source'
        },
        extraction: {
          entities: {},
          relationships: {}
        }
      };

      const ontology = {
        entities: {
          TestEntity: {
            name: 'TestEntity',
            description: 'Test entity',
            properties: {}
          },
          AnotherEntity: {
            name: 'AnotherEntity',
            description: 'Another entity',
            properties: {}
          }
        },
        relationships: {
          TEST_RELATIONSHIP: {
            name: 'TEST_RELATIONSHIP',
            description: 'Test relationship',
            source: 'TestEntity',
            target: 'TestEntity'
          }
        }
      };

      fs.writeFileSync(path.join(tempOntologyDir, 'config.json'), JSON.stringify(config));
      fs.writeFileSync(path.join(tempOntologyDir, 'ontology.json'), JSON.stringify(ontology));

      (service as any).loadConfiguration();
    });

    it('should validate dataset successfully', () => {
      const dataset = {
        metadata: {
          source: 'test-transformation',
          ontology: 'test-ontology',
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          recordCount: 2
        },
        records: [
          {
            id: 'test-1',
            type: 'TestEntity',
            content: 'Test content 1',
            properties: { name: 'Test 1' }
          },
          {
            id: 'test-2',
            type: 'AnotherEntity',
            content: 'Test content 2',
            properties: { name: 'Test 2' },
            relationships: [
              {
                type: 'TEST_RELATIONSHIP',
                target: 'test-1'
              }
            ]
          }
        ]
      };

      expect(() => {
        (service as any).validateDataset(dataset);
      }).not.toThrow();
    });

    it('should throw error for ontology mismatch', () => {
      const dataset = {
        metadata: {
          source: 'test-transformation',
          ontology: 'wrong-ontology',
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          recordCount: 1
        },
        records: [
          {
            id: 'test-1',
            type: 'TestEntity',
            content: 'Test content',
            properties: { name: 'Test' }
          }
        ]
      };

      expect(() => {
        (service as any).validateDataset(dataset);
      }).toThrow('Dataset ontology mismatch');
    });

    it('should warn for invalid entity types', () => {
      const dataset = {
        metadata: {
          source: 'test-transformation',
          ontology: 'test-ontology',
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          recordCount: 1
        },
        records: [
          {
            id: 'test-1',
            type: 'InvalidEntity',
            content: 'Test content',
            properties: { name: 'Test' }
          }
        ]
      };

      const { logger } = require('../../../src/common/utils/logger');
      
      (service as any).validateDataset(dataset);

      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid entity type in record test-1: InvalidEntity'
      );
    });

    it('should warn for invalid relationship types', () => {
      const dataset = {
        metadata: {
          source: 'test-transformation',
          ontology: 'test-ontology',
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          recordCount: 1
        },
        records: [
          {
            id: 'test-1',
            type: 'TestEntity',
            content: 'Test content',
            properties: { name: 'Test' },
            relationships: [
              {
                type: 'INVALID_RELATIONSHIP',
                target: 'test-2'
              }
            ]
          }
        ]
      };

      const { logger } = require('../../../src/common/utils/logger');
      
      (service as any).validateDataset(dataset);

      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid relationship type in record test-1: INVALID_RELATIONSHIP'
      );
    });
  });

  describe('convertToIngestionInputs', () => {
    it('should convert dataset to ingestion inputs correctly', () => {
      const dataset = {
        metadata: {
          source: 'test-transformation',
          ontology: 'test-ontology',
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          recordCount: 1
        },
        records: [
          {
            id: 'test-1',
            type: 'TestEntity',
            content: 'Test content',
            properties: { name: 'Test', code: '123' }
          }
        ]
      };

      const inputs = (service as any).convertToIngestionInputs(dataset);

      expect(inputs).toHaveLength(1);
      expect(inputs[0]).toEqual({
        id: 'test-1',
        content: 'Test content',
        meta: {
          source: 'test-transformation',
          ontology: 'test-ontology',
          type: 'TestEntity',
          name: 'Test',
          code: '123'
        }
      });
    });
  });

  describe('listAvailableDatasets', () => {
    it('should list available datasets for an ontology', () => {
      // Create mock config with datasets
      const config = {
        name: 'test-ontology',
        version: '1.0.0',
        description: 'Test ontology',
        enabled: true,
        priority: 1,
        source: {
          url: 'https://example.com',
          type: 'json',
          version: '1.0.0',
          description: 'Test source'
        },
        extraction: {
          entities: {},
          relationships: {}
        },
        datasets: {
          'dataset-1': {
            name: 'Test Dataset 1',
            description: 'First test dataset',
            source: 'test-source',
            url: 'https://example.com/dataset1',
            format: 'json',
            records: 100
          },
          'dataset-2': {
            name: 'Test Dataset 2',
            description: 'Second test dataset',
            source: 'test-source',
            url: 'https://example.com/dataset2',
            format: 'json',
            records: 200
          }
        }
      };

      fs.writeFileSync(path.join(tempOntologyDir, 'config.json'), JSON.stringify(config));

      // Create mock generic dataset
      const genericDataset = {
        metadata: {
          source: 'test-transformation',
          ontology: 'test-ontology',
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          recordCount: 50
        },
        records: []
      };

      fs.writeFileSync(path.join(tempDataDir, 'generic-dataset.json'), JSON.stringify(genericDataset));

      // Clear mock calls
      const { logger } = require('../../../src/common/utils/logger');
      (logger.info as jest.Mock).mockClear();

      GenericDatasetIngestionService.listAvailableDatasets('test-ontology');

      // Check that logger.info was called with expected messages
      expect(logger.info).toHaveBeenCalledWith('📊 Available datasets for ontology: test-ontology');
      expect(logger.info).toHaveBeenCalledWith('📋 Description: Test ontology');
      expect(logger.info).toHaveBeenCalledWith('  • dataset-1: Test Dataset 1');
      expect(logger.info).toHaveBeenCalledWith('  • dataset-2: Test Dataset 2');
      expect(logger.info).toHaveBeenCalledWith('📁 Existing generic datasets:');
    });

    it('should handle missing config file', () => {
      const { logger } = require('../../../src/common/utils/logger');

      GenericDatasetIngestionService.listAvailableDatasets('missing-ontology');

      expect(logger.error).toHaveBeenCalledWith('Config file not found for ontology: missing-ontology');
    });
  });
}); 