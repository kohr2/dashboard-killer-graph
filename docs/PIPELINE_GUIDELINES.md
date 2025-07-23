# Data-Ingestion / Knowledge-Graph Pipeline

Below is an end-to-end map of how an ontology-driven email is turned into labelled nodes and relationships inside Neo4j. Every step lists the **key code locations** that implement it so new contributors can jump straight to the right file.

Scripts should **never introduce new business logic**; they must only call the existing services exported by the codebase.

* Minimal orchestration belongs in `src/ingestion/**`.
* Application-level orchestration lives in `src/platform/processing/**`.
* CLI scripts must contain only a minimal wrapper around those services – no custom logic.

---

## Inputs
1. **Database credentials** – `.env` (`NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `NEO4J_DATABASE`)
2. **Ontology plugin(s)** – `ontologies/<name>/*.plugin.ts`  
   These export entity & relationship schemas consumed by `@platform/ontology`.
3. **Fixture limits** – optional CLI flags (e.g. `--count`) on scripts.

---

## Ontology Workflow
| # | Description | Main Code |
|---|-------------|-----------|
| 1 | **Load enabled ontology plugins** listed in `config/ontology/plugins.config.ts`. | `src/platform/ontology/ontology.service.ts` |
| 2 | **Validate & normalise** each plugin's schema (accepts string or object `description`, resolves inheritance, etc.). | same file – `loadFromPlugins()` |
| 3 | **Write normalised ontology** (JSON) for downstream services. | `scripts/ontology/build-ontology.ts` |
| 4 | **Expose helpers** to query entity/relationship lists, `vectorIndex` flags, etc. | `OntologyService` public API |

---

## Email-Fixture Workflow
| # | Description | Main Code |
|---|-------------|-----------|
| 1 | **Generate realistic RFC-2822 emails** that mention ontology entities. | `src/platform/fixtures/email-fixture-generation.service.ts` |
| 2 | (Optional) Uses OpenAI if `OPENAI_API_KEY` is present, otherwise falls back to templated text. | same service – `generateEmailWithLLM()` |
| 3 | **Persist `.eml` files** under `test/fixtures/<ontology>/emails/`. | same service – `generateEmailFixtures()` |

---

## Ingestion Workflow
| # | Description | Main Code |
|---|-------------|-----------|
| 1 | **Read fixture email** and push through a light wrapper pipeline. | `src/platform/processing/ontology-email-ingestion.service.ts` |
| 2 | **Parse content & extract entities/relationships** via the local NLP service. | `src/platform/processing/content-processing.service.ts`  → `POST /batch-extract-graph` |
| 3 | **Auto-enrich Organisations** (e.g. company look-ups) when enabled. | same service – enrichment block |
| 4 | **Generate embeddings** for each entity text. | same service – `/embed` call |
| 5 | **Store into Neo4j** with vector-search support and property handling. | `src/platform/processing/neo4j-ingestion.service.ts` |
| 6 | **Reason over the graph** (advanced use-cases). | `src/platform/processing/ontology-driven-advanced-graph.service.ts` & `src/platform/reasoning/*` |

CLI entry-points:
* `scripts/demo/email-ingestion.ts` – batch-ingest generated fixtures.
* `scripts/demo/ingest-ontology-email.ts <ontology>` – ingest fixtures for a single ontology.

---

## Validation
1. **Node / relationship counts** – integration tests under `src/**/__tests__/` (see `email-pipeline.test.ts`).
2. **Type safety** – `Neo4jIngestionService` cross-checks labels against `OntologyService`.
3. **Schema constraints & indexes** – created dynamically in `Neo4jConnection.initializeSchema()`.  Unique `id` constraints + vector indexes only for entities with `vectorIndex: true`.

---

## Gotchas & Tips
* If you only see `Thing` nodes, the raw LLM type didn't match an ontology entity; add a mapping in `ContentProcessingService.normaliseEntityType()` or extend the ontology.
* Always run `registerAllOntologies()` (done automatically in services/scripts) before any pipeline so helpers know what entities exist.
* To target a different Neo4j DB for experiments: `export NEO4J_DATABASE=my_test_db` before running the CLI. 