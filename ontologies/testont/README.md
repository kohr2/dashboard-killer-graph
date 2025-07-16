# Test Ontology (testont)

This is a dedicated test ontology for unit testing the ontology-agnostic relationship inference functionality.

## Purpose

The `testont` ontology is designed specifically for testing the `GenericIngestionPipeline.inferRelationships()` method to ensure it:

1. **Loads relationships from ontology.json files** correctly
2. **Works with any ontology** without hardcoded rules
3. **Handles missing or malformed ontology files** gracefully
4. **Creates relationships based on ontology schema** dynamically
5. **Is truly ontology-agnostic** - no domain-specific assumptions

## Structure

### Entities
- `TestEntity` / `RelatedEntity` - Generic test entities
- `Contract` / `PaymentExecutor` - Procurement test entities
- `Buyer` / `Winner` - Award test entities  
- `Investor` / `Company` - Financial test entities
- `FundManager` / `Portfolio` - Management test entities

### Relationships
- `definesPaymentExecutor` - Contract → PaymentExecutor
- `awardsTo` - Buyer → Winner
- `investsIn` - Investor → Company
- `manages` - FundManager → Portfolio
- `relatesTo` - TestEntity → RelatedEntity

## Usage in Tests

The test ontology is used in `src/ingestion/pipeline/__tests__/generic-ingestion-pipeline.test.ts` to verify:

- ✅ Ontology file loading
- ✅ Relationship inference from ontology schema
- ✅ Error handling for missing/malformed files
- ✅ Cross-ontology compatibility
- ✅ Integration with the full pipeline

## Files

- `ontology.json` - Main ontology definition with entities and relationships
- `testont.plugin.ts` - Plugin file for integration with the ontology system
- `config.json` - Configuration file for the ontology build system
- `README.md` - This documentation file

## Testing Scenarios

1. **Valid ontology loading** - Tests with procurement ontology
2. **Missing ontology file** - Tests with ocream ontology (no ontology.json)
3. **Malformed JSON** - Tests with testont ontology (simulated error)
4. **Different ontology types** - Tests with financial ontology
5. **No ontology specified** - Tests without ontologyName parameter
6. **Integration testing** - Tests full pipeline with relationship merging 