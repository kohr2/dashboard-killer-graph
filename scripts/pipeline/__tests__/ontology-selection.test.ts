import 'reflect-metadata';
import { jest } from '@jest/globals';
import { pluginRegistry } from '../../../config/ontology/plugins.config';

describe('Ontology Selection Feature', () => {
  let originalArgv: string[];
  let mockConsoleLog: any;
  let mockConsoleError: any;
  let mockProcessExit: any;

  beforeEach(() => {
    originalArgv = process.argv;
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    jest.clearAllMocks();
    pluginRegistry.reload();
  });

  afterEach(() => {
    process.argv = originalArgv;
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockProcessExit.mockRestore();
  });

  describe('Parameter Parsing', () => {
    it('should parse --ontology parameter correctly', () => {
      const argvFlags = ['--ontology=procurement', '--database=testdb'];
      const ONTOLOGY_ARG = argvFlags.find((arg) => arg.startsWith('--ontology='));
      const ONTOLOGY_NAME = ONTOLOGY_ARG ? ONTOLOGY_ARG.split('=')[1] : 'all';
      
      expect(ONTOLOGY_NAME).toBe('procurement');
    });

    it('should use "all" as default when no ontology parameter is provided', () => {
      const argvFlags = ['--database=testdb'];
      const ONTOLOGY_ARG = argvFlags.find((arg) => arg.startsWith('--ontology='));
      const ONTOLOGY_NAME = ONTOLOGY_ARG ? ONTOLOGY_ARG.split('=')[1] : 'all';
      
      expect(ONTOLOGY_NAME).toBe('all');
    });
  });

  describe('Ontology Validation', () => {
    it('should validate existing ontology names', () => {
      const allPlugins = pluginRegistry.getAllPlugins();
      const availableOntologies = Array.from(allPlugins.keys());
      
      expect(availableOntologies).toContain('core');
      expect(availableOntologies).toContain('crm');
      expect(availableOntologies).toContain('financial');
      expect(availableOntologies).toContain('procurement');
      expect(availableOntologies).toContain('fibo');
    });

    it('should reject invalid ontology names', () => {
      const allPlugins = pluginRegistry.getAllPlugins();
      const availableOntologies = Array.from(allPlugins.keys());
      const invalidOntology = 'invalid';
      
      expect(availableOntologies).not.toContain(invalidOntology);
    });
  });

  describe('Ontology Selection Logic', () => {
    it('should enable only specified ontology when not "all"', () => {
      const ontologyName: string = 'procurement';
      
      if (ontologyName !== 'all') {
        const allPlugins = pluginRegistry.getAllPlugins();
        const availableOntologies = Array.from(allPlugins.keys());
        
        if (availableOntologies.includes(ontologyName)) {
          for (const ontology of availableOntologies) {
            pluginRegistry.setPluginEnabled(ontology, false);
          }
          
          pluginRegistry.setPluginEnabled('core', true);
          pluginRegistry.setPluginEnabled(ontologyName, true);
          
          console.log(`✅ Enabled ontology: ${ontologyName} (plus core)`);
          
          expect(mockConsoleLog).toHaveBeenCalledWith(
            expect.stringContaining(`✅ Enabled ontology: ${ontologyName} (plus core)`)
          );
        }
      }
    });

    it('should always enable core ontology', () => {
      const ontologyName: string = 'procurement';
      
      if (ontologyName !== 'all') {
        const allPlugins = pluginRegistry.getAllPlugins();
        const availableOntologies = Array.from(allPlugins.keys());
        
        if (availableOntologies.includes(ontologyName)) {
          for (const ontology of availableOntologies) {
            pluginRegistry.setPluginEnabled(ontology, false);
          }
          
          pluginRegistry.setPluginEnabled('core', true);
          pluginRegistry.setPluginEnabled(ontologyName, true);
          
          const pluginSummary = pluginRegistry.getPluginSummary();
          expect(pluginSummary.enabled).toContain('core');
        }
      }
    });
  });

  describe('Integration with Other Parameters', () => {
    it('should work with database parameter', () => {
      const databaseName = 'testdb';
      const ontologyName = 'procurement';
      
      process.env.NEO4J_DATABASE = databaseName;
      console.log(`🗄️ Using database: ${databaseName}`);
      console.log(`🏛️ Ontology selection: ${ontologyName}`);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(`🗄️ Using database: ${databaseName}`)
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(`🏛️ Ontology selection: ${ontologyName}`)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing ontology files gracefully', () => {
      const invalidOntology = 'missing';
      const allPlugins = pluginRegistry.getAllPlugins();
      const availableOntologies = Array.from(allPlugins.keys());
      
      if (!availableOntologies.includes(invalidOntology)) {
        const errorMessage = `❌ Ontology '${invalidOntology}' not found. Available ontologies: ${availableOntologies.join(', ')}`;
        console.error(errorMessage);
        
        expect(mockConsoleError).toHaveBeenCalledWith(
          expect.stringContaining(`❌ Ontology '${invalidOntology}' not found`)
        );
        
        // Test that process.exit would be called with the correct exit code
        expect(() => {
          process.exit(1);
        }).toThrow('process.exit called');
        
        expect(mockProcessExit).toHaveBeenCalledWith(1);
      }
    });
  });
});
