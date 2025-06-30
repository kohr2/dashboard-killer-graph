import 'reflect-metadata';
import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { registerAllOntologies } from '@src/register-ontologies';

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
        // Clear any existing registrations
        container.clearInstances();
        
        // Register the singleton
        container.registerSingleton(OntologyService);
        
        // Load ontologies via the plugin system
        registerAllOntologies();
        
        // Get the singleton instance
        ontologyService = container.resolve(OntologyService);
    });

    afterEach(() => {
        container.clearInstances();
    });

    describe('Plugin-based Ontology Loading', () => {
        it('should load ontologies from plugins correctly', () => {
            const entityTypes = ontologyService.getAllEntityTypes();
            const relationshipTypes = ontologyService.getAllRelationshipTypes();
            
            // Should have loaded entities from CRM, Financial, and Procurement plugins
            expect(entityTypes.length).toBeGreaterThan(30);
            expect(relationshipTypes.length).toBeGreaterThan(20);
        });

        it('should contain key entity types from all plugins', () => {
            const entityTypes = ontologyService.getAllEntityTypes();
            
            // CRM entities
            expect(entityTypes).toContain('Person');
            expect(entityTypes).toContain('Organization');
            expect(entityTypes).toContain('Contact');
            expect(entityTypes).toContain('Communication');
            
            // Financial entities
            expect(entityTypes).toContain('Deal');
            expect(entityTypes).toContain('Investor');
            expect(entityTypes).toContain('Fund');
            expect(entityTypes).toContain('TargetCompany');
            
            // Procurement entities
            expect(entityTypes).toContain('Contract');
            expect(entityTypes).toContain('Tender');
            expect(entityTypes).toContain('ProcuringEntity');
        });

        it('should contain key relationship types from all plugins', () => {
            const relationshipTypes = ontologyService.getAllRelationshipTypes();
            
            // CRM relationships
            expect(relationshipTypes).toContain('WORKS_FOR');
            expect(relationshipTypes).toContain('HAS_EMAIL');
            expect(relationshipTypes).toContain('CONTACTED');
            
            // Financial relationships
            expect(relationshipTypes).toContain('INVESTED_IN');
            expect(relationshipTypes).toContain('MANAGES');
            expect(relationshipTypes).toContain('TARGETS');
            
            // Procurement relationships
            expect(relationshipTypes).toContain('HAS_TENDER');
            expect(relationshipTypes).toContain('SUBMITTED_BY');
        });
    });

    describe('Schema Validation', () => {
        it('should validate entity types that exist in the loaded ontologies', () => {
            expect(ontologyService.isValidLabel('Person')).toBe(true);
            expect(ontologyService.isValidLabel('Deal')).toBe(true);
            expect(ontologyService.isValidLabel('Organization')).toBe(true);
            expect(ontologyService.isValidLabel('Contract')).toBe(true);
        });

        it('should not validate entity types that do not exist', () => {
            expect(ontologyService.isValidLabel('Unicorn')).toBe(false);
            expect(ontologyService.isValidLabel('NonExistentEntity')).toBe(false);
        });
    });

    describe('Schema Representation', () => {
        it('should generate a comprehensive schema representation', () => {
            const schema = ontologyService.getSchemaRepresentation();
            
            expect(schema).toContain('Person');
            expect(schema).toContain('Deal');
            expect(schema).toContain('Organization');
            expect(schema).toContain('WORKS_FOR');
            expect(schema).toContain('INVESTED_IN');
            expect(schema).toContain('HAS_TENDER');
        });

        it('should include entity properties in schema representation', () => {
            const schema = ontologyService.getSchemaRepresentation();
            
            // Should contain property information
            expect(schema.length).toBeGreaterThan(1000); // Should be a substantial schema
        });
    });

    describe('Singleton Behavior', () => {
        it('should return the same instance when resolved multiple times', () => {
            const instance1 = container.resolve(OntologyService);
            const instance2 = container.resolve(OntologyService);
            
            expect(instance1).toBe(instance2);
            expect(instance1).toBe(ontologyService);
        });

        it('should maintain loaded data across multiple resolutions', () => {
            const instance1 = container.resolve(OntologyService);
            const instance2 = container.resolve(OntologyService);
            
            const entities1 = instance1.getAllEntityTypes();
            const entities2 = instance2.getAllEntityTypes();
            
            expect(entities1).toEqual(entities2);
            expect(entities1.length).toBeGreaterThan(30);
        });
    });

    describe('Instance Tracking', () => {
        it('should track instance creation for debugging', () => {
            const instanceId = ontologyService.getInstanceId();
            expect(typeof instanceId).toBe('number');
            expect(instanceId).toBeGreaterThan(0);
        });
    });

    describe('Node Labels', () => {
        it('should return all unique node labels from loaded ontologies', () => {
            const labels = ontologyService.getAllNodeLabels();
            
            expect(labels).toContain('Person');
            expect(labels).toContain('Deal');
            expect(labels).toContain('Organization');
            expect(labels).toContain('Contract');
            
            // Should not contain duplicates
            const uniqueLabels = [...new Set(labels)];
            expect(labels.length).toBe(uniqueLabels.length);
        });
    });
}); 