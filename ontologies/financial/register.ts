import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { logger } from '@shared/utils/logger';
import { 
  LegalEntityService,
  OrganizationService,
  PersonService,
  AccountService,
  FinancialInstrumentService,
  SecurityService,
  AgreementService
} from '@generated/financial';

export function registerFinancial() {
  const ontologyService = container.resolve(OntologyService);

  // Example for registering a financial entity
  // ontologyService.registerEntity('Investor', InvestorService);
  
  logger.info('Financial ontology registered');
}

export function registerFinancialServices() {
  registerFinancial();
}
