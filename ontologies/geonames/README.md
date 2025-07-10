# GeoNames Ontology Plugin

## Overview

The GeoNames ontology plugin provides a schema for representing geographic places, cities, countries, administrative regions, and features using data from the official [GeoNames](https://www.geonames.org/) dataset. It enables entity extraction, enrichment, and reasoning for geographic data.

## Entities
- **Place**: Generic geographic place (base class)
- **City**: Populated place (city, town, village)
- **Country**: Country entity
- **AdminRegion**: Administrative region (state, province, etc.)
- **Feature**: Geographic feature (mountain, river, etc.)

## Relationships
- **LOCATED_IN**: Place is located in a country or region
- **NEAR**: Place is geographically near another place
- **HAS_FEATURE**: Country or region has a geographic feature

## Data Source
- **Dataset**: [GeoNames cities1000.txt](https://download.geonames.org/export/dump/cities1000.zip)
- **Fields**: geonameid, name, asciiname, alternatenames, latitude, longitude, feature class, feature code, country code, admin1 code, population, etc.
- **License**: Creative Commons Attribution (CC-BY)

## Usage
1. **Transform Data**: Run the transformation script to convert the GeoNames dataset to ontology-compatible JSON:
   ```bash
   npx ts-node scripts/ontology/transform-geonames-data.ts
   ```
2. **Ingest Data**: Use the generic ingestion pipeline or a geonames-only ingestion script to load data into the knowledge graph.
3. **Entity Extraction**: Use the plugin's extraction patterns to identify cities, countries, and features in text.

## Transformation Script
- **Script**: `scripts/ontology/transform-geonames-data.ts`
- **Output**: `ontologies/geonames/data/geonames_cities.json`

## Example Entity (City)
```json
{
  "geonameid": "5128581",
  "name": "New York City",
  "asciiname": "New York City",
  "alternatenames": "NYC,New York,Big Apple",
  "latitude": 40.71427,
  "longitude": -74.00597,
  "population": 8175133,
  "countryCode": "US",
  "admin1Code": "NY"
}
```

## Testing
- Run plugin tests: `npm test -- ontologies/geonames/__tests__/plugin-loading.test.ts`
- Run transformation tests: `npm test -- scripts/ontology/__tests__/transform-geonames-data.test.ts`

## License
This plugin is part of the main project and follows the same license terms as GeoNames (CC-BY). 