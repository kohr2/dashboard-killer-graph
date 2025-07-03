# Ontology Plug-in Architecture

> Introduced in `v1.3.x` – replaces the previous "one-package-per-vertical" approach.

## Why a plug-in model ?

1. **Avoid code duplication**: the earlier CRM & Financial packages duplicated DDD layers (domain, application, infrastructure).  Now those layers live once in **Core**, while each vertical only contributes its ontology and optional providers.
2. **On-demand loading**: plug-ins can be discovered/registered at runtime, which opens the door for dynamic extension marketplaces.
3. **Test isolation**: a plug-in is a plain module exporting JSON schemas and DI providers – it can be unit-tested without spinning up the whole platform.

## Minimal contract (`OntologyPlugin`)
```ts
export interface OntologyPlugin {
  /** Unique identifier (e.g. "crm", "financial") */
  name: string;

  /** Entity schema fragments keyed by entity name */
  entitySchemas: Record<string, unknown>;

  /** Relationship schema fragments keyed by relationship name */
  relationshipSchemas?: Record<string, unknown>;

  /** Optional reasoning algorithms defined for this ontology */
  reasoning?: {
    algorithms: Record<string, {
      name: string;
      description: string;
      entityType: string;
      factors?: string[];
      weights?: number[];
      threshold?: number;
      relationshipType?: string;
      pattern?: string;
      patternName?: string;
    }>;
  };

  /** Optional entity extraction configuration for this ontology */
  entityExtraction?: Record<string, unknown>;

  /** Optional DI providers (services, repositories, etc.) */
  serviceProviders?: Record<string, unknown>;
}
```

Only `name` and `entitySchemas` are mandatory.  The JSON for each entity follows the same shape used in `ontology.json` (description, parent, properties, etc.).

## Example – CRM plug-in
```ts
// ontologies/crm/crm.plugin.ts
import { OntologyPlugin } from '@platform/ontology/ontology.plugin';
import { registerCrm } from './register';
import * as fs from 'fs';
import * as path from 'path';

// Load ontology data from JSON file
const ontologyPath = path.join(__dirname, 'ontology.json');
const ontologyData = JSON.parse(fs.readFileSync(ontologyPath, 'utf8'));

export const crmPlugin: OntologyPlugin = {
  name: 'crm',
  entitySchemas: ontologyData.entities,
  relationshipSchemas: ontologyData.relationships,
  reasoning: ontologyData.reasoning,
  entityExtraction: ontologyData.entityExtraction,
  serviceProviders: {
    register: registerCrm, // legacy DI setup
  },
};
```

The Financial and Procurement verticals follow the same pattern.
```

## Loading plug-ins
The platform uses a dynamic plugin registry that automatically discovers and loads plugins from the `ontologies/` directory.

### Plugin Registry
The `PluginRegistry` class in `config/ontology/plugins.config.ts` automatically:
1. Discovers all ontology directories
2. Loads plugin files (`*.plugin.ts`)
3. Enables plugins by default (core, crm, financial, procurement)
4. Provides plugin status and configuration management

### Plugin Discovery
```ts
// Plugins are automatically discovered from ontologies directory
const enabledPlugins = getEnabledPlugins();
const pluginSummary = getPluginSummary();

// Load plugins into ontology service
const ontologyService = OntologyService.getInstance();
ontologyService.loadFromPlugins(enabledPlugins);
```

`loadFromPlugins` merges all `entitySchemas` and `relationshipSchemas` into the internal aggregated schema and warns on duplicates.

## Adding a new vertical

### Manual Creation
1. Create `ontologies/<your-vertical>/` directory
2. Add an `ontology.json` with your entity and relationship schemas
3. Create `<vertical>.plugin.ts` that exports an `OntologyPlugin`
4. The plugin will be automatically discovered and enabled by default

### Automated Generation
Use the ontology generation script to automatically create plugins from ontology configurations:

```bash
# Generate ontology code including plugin file
npm run codegen:ontologies
```

This will:
1. Read ontology configuration files
2. Extract entities and relationships from OWL/RDF sources
3. Generate `ontology.json` with schemas
4. Generate `<vertical>.plugin.ts` using Handlebars templates
5. Register the plugin automatically

## How to create a new vertical

1. Create `ontologies/your-ontology-name/`
2. Add an `ontology.json` with your entity and relationship schemas
3. Add a `your-ontology-name.plugin.ts` that imports the JSON and exports an `OntologyPlugin`
4. The plugin will be automatically discovered by the plugin registry
5. Add a link to the new vertical in `docs/architecture/ontology-plugin-architecture.md` (this file)

## Available Plug-ins

*   [CRM](./ontologies/crm.md) - Customer Relationship Management entities and relationships
*   [Financial](./ontologies/financial.md) - Financial instruments, deals, and investment entities
*   [Procurement](./ontologies/procurement.md) - Public procurement procedures, contracts, and tenders

## Plugin Status

| Plugin | Status | Entities | Relationships | Auto-Discovery |
|--------|--------|----------|---------------|----------------|
| Core | ✅ Enabled | 3 | 0 | ✅ |
| CRM | ✅ Enabled | 15+ | 20+ | ✅ |
| Financial | ✅ Enabled | 25+ | 30+ | ✅ |
| Procurement | ✅ Enabled | 148 | 395 | ✅ |

## Next Steps / Roadmap
* **✅ Auto-registration** – Implemented: plugins are automatically discovered from `ontologies/` directory
* **ServiceProviders v2** – The DI container will consume `serviceProviders` directly, eliminating the legacy `registerX()` helpers
* **Marketplace** – Remote plug-ins signed and loaded at runtime
* **Plugin Configuration UI** – Web interface for enabling/disabling plugins and viewing plugin status 