import { RelationshipExtractionService, RelationshipEntity } from '../src/extensions/financial/application/services/relationship-extraction.service';

function runRelationshipExtractionDemo() {
  console.log('🚀 Starting Relationship Extraction Demo...');

  const signatureText = `
Best,
Claudia Gomez
Managing Director
Global TMT Group
`.trim();

  const entities: RelationshipEntity[] = [
    { id: '1', type: 'PERSON_NAME', value: 'Claudia Gomez' },
    { id: '2', type: 'JOB_TITLE', value: 'Managing Director' },
    { id: '3', type: 'ORGANIZATION', value: 'Global TMT Group' },
  ];

  console.log('\n--- Sample Text ---');
  console.log(signatureText);
  console.log('\n--- Extracted Entities ---');
  console.log(JSON.stringify(entities, null, 2));

  const relationshipService = new RelationshipExtractionService();
  const relationships = relationshipService.extract(signatureText, entities);

  console.log('\n--- Extracted Relationships ---');
  console.log(JSON.stringify(relationships, null, 2));

  console.log('\n🏁 Demo finished.');
}

runRelationshipExtractionDemo(); 