import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { FinancialEntityIntegrationService } from './application/services/financial-entity-integration.service';
import { FinancialToCrmBridge } from './application/ontology-bridges/financial-to-crm.bridge';

export function registerFinancialExtension() {
  const ontologyService = container.resolve(OntologyService);

  // Example for registering a financial entity
  // ontologyService.registerEntityType('Investor', (data) => createInvestor(data));
  
  console.log('✅ Financial Extension registered.');
}

export function registerFinancialServices() {
  container.register('FinancialEntityIntegrationService', {
    useClass: FinancialEntityIntegrationService,
  });

  container.register('FinancialToCrmBridge', {
    useClass: FinancialToCrmBridge,
  });
} 