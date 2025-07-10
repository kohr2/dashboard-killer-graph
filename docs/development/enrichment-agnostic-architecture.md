# Enrichment Config-Driven Architecture

## Overview

The enrichment system has been redesigned to be truly config-driven and enrichment-agnostic. This means:

1. **Config-Driven**: All enrichment services are created entirely from JSON configuration files
2. **Ontology Agnostic**: Enrichment services are determined by entity type and configuration rules, not ontology definitions
3. **Enrichment Agnostic**: The registration system doesn't hardcode specific enrichment services - they are created dynamically from config

## Architecture Components

### 1. Service Factory (`src/register-enrichments.ts`)

The `EnrichmentServiceFactory` provides a dynamic way to register and create enrichment services:

```typescript
// Register a service
registerEnrichmentService('myService', (config) => createServiceFromConfig(config));

// Create a service instance
const service = EnrichmentServiceFactory.createService('myService', config);
```

### 2. Config-Driven Service Creation (`src/register-enrichment-services.ts`)

This file reads from the JSON config file and creates services entirely from configuration:

```typescript
export function registerAvailableEnrichmentServices(): void {
  // Load configuration from JSON file
  const enrichmentConfig = loadEnrichmentConfig();
  
  // Create services entirely from config
  for (const serviceConfig of enrichmentConfig.services) {
    if (serviceConfig.enabled) {
      registerEnrichmentService(serviceConfig.name, (config: any) => {
        return createServiceFromConfig({
          ...serviceConfig,
          config: { ...serviceConfig.config, ...config }
        });
      });
    }
  }
}
```

### 3. Configuration (`config/enrichment.config.json`)

The configuration file defines which services to use and their settings, including enrichment logic:

```json
{
  "services": [
    {
      "name": "edgar",
      "type": "api",
      "enabled": true,
      "config": {
        "userAgent": "Dashboard Killer Graph Bot 1.0",
        "baseUrl": "https://api.sec.gov",
        "enrichmentLogic": {
          "type": "api_call",
          "endpoint": "/companies/{entityName}",
          "method": "GET",
          "headers": {
            "User-Agent": "{userAgent}",
            "Accept": "application/json"
          },
          "responseMapping": {
            "companyName": "name",
            "ticker": "ticker",
            "industry": "industry"
          }
        }
      }
    }
  ],
  "rules": [
    {
      "entityType": "Organization",
      "services": ["edgar", "openCorporates"],
      "priority": 1,
      "conditions": {
        "hasName": true
      }
    }
  ]
}
```

## Benefits

### 1. True Config-Driven Approach
- All enrichment services are created entirely from JSON configuration
- No hardcoded service constructors or implementations
- Services can be added, modified, or removed by changing config only

### 2. Extensibility
- Add new enrichment services without any code changes
- Services are created dynamically from configuration
- Enrichment logic can be defined declaratively in JSON

### 3. Configuration-Driven
- All enrichment behavior is controlled by JSON configuration
- No code changes needed to enable/disable services or change rules
- Enrichment logic is defined declaratively

### 4. Testability
- Easy to mock services for testing
- Clear separation between configuration and implementation
- Services can be tested with different configs

### 5. Maintainability
- Single source of truth for enrichment configuration
- Clear separation of concerns
- No hardcoded service dependencies

## Usage

### Adding a New Enrichment Service

1. **Configure the service** in `config/enrichment.config.json`:
```json
{
  "services": [
    {
      "name": "myService",
      "type": "api",
      "enabled": true,
      "config": {
        "baseUrl": "https://api.myservice.com",
        "apiKey": "your-api-key",
        "enrichmentLogic": {
          "type": "api_call",
          "endpoint": "/enrich/{entityName}",
          "method": "GET",
          "headers": {
            "Authorization": "Bearer {apiKey}"
          },
          "responseMapping": {
            "enrichedData": "data"
          }
        }
      }
    }
  ]
}
```

2. **The service is automatically created** from the configuration - no code changes needed!

### Testing

The system is designed to be easily testable:

```typescript
// Test with different configs
const mockConfig = {
  services: [
    {
      name: 'testService',
      type: 'api',
      enabled: true,
      config: {
        baseUrl: 'https://api.test.com',
        enrichmentLogic: {
          type: 'api_call',
          endpoint: '/test/{entityName}'
        }
      }
    }
  ]
};

// The service is created entirely from this config
const result = registerAllEnrichments();
expect(result).toBeInstanceOf(OntologyAgnosticEnrichmentService);
```

## Migration from Previous System

The previous system had hardcoded service references and constructors. The new system:

1. **Removes all hardcoded references** from registration code
2. **Creates services entirely from JSON config** 
3. **Uses declarative enrichment logic** defined in configuration
4. **Makes configuration the single source of truth**

This makes the system truly config-driven, flexible, maintainable, and agnostic to both ontologies and specific enrichment services. 