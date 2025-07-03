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
export * from './entity-extractor';
export type { EntityExtractor as IEntityExtractor, EntityExtraction } from './entity-extractor.interface';
