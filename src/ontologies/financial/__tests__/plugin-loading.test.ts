import { OntologyService } from '@platform/ontology/ontology.service';
import { financialPlugin } from '../financial.plugin';

describe('OntologyService - Financial Plugin Loading', () => {
  let ontologyService: OntologyService;

  beforeEach(() => {
    ontologyService = new OntologyService();
  });

  it('should load financial plugin with entities and relationships from ontology.json', () => {
    // Load the financial plugin
    ontologyService.loadFromPlugins([financialPlugin]);

    // Verify that entities are loaded
    expect(financialPlugin.entitySchemas).toBeDefined();
    expect(financialPlugin.entitySchemas.Investor).toBeDefined();
    expect(financialPlugin.entitySchemas.Deal).toBeDefined();
    expect(financialPlugin.entitySchemas.Fund).toBeDefined();

    // Verify that relationships are loaded
    expect(financialPlugin.relationshipSchemas).toBeDefined();
    expect(financialPlugin.relationshipSchemas?.INVESTED_IN).toBeDefined();
    expect(financialPlugin.relationshipSchemas?.MANAGES).toBeDefined();

    // Verify that reasoning algorithms are loaded
    expect(financialPlugin.reasoning).toBeDefined();
    expect(financialPlugin.reasoning?.algorithms).toBeDefined();
    expect(financialPlugin.reasoning?.algorithms?.similarity_scoring).toBeDefined();
    expect(financialPlugin.reasoning?.algorithms?.risk_assessment).toBeDefined();
  });

  it('should have correct plugin metadata', () => {
    expect(financialPlugin.name).toBe('financial');
    expect(financialPlugin.serviceProviders).toBeDefined();
    expect(financialPlugin.serviceProviders?.register).toBeDefined();
  });
}); 