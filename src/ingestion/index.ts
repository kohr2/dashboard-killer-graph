/**
 * Point d'entrée principal pour la plateforme d'ingestion unifiée
 */

// Core types
export * from './types/data-source.interface';
export * from './types/normalized-data.interface';
export type { IngestionPipeline as IIngestionPipeline, ProcessingResult, PipelineMetrics, ProcessingError } from './types/pipeline.interface';

// Core components
export { IngestionPipeline } from './pipeline/ingestion-pipeline';

// Sources
export * from './sources/email-source';

// Intelligence
export type { EntityExtractor as IEntityExtractor, EntityExtraction } from './entity-extractor.interface';

// Fixtures
export * from './fixtures/email-fixture-generation.service';

// Ontology-specific ingestion services
export * from './ontology-dataset-ingestion.service';
export * from './ontology-email-ingestion.service';
