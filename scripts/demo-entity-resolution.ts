import { EntityResolutionService, ResolvableEntity } from '../src/extensions/financial/application/services/entity-resolution.service';

function runEntityResolutionDemo() {
  console.log('🚀 Starting Entity Resolution Demo...');

  // 1. Sample extracted entities with aliases
  const extractedEntities: ResolvableEntity[] = [
    { type: 'STOCK_SYMBOL', value: 'GS' },
    { type: 'COMPANY_NAME', value: 'Apple' }, // Not an exact match, won't be resolved
    { type: 'STOCK_SYMBOL', value: 'AAPL' },
    { type: 'COMPANY_NAME', value: 'Microsoft Corporation' },
    { type: 'STOCK_SYMBOL', value: 'MSFT' },
    { type: 'PERSON_NAME', value: 'John Doe' },
  ];

  console.log('\n--- Original Entities ---');
  console.log(JSON.stringify(extractedEntities, null, 2));

  // 2. Initialize the resolution service
  const resolutionService = new EntityResolutionService();

  // 3. Resolve the entities
  const resolvedEntities = resolutionService.resolve(extractedEntities);
  console.log('\n✅ Entities resolved.');

  console.log('\n--- Resolved Entities ---');
  console.log(JSON.stringify(resolvedEntities, null, 2));
  
  console.log('\n🏁 Demo finished.');
}

runEntityResolutionDemo(); 