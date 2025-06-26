import { registerCrmExtension } from './extensions/crm/register';
import { registerFinancialExtension } from './extensions/financial/register';

export function initializeExtensions() {
  console.log('🏁 Initializing all extensions...');
  registerCrmExtension();
  registerFinancialExtension();
  console.log('🚀 All extensions initialized.');
} 