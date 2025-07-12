# GeoNames Ontology

The GeoNames ontology provides a comprehensive schema for representing geographic places, cities, countries, administrative regions, and features using data from the official [GeoNames](https://www.geonames.org/) dataset.

## Overview

This ontology enables entity extraction, enrichment, and reasoning for geographic data, supporting applications that need to understand and process location-based information. It follows the ontology-agnostic architecture pattern and integrates seamlessly with the knowledge graph system.

## Data Source

- **Dataset**: [GeoNames cities1000.txt](https://download.geonames.org/export/dump/cities1000.zip)
- **Content**: Cities, towns, and villages with population > 1,000
- **Format**: Tab-separated values (TSV)
- **License**: Creative Commons Attribution (CC-BY)
- **Update Frequency**: Daily exports from GeoNames database

### Dataset Fields

| Field | Type | Description |
|-------|------|-------------|
| geonameid | string | GeoNames unique identifier |
| name | string | Name of the place |
| asciiname | string | ASCII name |
| alternatenames | string | Comma-separated alternate names |
| latitude | number | Latitude coordinate |
| longitude | number | Longitude coordinate |
| featureClass | string | Feature class (A, P, S, etc.) |
| featureCode | string | Feature code (PPL, ADM1, etc.) |
| countryCode | string | Country code (ISO) |
| admin1Code | string | Admin region code (state/province) |
| population | number | Population count |
| timezone | string | Timezone identifier |
| modificationDate | string | Last modification date |

## Core Entities

### Place (Base Class)
Generic geographic place that serves as the base class for all location entities.

**Properties:**
- `geonameid`: GeoNames unique identifier
- `name`: Place name
- `latitude`: Latitude coordinate
- `longitude`: Longitude coordinate
- `featureClass`: Feature class (A, P, S, etc.)
- `featureCode`: Feature code (PPL, ADM1, etc.)
- `countryCode`: Country code (ISO)

### City
Populated place including cities, towns, and villages.

**Properties:**
- All Place properties
- `asciiname`: ASCII name
- `alternatenames`: Comma-separated alternate names
- `population`: Population count
- `admin1Code`: Admin region code (state/province)
- `timezone`: Timezone identifier
- `modificationDate`: Last modification date

### Country
Country entity with administrative information.

**Properties:**
- `geonameid`: GeoNames unique identifier
- `name`: Country name
- `countryCode`: Country code (ISO)
- `population`: Population count
- `area`: Area in square kilometers
- `capital`: Capital city name

### AdminRegion
Administrative region such as state, province, or territory.

**Properties:**
- `geonameid`: GeoNames unique identifier
- `name`: Region name
- `admin1Code`: Admin region code
- `countryCode`: Country code (ISO)

### Feature
Geographic feature such as mountain, river, or landmark.

**Properties:**
- `geonameid`: GeoNames unique identifier
- `name`: Feature name
- `featureClass`: Feature class
- `featureCode`: Feature code
- `countryCode`: Country code (ISO)

## Relationships

### LOCATED_IN
Place is located in a country or administrative region.

- **Source**: Place
- **Target**: AdminRegion
- **Description**: Hierarchical location relationship

### NEAR
Place is geographically near another place.

- **Source**: Place
- **Target**: Place
- **Properties**:
  - `distanceKm`: Distance in kilometers
- **Description**: Proximity relationship for spatial analysis

### HAS_FEATURE
Country or region has a geographic feature.

- **Source**: Country
- **Target**: Feature
- **Description**: Geographic feature ownership

## Entity Extraction Patterns

The ontology includes regex patterns for identifying geographic entities in text:

### City Names
```regex
\b([A-Z][a-zA-Z\s\-']{2,})\b
```
Matches capitalized city names with proper formatting.

### Country Names
```regex
\b([A-Z][a-zA-Z\s\-']{2,})\b
```
Matches capitalized country names.

### Feature Names
```regex
\b([A-Z][a-zA-Z\s\-']{2,})\b
```
Matches capitalized geographic feature names.

## Reasoning Algorithms

### City-Country Resolution
Disambiguates cities by country and region using codes and names.

- **Entity Type**: City
- **Factors**: name, countryCode, admin1Code
- **Weights**: [0.5, 0.3, 0.2]
- **Threshold**: 0.7
- **Relationship**: LOCATED_IN

### Nearby Places
Finds places within a certain distance of each other.

- **Entity Type**: Place
- **Factors**: latitude, longitude
- **Weights**: [0.5, 0.5]
- **Threshold**: 0.8
- **Relationship**: NEAR

## Usage

### 1. Data Transformation
Transform the raw GeoNames dataset into ontology-compatible JSON:

```bash
npx ts-node scripts/ontology/transform-geonames-data.ts
```

This downloads the cities1000.zip file, extracts cities1000.txt, and creates `ontologies/geonames/data/geonames_cities.json`.

### 2. Data Ingestion
Use the generic ingestion pipeline or the GeoNames-only ingestion script:

```bash
npx ts-node scripts/ontology/ingest-ontology-dataset.ts --ontology geonames --database jobboardkiller
```

### 3. Entity Extraction
The plugin automatically applies extraction patterns to identify cities, countries, and features in text content.

## Example Data

### Sample City Entity
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
  "admin1Code": "NY",
  "timezone": "America/New_York",
  "modificationDate": "2023-01-01",
  "entityType": "City"
}
```

### Sample Relationships
```cypher
// City located in state
(City {name: "New York City"})-[:LOCATED_IN]->(AdminRegion {name: "New York"})

// Cities near each other
(City {name: "New York City"})-[:NEAR {distanceKm: 35}]->(City {name: "Newark"})

// Country has features
(Country {name: "United States"})-[:HAS_FEATURE]->(Feature {name: "Rocky Mountains"})
```

## Statistics

- **Total Cities**: 159,045 (from cities1000 dataset)
- **Countries**: 195+ countries represented
- **Feature Classes**: A (country), P (city), S (spot), T (terrain), etc.
- **Data Coverage**: Global coverage with population > 1,000

### Top Cities by Population
1. **Shanghai, CN** (24,874,500)
2. **Beijing, CN** (18,960,744)
3. **Shenzhen, CN** (17,494,398)
4. **Guangzhou, CN** (16,096,724)
5. **Kinshasa, CD** (16,000,000)

## Testing

Run the comprehensive test suite:

```bash
# Plugin structure tests
npm test -- ontologies/geonames/__tests__/plugin-loading.test.ts

# Transformation tests
npm test -- scripts/ontology/__tests__/transform-geonames-data.test.ts
```

## Integration

The GeoNames ontology integrates with:

- **Generic Ingestion Pipeline**: Standard data ingestion
- **Entity Extraction System**: Automatic location recognition
- **Reasoning Engine**: Spatial and hierarchical reasoning
- **Chat System**: Location-based queries and responses
- **Enrichment Services**: Geographic data enrichment

## License

This ontology follows the same license terms as GeoNames (Creative Commons Attribution - CC-BY). When using this data, please credit GeoNames.org.

## Related Documentation

- [Ontology Plugin Architecture](../ontology-plugin-architecture.md)
- [Entity Extraction Guide](../entity-extraction-guide.md)
- [Generic Ingestion Pipeline](../../development/dataset-ingestion-guide.md)
- [Test-Driven Development](../../development/tdd-approach.md) 