// Platform Extension Registry Tests
// These tests drive the development of the extension framework

import { ExtensionRegistry } from '@platform/extension-framework/extension-registry';

describe('ExtensionRegistry', () => {
  describe('Extension Registration', () => {
    it('should register an extension successfully', () => {
      // Arrange
      const registry = new ExtensionRegistry();
      const mockExtension = {
        name: 'financial',
        version: '1.0.0',
        dependencies: ['crm-core'],
        description: 'Financial deal tracking extension',
        initialize: jest.fn(),
        shutdown: jest.fn(),
        getRoutes: jest.fn(() => []),
        getComponents: jest.fn(() => []),
        getUseCases: jest.fn(() => []),
        getEventHandlers: jest.fn(() => []),
        getHealthStatus: jest.fn(() => ({ status: 'healthy' })),
        getMetrics: jest.fn(() => ({}))
      } as any;

      // Act
      registry.register('financial', mockExtension);

      // Assert
      const registeredExtension = registry.getExtension('financial');
      expect(registeredExtension).toBe(mockExtension);
      expect(registry.listExtensions()).toContain('financial');
    });

    it('should throw error when registering extension with duplicate name', () => {
      // Arrange
      const registry = new ExtensionRegistry();
      const extension1 = { name: 'test', version: '1.0.0' } as any;
      const extension2 = { name: 'test', version: '2.0.0' } as any;

      // Act & Assert
      registry.register('test', extension1);
      expect(() => {
        registry.register('test', extension2);
      }).toThrow('Extension with name "test" is already registered');
    });
  });

  describe('Extension Discovery', () => {
    it('should return empty list when no extensions registered', () => {
      // Arrange
      const registry = new ExtensionRegistry();

      // Act
      const extensions = registry.listExtensions();

      // Assert
      expect(extensions).toEqual([]);
    });

    it('should return null for non-existent extension', () => {
      // Arrange
      const registry = new ExtensionRegistry();

      // Act
      const extension = registry.getExtension('non-existent');

      // Assert
      expect(extension).toBeNull();
    });
  });
}); 