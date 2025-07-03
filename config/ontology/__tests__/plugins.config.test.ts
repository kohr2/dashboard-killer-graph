import { getEnabledPlugins, getPluginSummary, isPluginEnabled, pluginRegistry } from '../plugins.config';

describe('PluginRegistry - Ontology-Agnostic Configuration', () => {
  it('should discover plugins dynamically from ontologies directory', () => {
    // Act
    const summary = getPluginSummary();
    
    // Assert
    expect(summary.enabled).toContain('core');
    expect(summary.enabled).toContain('crm');
    expect(summary.enabled).toContain('financial');
    expect(summary.disabled).toContain('procurement');
  });

  it('should return enabled plugins for ontology service', () => {
    // Act
    const enabledPlugins = getEnabledPlugins();
    
    // Assert
    expect(enabledPlugins).toHaveLength(3); // core, crm, financial
    expect(enabledPlugins.every(plugin => plugin.name)).toBe(true);
  });

  it('should check if specific plugins are enabled', () => {
    // Assert
    expect(isPluginEnabled('core')).toBe(true);
    expect(isPluginEnabled('crm')).toBe(true);
    expect(isPluginEnabled('financial')).toBe(true);
    expect(isPluginEnabled('procurement')).toBe(false);
    expect(isPluginEnabled('nonexistent')).toBe(false);
  });

  it('should allow enabling/disabling plugins at runtime', () => {
    // Arrange
    const originalState = isPluginEnabled('procurement');
    
    // Act
    pluginRegistry.setPluginEnabled('procurement', true);
    
    // Assert
    expect(isPluginEnabled('procurement')).toBe(true);
    
    // Cleanup
    pluginRegistry.setPluginEnabled('procurement', originalState);
  });

  it('should provide plugin details with descriptions', () => {
    // Act
    const details = pluginRegistry.getPluginDetails();
    
    // Assert
    expect(details.length).toBeGreaterThan(0);
    expect(details.every(plugin => 
      plugin.name && 
      typeof plugin.enabled === 'boolean' && 
      plugin.plugin && 
      plugin.description
    )).toBe(true);
  });
}); 