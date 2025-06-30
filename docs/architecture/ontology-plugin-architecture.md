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

  /** Optional DI providers (services, repositories, etc.) */
  serviceProviders?: Record<string, unknown>;
}
```

Only `name` and `entitySchemas` are mandatory.  The JSON for each entity follows the same shape used in `ontology.json` (description, parent, properties, etc.).

## Example – CRM plug-in
```ts
// src/ontologies/crm/crm.plugin.ts
import crmOntology from './ontology.json';
import { OntologyPlugin } from '@platform/ontology/ontology.plugin';
import { registerCrm } from './register';

export const crmPlugin: OntologyPlugin = {
  name: 'crm',
  entitySchemas: crmOntology.entities,
  serviceProviders: {
    register: registerCrm, // legacy DI setup
  },
};
```

The Financial vertical follows the same pattern (`financial.plugin.ts`).

## Loading plug-ins
The platform entry point calls `registerAllOntologies()`.
This now performs two tasks:
1. Executes existing `registerX()` functions (for DI wiring).
2. Resolves `OntologyService` from the DI container and calls `loadFromPlugins([...])`.

```ts
const ontologyService = container.resolve(OntologyService);
ontologyService.loadFromPlugins([crmPlugin, financialPlugin]);
```

`loadFromPlugins` merges all `entitySchemas` into the internal aggregated schema and warns on duplicates.

## Adding a new vertical
1. Place your ontology JSON under `src/ontologies/<your-vertical>/ontology.json`.
2. Create `<vertical>.plugin.ts` exporting an `OntologyPlugin`.
3. Import the plug-in in `register-ontologies.ts` and add it to the array.
4. (Optional) Provide DI registration via `serviceProviders.register()`.

## How to create a new vertical

1.  Create `src/ontologies/your-ontology-name/`
2.  Add an `ontology.json` with your entity schemas.
3.  Add a `your-ontology-name.plugin.ts` that imports the JSON and exports an `OntologyPlugin`.
4.  Add a link to the new vertical in `docs/architecture/ontology-plugin-architecture.md` (this file).
5.  Load the plugin in `register-ontologies.ts`.

## Available Plug-ins

*   [CRM](./ontologies/crm.md)
*   [Financial](./ontologies/financial.md)
*   [Procurement](./ontologies/procurement.md)

## Next Steps / Roadmap
* **Auto-registration** – next step is to scan a directory (or NPM workspace) for `*.plugin.ts` files automatically.
* **ServiceProviders v2** – the DI container will consume `serviceProviders` directly, eliminating the legacy `registerX()` helpers.
* **Marketplace** – remote plug-ins signed and loaded at runtime. 