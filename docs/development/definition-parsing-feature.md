# Definition Text Parsing for Relationships

## Overview

The ontology build script now includes intelligent parsing of definition text to extract relationship source and target entities when explicit `rdfs:domain` and `rdfs:range` are missing from OWL ObjectProperty definitions.

## Problem

Many ontologies (including the procurement ontology) define relationships (ObjectProperties) with human-readable definitions but without explicit machine-readable domain and range specifications. For example:

```xml
<owl:ObjectProperty rdf:about="http://data.europa.eu/a4g/ontology#hasFinancialOfferValue">
  <skos:prefLabel>has Financial Offer Value</skos:prefLabel>
  <skos:definition>The value offered by the Tenderer for a Lot. This value is normally the one awarded for a winning Tender Lot.</skos:definition>
</owl:ObjectProperty>
```

This property has no explicit `rdfs:domain` or `rdfs:range`, but the definition clearly mentions "Tenderer" and "Lot" entities.

## Solution

The build script now:

1. **Extracts all entities** from the ontology first
2. **Parses relationship definitions** to find entity names mentioned in the text
3. **Matches against the actual entity list** (ontology agnostic)
4. **Assigns source and target** based on the first two entities found in the definition

## Implementation

### Key Methods

- `buildRelationshipWithEntities()`: Main method that builds relationships with access to entity names
- `extractEntitiesFromDefinition()`: Parses definition text to find entity mentions
- `extractEntitiesFromDefinition()`: Uses word boundary matching to avoid partial matches

### Algorithm

1. **Entity Extraction**: All entities are extracted first to build the available entity list
2. **Definition Parsing**: For each relationship without explicit domain/range:
   - Extract the definition text (from `skos:definition` or `rdfs:comment`)
   - Search for entity names using case-insensitive word boundary matching
   - Sort entities by length (longest first) to avoid partial matches
   - Return unique entities in order of appearance
3. **Assignment**: Use the first two entities found as source and target

### Example

For the relationship:
```xml
<owl:ObjectProperty rdf:about="http://test.org/ontology#hasFinancialOfferValue">
  <skos:definition>The value offered by the Tenderer for a Lot.</skos:definition>
</owl:ObjectProperty>
```

With available entities: `["Tenderer", "Lot", "Contract"]`

Result:
```json
{
  "name": "hasFinancialOfferValue",
  "source": "Tenderer",
  "target": "Lot",
  "description": "The value offered by the Tenderer for a Lot."
}
```

## Features

### Ontology Agnostic

The implementation is completely ontology agnostic:
- No hardcoded entity names
- Uses the actual entity list from the ontology being processed
- Works with any ontology structure

### Robust Matching

- **Word boundary matching**: Prevents partial matches (e.g., "Tenderer" won't match "TendererGroup")
- **Case insensitive**: Handles variations in capitalization
- **Length-based sorting**: Longer entity names are matched first to avoid conflicts
- **Order preservation**: Entities are returned in the order they appear in the definition

### Fallback Handling

- If no entities are found in the definition, falls back to default "Entity" values
- If only one entity is found, uses it for both source and target
- Maintains backward compatibility with existing explicit domain/range definitions

## Testing

The feature is tested with comprehensive test cases:

1. **Basic extraction**: Tests simple entity extraction from definitions
2. **Multiple entities**: Tests handling of definitions with multiple entity mentions
3. **Fallback scenarios**: Tests behavior when no entities are found
4. **Edge cases**: Tests various definition formats and entity name patterns

## Usage

The feature is automatically enabled and requires no configuration changes. It will:

1. Work with existing ontologies without modification
2. Improve relationship extraction for ontologies with missing domain/range
3. Maintain compatibility with ontologies that have explicit domain/range

## Benefits

- **Increased relationship coverage**: More relationships are successfully extracted
- **Better entity recognition**: Relationships are properly connected to actual entities
- **Reduced manual work**: No need to manually add domain/range to OWL files
- **Improved data quality**: More complete relationship graphs for analysis

## Limitations

- **Text-based parsing**: Relies on entity names being mentioned in definitions
- **Order dependency**: Uses first two entities found in definition order
- **No semantic understanding**: Does not understand complex linguistic structures
- **Requires entity extraction**: Depends on successful entity extraction first

## Future Improvements

Potential enhancements:
- **Semantic parsing**: Use NLP to better understand relationship semantics
- **Context awareness**: Consider relationship context and ontology structure
- **Machine learning**: Train models to improve entity extraction accuracy
- **Multi-language support**: Handle definitions in different languages 