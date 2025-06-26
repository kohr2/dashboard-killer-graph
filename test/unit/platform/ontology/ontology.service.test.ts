import 'reflect-metadata';
import { container } from 'tsyringe';
import { OntologyService } from '../../../../src/platform/ontology/ontology.service';

describe('OntologyService', () => {
    let ontologyService: OntologyService;

    beforeAll(() => {
        // Le service est un singleton géré par tsyringe
        ontologyService = container.resolve(OntologyService);
    });

    it('should validate a label that exists in a registered ontology', () => {
        // GIVEN un label valide
        const validLabel = 'Person'; // Ce label vient de l'ontologie CRM
        
        // WHEN la validation est effectuée
        const isValid = ontologyService.isValidLabel(validLabel);
        
        // THEN la validation doit réussir
        expect(isValid).toBe(true);
    });
    
    it('should not validate a label that does not exist in any registered ontology', () => {
        // GIVEN un label qui n'existe pas
        const invalidLabel = 'MyInvalidLabel';
        
        // WHEN la validation est effectuée
        const isValid = ontologyService.isValidLabel(invalidLabel);
        
        // THEN la validation doit échouer
        expect(isValid).toBe(false);
    });

    it('should return a list of all unique node labels from all registered extensions', () => {
        // WHEN on récupère tous les labels de noeuds
        const allLabels = ontologyService.getAllNodeLabels();

        // THEN la liste doit contenir des labels des ontologies chargées
        expect(allLabels).toContain('Person');
        expect(allLabels).toContain('Deal');
        
        const uniqueLabels = [...new Set(allLabels)];
        expect(allLabels.length).toBe(uniqueLabels.length);
    });

    it('should return a list of all unique relationship types from all registered extensions', () => {
        // WHEN on récupère tous les types de relations
        const allRelationshipTypes = ontologyService.getAllRelationshipTypes();

        // THEN la liste doit contenir des types de relations des ontologies chargées
        expect(allRelationshipTypes).toContain('WORKS_FOR');
        expect(allRelationshipTypes).toContain('HAS_INTEREST_IN');

        const uniqueTypes = [...new Set(allRelationshipTypes)];
        expect(allRelationshipTypes.length).toBe(uniqueTypes.length);
    });
}); 