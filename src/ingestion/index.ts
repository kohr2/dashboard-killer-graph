/**
 * Point d'entrée principal pour la plateforme d'ingestion unifiée
 */

// Core types
export * from './core/types/data-source.interface';
export * from './core/types/pipeline.interface';
export * from './core/types/normalized-data.interface';

// Core components
export * from './core/pipeline/ingestion-pipeline';

// Sources
export * from './sources/email/email-source';

// Intelligence
export * from './intelligence/nlp/entity-extractor';

// TODO: Export other components as they are implemented
