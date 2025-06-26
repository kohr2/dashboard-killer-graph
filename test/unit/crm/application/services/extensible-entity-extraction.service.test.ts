import { ExtensibleEntityExtractionService, ExtensionEntityRegistry } from '../../../../../src/extensions/crm/application/services/extensible-entity-extraction.service';
import { SpacyEntityExtractionService } from '../../../../../src/extensions/crm/application/services/spacy-entity-extraction.service';
import { OCreamV2Ontology } from '../../../../../src/extensions/crm/domain/ontology/o-cream-v2';

jest.mock('../../../../../src/extensions/crm/application/services/spacy-entity-extraction.service');
jest.mock('../../../../../src/extensions/crm/domain/ontology/o-cream-v2');

const { ExtensibleEntityExtractionService: ActualService } = jest.requireActual('../../../../../src/extensions/crm/application/services/extensible-entity-extraction.service');

describe('ExtensibleEntityExtractionService', () => {
  let service: ExtensibleEntityExtractionService;
  let mockSpacyService: jest.Mocked<SpacyEntityExtractionService>;
  let mockOntology: jest.Mocked<OCreamV2Ontology>;

  beforeEach(() => {
    mockSpacyService = new (SpacyEntityExtractionService as any)();
    mockOntology = OCreamV2Ontology.getInstance() as jest.Mocked<OCreamV2Ontology>;
    
    service = new ActualService();
    
    (service as any).coreExtractor = mockSpacyService;
    (service as any).ontology = mockOntology;
    (service as any).extensionRegistry.clear();
  });

  describe('registerExtension', () => {
    it('should register a new extension and add it to the registry', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const newExtension: ExtensionEntityRegistry = {
        extensionName: 'TestExtension',
        entityTypes: [{ type: 'TEST_ENTITY', category: 'CUSTOM', description: 'A test entity' }],
        ontologyMapping: {},
        customExtractors: [],
      };

      service.registerExtension(newExtension);

      const registry = (service as any).extensionRegistry as Map<string, ExtensionEntityRegistry>;
      expect(registry.has('TestExtension')).toBe(true);
      expect(registry.get('TestExtension')).toEqual(newExtension);
      expect(consoleSpy).toHaveBeenCalledWith('📦 Registered extension: TestExtension with 1 entity types');
      
      consoleSpy.mockRestore();
    });
  });
});

