import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { FinancialEntityIntegrationService } from './application/services/financial-entity-integration.service';
import { FinancialToCrmBridge } from './application/ontology-bridges/financial-to-crm.bridge';
import { HybridDealExtractionService } from './application/services/hybrid-deal-extraction.service';
import { logger } from '@shared/utils/logger';

export function registerFinancial() {
  const ontologyService = container.resolve(OntologyService);

  // Example for registering a financial entity
  // ontologyService.registerEntityType('Investor', (data) => createInvestor(data));
  
  logger.info('✅ Financial extension registered.');
}

export function registerFinancialServices() {
  container.register('FinancialEntityIntegrationService', {
    useClass: FinancialEntityIntegrationService,
  });

  container.register('FinancialToCrmBridge', {
    useClass: FinancialToCrmBridge,
  });
} 