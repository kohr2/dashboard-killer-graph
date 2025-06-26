import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';

export function registerFinancialExtension() {
  const ontologyService = container.resolve(OntologyService);

  // Example for registering a financial entity
  // ontologyService.registerEntityType('Investor', (data) => createInvestor(data));
  
  console.log('✅ Financial Extension registered.');
} 