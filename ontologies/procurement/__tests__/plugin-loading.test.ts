import { OntologyService } from '../../../platform/ontology/ontology.service';
import { procurementPlugin } from '../procurement.plugin';

describe('OntologyService - Procurement Plugin Loading', () => {
  it('should aggregate entity schemas from the registered procurement plugin', () => {
    // Arrange
    const ontologyService = new OntologyService();

    // Act
    ontologyService.loadFromPlugins([procurementPlugin]);

    // Assert
    const allTypes = ontologyService.getAllEntityTypes();
    expect(allTypes).toEqual(
      expect.arrayContaining([
        'ProcurementProcedure',
        'Contract',
        'Tender',
        'ProcuringEntity',
      ]),
    );
  });
}); 