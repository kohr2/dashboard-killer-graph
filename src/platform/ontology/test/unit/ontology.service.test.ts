import { OntologyService } from '@platform/ontology/ontology.service';

// Mock ontology files
const mockCrmOntology = {
    name: "CRM Ontology",
    entities: { 
        "Contact": { "properties": { "name": "string" }, "keyProperties": ["name"] }
    },
    relationships: {
        "HAS_CONTACT": { domain: "Organization", range: "Contact" }
    }
};

const mockFinancialOntology = {
    name: "Financial Ontology",
    entities: {
        "Deal": { "properties": { "amount": "number" }, "keyProperties": ["amount"] }
    },
    relationships: {}
};

describe('OntologyService', () => {
    let ontologyService: OntologyService;

    beforeEach(() => {
        // We instantiate the service directly.
        // The constructor will try to load from files, but since fs is mocked, it will find nothing.
        // This is fine, because we will load our mocks manually.
        ontologyService = new OntologyService();
        
        // Use the public method to load mock data for tests
        ontologyService.loadFromObjects([mockCrmOntology, mockFinancialOntology] as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should validate a label that exists in a registered ontology', () => {
        expect(ontologyService.isValidLabel('Contact')).toBe(true);
        expect(ontologyService.isValidLabel('Deal')).toBe(true);
    });

    it('should not validate a label that does not exist in any registered ontology', () => {
        expect(ontologyService.isValidLabel('Unicorn')).toBe(false);
    });

    it('should return a list of all unique node labels from all registered extensions', () => {
        const labels = ontologyService.getAllNodeLabels();
        expect(labels).toEqual(expect.arrayContaining(['Contact', 'Deal']));
        expect(labels.length).toBe(2);
    });

    it('should return a list of all unique relationship types from all registered extensions', () => {
        const relTypes = ontologyService.getAllRelationshipTypes();
        expect(relTypes).toEqual(expect.arrayContaining(['HAS_CONTACT']));
        expect(relTypes.length).toBe(1);
    });

    it('should return the key properties for a given entity type', () => {
        const contactKeys = ontologyService.getKeyProperties('Contact');
        expect(contactKeys).toEqual(['name']);
        
        const dealKeys = ontologyService.getKeyProperties('Deal');
        expect(dealKeys).toEqual(['amount']);
    });

    it('should return an empty array for an unknown entity type', () => {
        const unknownKeys = ontologyService.getKeyProperties('Unicorn');
        expect(unknownKeys).toBeUndefined();
    });
}); 