import { PathAliasRegistry } from '../path-alias-registry';
import * as path from 'path';

describe('PathAliasRegistry', () => {
  let registry: PathAliasRegistry;
  const mockCwd = '/mock/project/root';

  beforeEach(() => {
    // Reset the singleton instance first
    (PathAliasRegistry as any).instance = undefined;
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock process.cwd
    jest.spyOn(process, 'cwd').mockReturnValue(mockCwd);
    
    // Get fresh instance
    registry = PathAliasRegistry.getInstance();
  });

  afterEach(() => {
    // Clear the singleton instance and its registered aliases
    const instance = PathAliasRegistry.getInstance();
    instance.clear();
    // Reset the singleton instance
    (PathAliasRegistry as any).instance = undefined;
    // Clear all mocks
    jest.clearAllMocks();
    // Restore all spies
    jest.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = PathAliasRegistry.getInstance();
      const instance2 = PathAliasRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('registerPluginAliases', () => {
    it('should register aliases for a plugin', () => {
      const pluginName = 'test-plugin';
      const aliases = {
        '@test/*': '*',
        '@test/entities': 'entities',
        '@test/services': 'services'
      };

      // Mock the existsSync check to always return true
      const originalExistsSync = require('fs').existsSync;
      require('fs').existsSync = jest.fn().mockReturnValue(true);

      try {
        registry.registerPluginAliases(pluginName, aliases);

        const registeredAliases = registry.getRegisteredAliases();
        expect(registeredAliases.get('@test/*')).toBe(path.resolve(mockCwd, 'ontologies', pluginName, '*'));
        expect(registeredAliases.get('@test/entities')).toBe(path.resolve(mockCwd, 'ontologies', pluginName, 'entities'));
        expect(registeredAliases.get('@test/services')).toBe(path.resolve(mockCwd, 'ontologies', pluginName, 'services'));
      } finally {
        // Restore the original function
        require('fs').existsSync = originalExistsSync;
      }
    });

    it('should warn when alias target does not exist', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock the existsSync check to return false for nonexistent paths
      const originalExistsSync = require('fs').existsSync;
      require('fs').existsSync = jest.fn().mockImplementation((filePath: any) => {
        const pathString = filePath.toString();
        return !pathString.includes('nonexistent');
      });

      try {
        const pluginName = 'test-plugin';
        const aliases = {
          '@test/existing': 'existing',
          '@test/nonexistent': 'nonexistent'
        };

        registry.registerPluginAliases(pluginName, aliases);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Path alias target does not exist')
        );

        const registeredAliases = registry.getRegisteredAliases();
        expect(registeredAliases.get('@test/existing')).toBeDefined();
        expect(registeredAliases.get('@test/nonexistent')).toBeUndefined();
      } finally {
        // Restore the original function
        require('fs').existsSync = originalExistsSync;
        consoleSpy.mockRestore();
      }
    });
  });

  describe('getPluginAliases', () => {
    it('should return aliases for a specific plugin', () => {
      // Mock the existsSync check to always return true
      const originalExistsSync = require('fs').existsSync;
      require('fs').existsSync = jest.fn().mockReturnValue(true);

      try {
        const pluginName = 'test';
        const aliases = {
          '@test/*': '*',
          '@test/entities': 'entities',
          '@other/*': '*'
        };

        registry.registerPluginAliases(pluginName, aliases);
        registry.registerPluginAliases('other', { '@other/*': '*' });

        const pluginAliases = registry.getPluginAliases('test');
        expect(pluginAliases['@test/*']).toBeDefined();
        expect(pluginAliases['@test/entities']).toBeDefined();
        expect(pluginAliases['@other/*']).toBeUndefined();
      } finally {
        // Restore the original function
        require('fs').existsSync = originalExistsSync;
      }
    });
  });

  describe('clear', () => {
    it('should clear all registered aliases', () => {
      // Mock the existsSync check to always return true
      const originalExistsSync = require('fs').existsSync;
      require('fs').existsSync = jest.fn().mockReturnValue(true);

      try {
        const aliases = {
          '@test/*': '*',
          '@test/entities': 'entities'
        };

        registry.registerPluginAliases('test', aliases);
        expect(registry.getRegisteredAliases().size).toBe(2);

        registry.clear();
        expect(registry.getRegisteredAliases().size).toBe(0);
      } finally {
        // Restore the original function
        require('fs').existsSync = originalExistsSync;
      }
    });
  });

  describe('updateTsConfig', () => {
    it('should update tsconfig.json with registered aliases', () => {
      const mockTsConfig = {
        compilerOptions: {
          paths: {
            '@existing/*': ['existing/path']
          }
        }
      };

      // Mock fs functions
      const originalReadFileSync = require('fs').readFileSync;
      const originalWriteFileSync = require('fs').writeFileSync;
      const originalExistsSync = require('fs').existsSync;
      
      require('fs').readFileSync = jest.fn().mockReturnValue(JSON.stringify(mockTsConfig));
      require('fs').writeFileSync = jest.fn().mockImplementation(() => {});
      require('fs').existsSync = jest.fn().mockReturnValue(true);

      try {
        const aliases = {
          '@test/*': '*',
          '@test/entities': 'entities'
        };

        registry.registerPluginAliases('test', aliases);
        registry.updateTsConfig();

        expect(require('fs').readFileSync).toHaveBeenCalledWith(
          path.join(mockCwd, 'tsconfig.json'),
          'utf8'
        );

        expect(require('fs').writeFileSync).toHaveBeenCalledWith(
          path.join(mockCwd, 'tsconfig.json'),
          expect.stringContaining('@test/*')
        );
      } finally {
        // Restore the original functions
        require('fs').readFileSync = originalReadFileSync;
        require('fs').writeFileSync = originalWriteFileSync;
        require('fs').existsSync = originalExistsSync;
      }
    });

    it('should handle missing tsconfig.json gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock fs.existsSync to return false
      const originalExistsSync = require('fs').existsSync;
      require('fs').existsSync = jest.fn().mockReturnValue(false);

      try {
        registry.updateTsConfig();

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('tsconfig.json not found')
        );
      } finally {
        // Restore the original function
        require('fs').existsSync = originalExistsSync;
        consoleSpy.mockRestore();
      }
    });

    it('should create paths section if it does not exist', () => {
      const mockTsConfig = {
        compilerOptions: {}
      };

      // Mock fs functions
      const originalReadFileSync = require('fs').readFileSync;
      const originalWriteFileSync = require('fs').writeFileSync;
      const originalExistsSync = require('fs').existsSync;
      
      require('fs').readFileSync = jest.fn().mockReturnValue(JSON.stringify(mockTsConfig));
      require('fs').writeFileSync = jest.fn().mockImplementation(() => {});
      require('fs').existsSync = jest.fn().mockReturnValue(true);

      try {
        const aliases = {
          '@test/*': '*'
        };

        registry.registerPluginAliases('test', aliases);
        registry.updateTsConfig();

        expect(require('fs').writeFileSync).toHaveBeenCalled();
        const writeCall = (require('fs').writeFileSync as jest.Mock).mock.calls[0];
        const writtenContent = writeCall[1] as string;
        const parsedContent = JSON.parse(writtenContent);

        expect(parsedContent.compilerOptions.paths).toBeDefined();
        expect(parsedContent.compilerOptions.paths['@test/*']).toBeDefined();
      } finally {
        // Restore the original functions
        require('fs').readFileSync = originalReadFileSync;
        require('fs').writeFileSync = originalWriteFileSync;
        require('fs').existsSync = originalExistsSync;
      }
    });
  });
}); 