import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { logger } from '@shared/utils/logger';
import { 
  InvestorService,
  DealService,
  TargetCompanyService,
  FundService,
  SponsorService,
  SectorService,
  GeographicRegionService,
  MandateService,
  RelationshipService,
  EventService,
  MonetaryAmountService,
  PercentService,

  DocumentService,
  ProcessService,
  LegalDocumentService,
  RegulatoryInformationService,
  CommunicationService
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
