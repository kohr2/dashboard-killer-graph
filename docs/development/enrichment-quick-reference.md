# Enrichment System Quick Reference

## Overview

The enrichment system is **config-driven** and **enrichment-agnostic**. All services are created from JSON configuration - no code changes needed!

## Quick Start

### 1. Enable/Disable Services

Edit `config/enrichment.config.json`:

```json
{
  "services": [
    {
      "name": "edgar",
      "enabled": true,  // Set to false to disable
      "config": {
        "baseUrl": "https://api.sec.gov"
      }
    }
  ]
}
```

### 2. Add New Service

```json
{
  "services": [
    {
      "name": "myService",
      "type": "api",
      "enabled": true,
      "config": {
        "baseUrl": "https://api.myservice.com",
        "apiKey": "your-key",
        "enrichmentLogic": {
          "type": "api_call",
          "endpoint": "/enrich/{entityName}",
          "method": "GET"
        }
      }
    }
  ]
}
```

### 3. Configure Enrichment Rules

```json
{
  "rules": [
    {
      "entityType": "Organization",
      "enrichmentService": "edgar",
      "priority": 1,
      "enabled": true,
      "conditions": {
        "hasName": true,
        "minNameLength": 2
      }
    }
  ]
}
```

## Configuration Schema

### Service Config
```typescript
{
  name: string;           // Service identifier
  type: string;           // "api", "database", etc.
  enabled: boolean;       // Active state
  config: {               // Service settings
    baseUrl?: string;     // API base URL
    apiKey?: string;      // Authentication
    enrichmentLogic?: {   // Enrichment behavior
      type: string;       // "api_call", etc.
      endpoint?: string;  // API endpoint
      method?: string;    // HTTP method
      headers?: object;   // Request headers
      responseMapping?: object; // Response mapping
    };
  };
  timeout?: number;       // Request timeout
  retries?: number;       // Retry attempts
}
```

### Rule Config
```typescript
{
  entityType: string;     // Entity type to match
  enrichmentService: string; // Service to use
  priority: number;       // Lower = higher priority
  enabled: boolean;       // Rule active state
  conditions: {           // When to apply
    hasName?: boolean;    // Must have name
    minNameLength?: number; // Min name length
  };
}
```

## Common Patterns

### API Service
```json
{
  "name": "apiService",
  "type": "api",
  "enabled": true,
  "config": {
    "baseUrl": "https://api.example.com",
    "apiKey": "your-api-key",
    "enrichmentLogic": {
      "type": "api_call",
      "endpoint": "/v1/entities/{entityName}",
      "method": "GET",
      "headers": {
        "Authorization": "Bearer {apiKey}",
        "Accept": "application/json"
      },
      "responseMapping": {
        "name": "entity.name",
        "type": "entity.type",
        "metadata": "entity.metadata"
      }
    }
  }
}
```

### Database Service
```json
{
  "name": "dbService",
  "type": "database",
  "enabled": true,
  "config": {
    "connectionString": "postgresql://...",
    "enrichmentLogic": {
      "type": "query",
      "sql": "SELECT * FROM entities WHERE name = '{entityName}'",
      "responseMapping": {
        "id": "entity_id",
        "name": "entity_name"
      }
    }
  }
}
```

## Testing

### Mock Configuration
```typescript
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
  ],
  rules: [
    {
      entityType: 'TestEntity',
      enrichmentService: 'testService',
      priority: 1,
      enabled: true,
      conditions: { hasName: true }
    }
  ]
};
```

## Troubleshooting

### Common Issues

1. **Service not found**: Check `enabled: true` in config
2. **API errors**: Verify `baseUrl` and `apiKey` settings
3. **Rules not applying**: Check `entityType` and `conditions`
4. **Timeout issues**: Increase `timeout` value

### Debug Logging

Enable debug logging in config:
```json
{
  "global": {
    "enableLogging": true
  }
}
```

## File Locations

- **Config**: `config/enrichment.config.json`
- **Registration**: `src/register-enrichments.ts`
- **Service Creation**: `src/register-enrichment-services.ts`
- **Core Service**: `src/platform/enrichment/ontology-agnostic-enrichment.service.ts`
- **Tests**: `src/__tests__/enrichment-config-driven.test.ts`

## Key Benefits

✅ **Zero Code Changes** - Add services via config only  
✅ **Declarative Logic** - Enrichment behavior in JSON  
✅ **Fully Agnostic** - No hardcoded service dependencies  
✅ **Easy Testing** - Mock with different configs  
✅ **Maintainable** - Single source of truth  

## Next Steps

- Read **[Full Architecture Documentation](enrichment-agnostic-architecture.md)**
- Check **[System Status](../development/system-status.md)**
- Review **[Test Examples](../src/__tests__/enrichment-config-driven.test.ts)** 