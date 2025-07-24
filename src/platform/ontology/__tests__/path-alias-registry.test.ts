import { PathAliasRegistry } from '../path-alias-registry';
import * as path from 'path';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock fs.existsSync
const mockExistsSync = jest.fn();
jest.spyOn(fs, 'existsSync').mockImplementation(mockExistsSync);

describe('PathAliasRegistry', () => {
  let registry: PathAliasRegistry;
  const mockCwd = '/mock/project/root';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock process.cwd
    jest.spyOn(process, 'cwd').mockReturnValue(mockCwd);
    
    // Mock fs.existsSync to return true for all paths by default
    mockExistsSync.mockImplementation((filePath: any) => {
      const pathString = filePath.toString();
      console.log('existsSync called with:', pathString);
      // Return true for all paths except those that should not exist
      return true;
    });
    
    // Get fresh instance
    registry = PathAliasRegistry.getInstance();
  });

  afterEach(() => {
    // Clear the singleton instance
    (PathAliasRegistry as any).instance = undefined;
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

      registry.registerPluginAliases(pluginName, aliases);

      const registeredAliases = registry.getRegisteredAliases();
      expect(registeredAliases.get('@test/*')).toBe(path.resolve(mockCwd, 'ontologies', pluginName, '*'));
      expect(registeredAliases.get('@test/entities')).toBe(path.resolve(mockCwd, 'ontologies', pluginName, 'entities'));
      expect(registeredAliases.get('@test/services')).toBe(path.resolve(mockCwd, 'ontologies', pluginName, 'services'));
    });

    it('should warn when alias target does not exist', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock fs.existsSync to return false for some paths
      mockExistsSync.mockImplementation((filePath: any) => {
        const pathString = filePath.toString();
        return !pathString.includes('nonexistent');
      });

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

      consoleSpy.mockRestore();
    });
  });

  describe('getPluginAliases', () => {
    it('should return aliases for a specific plugin', () => {
      const pluginName = 'test-plugin';
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
    });
  });

  describe('clear', () => {
    it('should clear all registered aliases', () => {
      const aliases = {
        '@test/*': '*',
        '@test/entities': 'entities'
      };

      registry.registerPluginAliases('test', aliases);
      expect(registry.getRegisteredAliases().size).toBe(2);

      registry.clear();
      expect(registry.getRegisteredAliases().size).toBe(0);
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

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockTsConfig));
      mockFs.writeFileSync.mockImplementation(() => {});

      const aliases = {
        '@test/*': '*',
        '@test/entities': 'entities'
      };

      registry.registerPluginAliases('test', aliases);
      registry.updateTsConfig();

      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        path.join(mockCwd, 'tsconfig.json'),
        'utf8'
      );

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join(mockCwd, 'tsconfig.json'),
        expect.stringContaining('@test/*')
      );
    });

    it('should handle missing tsconfig.json gracefully', () => {
      mockFs.existsSync.mockReturnValue(false);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      registry.updateTsConfig();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('tsconfig.json not found')
      );

      consoleSpy.mockRestore();
    });

    it('should create paths section if it does not exist', () => {
      const mockTsConfig = {
        compilerOptions: {}
      };

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockTsConfig));
      mockFs.writeFileSync.mockImplementation(() => {});

      const aliases = {
        '@test/*': '*'
      };

      registry.registerPluginAliases('test', aliases);
      registry.updateTsConfig();

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const writeCall = mockFs.writeFileSync.mock.calls[0];
      const writtenContent = writeCall[1] as string;
      const parsedContent = JSON.parse(writtenContent);

      expect(parsedContent.compilerOptions.paths).toBeDefined();
      expect(parsedContent.compilerOptions.paths['@test/*']).toBeDefined();
    });
  });
}); 