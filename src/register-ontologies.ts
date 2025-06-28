import { container } from 'tsyringe';
import { registerCrm } from './ontologies/crm';
import { registerFinancial } from './ontologies/financial';
import { logger } from '@shared/utils/logger';
// import { registerSecurity } from './ontologies/security';
// import { registerHealthcare } from './ontologies/healthcare';
// import { registerLegal } from './ontologies/legal';
// import { registerRealEstate } from './ontologies/real-estate';

/**
 * Registers all ontology extensions with the dependency injection container.
 * This function should be called at the application's entry point.
 */
export function registerAllOntologies() {
  logger.info('Registering all ontologies...');

  registerCrm();
  registerFinancial();
  // registerSecurity();
  // registerHealthcare();
  // registerLegal();
  // registerRealEstate();

  logger.info('All ontologies registered.');
} 