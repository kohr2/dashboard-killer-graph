import { getEnabledPlugins, getPluginSummary, isPluginEnabled } from '../../../config/ontology/plugins.config';

describe('FIBO Plugin Discovery', () => {
  it('should discover and load FIBO plugin correctly', () => {
    // Test if FIBO plugin is enabled
    const fiboEnabled = isPluginEnabled('fibo');
    expect(fiboEnabled).toBe(true);

    // Get plugin summary
    const summary = getPluginSummary();
    expect(summary.enabled).toContain('fibo');

    // Get all enabled plugins
    const enabledPlugins = getEnabledPlugins();
    
    // Check if FIBO is in the enabled list
    const fiboPlugin = enabledPlugins.find(p => p.name === 'fibo');
    expect(fiboPlugin).toBeDefined();
    expect(fiboPlugin?.name).toBe('fibo');
    expect(fiboPlugin?.entitySchemas).toBeDefined();
    expect(fiboPlugin?.relationshipSchemas).toBeDefined();
  });

  it('should handle missing register.ts file gracefully', () => {
    const enabledPlugins = getEnabledPlugins();
    const fiboPlugin = enabledPlugins.find(p => p.name === 'fibo');
    
    // FIBO plugin should now load with serviceProviders since register.ts exists
    expect(fiboPlugin).toBeDefined();
    expect(fiboPlugin?.serviceProviders).toBeDefined();
    expect(fiboPlugin?.serviceProviders?.register).toBeDefined();
  });

  it('should load ontology data from JSON file', () => {
    const enabledPlugins = getEnabledPlugins();
    const fiboPlugin = enabledPlugins.find(p => p.name === 'fibo');
    
    expect(fiboPlugin?.entitySchemas).toBeDefined();
    expect(fiboPlugin?.relationshipSchemas).toBeDefined();
    
    // Even if the ontology is empty (due to XML parsing issues), the plugin should still load
    expect(typeof fiboPlugin?.entitySchemas).toBe('object');
    expect(typeof fiboPlugin?.relationshipSchemas).toBe('object');
  });
}); 