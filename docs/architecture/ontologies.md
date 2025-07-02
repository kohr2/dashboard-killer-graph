# Ontology & Extension Architecture

Plugin-based ontology system for domain-specific extensions.

## Overview

Each domain (CRM, Financial, etc.) is a self-contained extension that can be enabled/disabled independently.

## Architecture Components

### 1. Core Ontology (`core` plugin)

Fundamental, domain-agnostic entities:

- **Thing**: Most general entity type
- **UnrecognizedEntity**: Placeholder for unclassified entities
- **Communication**: Generic communication entity (emails, calls, meetings)

#### Communication Entity

Part of core ontology, agnostic of specific domains:

```json
{
  "Communication": {
    "parent": "Thing",
    "description": "Generic communication entity for emails, calls, meetings, etc.",
    "properties": {
      "id": "string",
      "type": "string", 
      "status": "string",
      "subject": "string",
      "body": "string",
      "sender": "string",
      "recipients": "array",
      "timestamp": "datetime",
      "metadata": "object"
    },
    "keyProperties": ["id", "type", "sender", "timestamp"],
    "vectorIndex": true
  }
}
```

**Relationships:**
- `CONTAINS_ENTITY`: Links communication to mentioned entities
- `PARTICIPANT_IN`: Links entities to communications they participated in
- `SENDER_OF`: Links sender entities to communications they sent
- `RECIPIENT_OF`: Links recipient entities to communications they received

### 2. Domain Extensions

Each extension provides:
- **Entity schemas**: Domain-specific entities (Contact, Deal, etc.)
- **Relationship schemas**: How entities relate to each other
- **Business logic**: Services, repositories, use cases
- **API endpoints**: REST endpoints for the domain

## Plugin Configuration

Configure in `config/ontology/plugins.config.ts`:

```typescript
export const ONTOLOGY_PLUGINS_CONFIG = {
  core: { 
    enabled: true, 
    plugin: corePlugin,
    description: 'Core ontology with fundamental entities like Communication'
  },
  crm: { 
    enabled: true, 
    plugin: crmPlugin,
    description: 'Customer Relationship Management ontology'
  },
  financial: { 
    enabled: true, 
    plugin: financialPlugin,
    description: 'Financial ontology with instruments and market data'
  },
  procurement: { 
    enabled: false, 
    plugin: procurementPlugin,
    description: 'Procurement ontology'
  }
};
```

## Creating a New Extension

### 1. Extension Structure

```
src/ontologies/your-domain/
├── your-domain.plugin.ts      # Ontology definition
├── domain/
│   ├── entities/              # Domain entities
│   ├── repositories/          # Data access
│   └── services/              # Business logic
├── application/
│   ├── services/              # Application services
│   └── use-cases/             # Business use cases
└── infrastructure/            # External integrations
```

### 2. Define Ontology Plugin

```typescript
export const yourDomainPlugin: OntologyPlugin = {
  name: 'your-domain',
  
  entitySchemas: {
    YourEntity: {
      description: 'Description of your entity',
      properties: {
        // Entity properties
      },
      keyProperties: ['id', 'name'],
      vectorIndex: true
    }
  },
  
  relationshipSchemas: {
    YOUR_RELATIONSHIP: {
      domain: 'YourEntity',
      range: 'OtherEntity',
      description: 'Description of the relationship'
    }
  }
};
```

### 3. Register Plugin

Add to `config/ontology/plugins.config.ts`:

```typescript
import { yourDomainPlugin } from '../../src/ontologies/your-domain/your-domain.plugin';

export const ONTOLOGY_PLUGINS_CONFIG = {
  // ... existing plugins
  'your-domain': { 
    enabled: true, 
    plugin: yourDomainPlugin,
    description: 'Your domain description'
  }
};
```

## Using Core Entities

When creating domain-specific entities that relate to core entities like `Communication`:

```typescript
relationshipSchemas: {
  PARTICIPANT_IN: {
    domain: 'YourEntity',
    range: 'Communication',  // Core entity
    description: 'Links your entity to communications'
  }
}
```

## Benefits

1. **Reusability**: Core entities like `Communication` can be used across all domains
2. **Consistency**: Standardized relationships and properties
3. **Modularity**: Domains can be enabled/disabled independently
4. **Extensibility**: Easy to add new domains without modifying existing code

## Loading Process

1. **Bootstrap**: `registerAllOntologies()` called at startup
2. **Plugin Discovery**: System reads `plugins.config.ts`
3. **Ontology Loading**: Enabled plugins loaded into `OntologyService`
4. **Validation**: Schemas validated against ontology structure
5. **Service Registration**: Domain services registered in DI container

## Testing

Each extension should include comprehensive tests:

```typescript
describe('YourDomain Extension', () => {
  it('should load ontology correctly', () => {
    // Test ontology loading
  });
  
  it('should register services', () => {
    // Test service registration
  });
});
```

## Best Practices

1. **Use Core Entities**: Leverage core entities like `Communication` instead of creating domain-specific versions
2. **Follow Naming Conventions**: Use consistent naming for entities and relationships
3. **Document Relationships**: Always provide clear descriptions for relationships
4. **Test Extensively**: Include unit and integration tests for your extension
5. **Keep Dependencies Minimal**: Avoid tight coupling between extensions 