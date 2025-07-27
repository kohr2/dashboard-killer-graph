# Test Ontology (testont)

This is a dedicated test ontology for unit testing ontology-agnostic functionality.

## Purpose

The `testont` ontology is designed specifically for testing ontology-agnostic features to ensure:

1. **Works with any ontology** without hardcoded rules
2. **Handles missing or malformed ontology files** gracefully
3. **Is truly ontology-agnostic** - no domain-specific assumptions

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

The test ontology is used in various test files to verify:

- ✅ Ontology file loading
- ✅ Error handling for missing/malformed files
- ✅ Cross-ontology compatibility
- ✅ Integration with the full pipeline

## Files

- `ontology.json` - Main ontology definition with entities and relationships
- `testont.plugin.ts` - Plugin file for integration with the ontology system
- `config.json` - Configuration file for the ontology build system
- `README.md` - This documentation file

## Note

Relationship inference functionality has been removed from the codebase. This ontology is now used for general ontology-agnostic testing rather than specific relationship inference testing. 