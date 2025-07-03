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
  DateService,
  PercentService,
  TimeService,
  DocumentService,
  ProcessService,
  LegalDocumentService,
  RegulatoryInformationService,
  CommunicationService,
  FinancialEntityIntegrationService,
  HybridDealExtractionService
} from '@generated/financial';

export function registerFinancial() {
  const ontologyService = container.resolve(OntologyService);

  // Example for registering a financial entity
  // ontologyService.registerEntityType('Investor', (data) => createInvestor(data));
  
  logger.info('Registering Financial ontology services...');
  
  // Register generated services
  container.register('InvestorService', { useClass: InvestorService });
  container.register('DealService', { useClass: DealService });
  container.register('TargetCompanyService', { useClass: TargetCompanyService });
  container.register('FundService', { useClass: FundService });
  container.register('SponsorService', { useClass: SponsorService });
  container.register('SectorService', { useClass: SectorService });
  container.register('GeographicRegionService', { useClass: GeographicRegionService });
  container.register('MandateService', { useClass: MandateService });
  container.register('RelationshipService', { useClass: RelationshipService });
  container.register('EventService', { useClass: EventService });
  container.register('MonetaryAmountService', { useClass: MonetaryAmountService });
  container.register('DateService', { useClass: DateService });
  container.register('PercentService', { useClass: PercentService });
  container.register('TimeService', { useClass: TimeService });
  container.register('DocumentService', { useClass: DocumentService });
  container.register('ProcessService', { useClass: ProcessService });
  container.register('LegalDocumentService', { useClass: LegalDocumentService });
  container.register('RegulatoryInformationService', { useClass: RegulatoryInformationService });
  container.register('CommunicationService', { useClass: CommunicationService });
  container.register('FinancialEntityIntegrationService', { useClass: FinancialEntityIntegrationService });
  container.register('HybridDealExtractionService', { useClass: HybridDealExtractionService });
  
  logger.info('✅ Financial ontology services registered successfully');
}

export function registerFinancialServices() {
  registerFinancial();
}
