import { registerCrmExtension } from './ontologies/crm/register';
import { registerFinancialExtension } from './ontologies/financial/register';

/**
 * Initializes all domain-specific extensions (ontologies) for the application.
 * This function should be called once at application startup.
 */
export function initializeOntologies(): void {
  console.log('🏁 Initializing all extensions...');
  registerCrmExtension();
  registerFinancialExtension();
  console.log('🚀 All extensions initialized.');
} 