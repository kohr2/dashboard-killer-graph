import { container } from 'tsyringe';
import { OntologyService } from '@platform/ontology/ontology.service';
import { createContactDTO } from '@platform/enrichment/dto-aliases';
import { logger } from '@shared/utils/logger';
import { 
  ContactService, 
  OrganizationService, 
  PersonService,
  ContactPointService,
  EmailService,
  PhoneNumberService,
  ActivityService,
  LocationService
} from '../../codegen/generated/crm';

export function registerCrm() {
  // Register generated services
  container.register('ContactService', { useClass: ContactService });
  container.register('OrganizationService', { useClass: OrganizationService });
  container.register('PersonService', { useClass: PersonService });
  container.register('ContactPointService', { useClass: ContactPointService });
  container.register('EmailService', { useClass: EmailService });
  container.register('PhoneNumberService', { useClass: PhoneNumberService });
  container.register('ActivityService', { useClass: ActivityService });
  container.register('LocationService', { useClass: LocationService });

  const ontologyService = container.resolve(OntologyService);

  ontologyService.registerEntityType(
    'Contact',
    createContactDTO,
  );

  // TODO: Register Organization entity once it is defined.
  
  logger.info('✅ CRM extension registered with generated services.');
}
