// This is a single-file pipeline to avoid import issues.
// In a real application, this would be split into multiple files and modules.

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { readFileSync, writeFileSync } from 'fs';

// ------------------- SpacyEntityExtractionService -------------------
// (Full content of spacy-entity-extraction.service.ts)
// ...

// ------------------- EntityResolutionService -------------------
// (Full content of entity-resolution.service.ts)
// ...

// ------------------- RelationshipExtractionService -------------------
// (Full content of relationship-extraction.service.ts)
// ...

// ------------------- HybridDealExtractionService -------------------
// (Full content of hybrid-deal-extraction.service.ts)
// ...

// ------------------- FinancialEntityIntegrationService -------------------
// (Full content of financial-entity-integration.service.ts)
// ...

// ------------------- OrchestrationService -------------------
// (Full content of orchestration.service.ts, adapted for single file)
// ...

// ------------------- Demo -------------------
// (Full content of demo-orchestration.ts, adapted for single file)
// ...