/**
 * Interface pour les pipelines d'ingestion
 * Définit le contrat pour le traitement unifié des données
 */
export interface IngestionPipeline {
  readonly id: string;
  readonly type: string;
  
  process(source: DataSource): Promise<ProcessingResult>;
  monitor(): PipelineMetrics;
  stop(): Promise<void>;
}

export interface ProcessingResult {
  success: boolean;
  sourceId: string;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  entitiesCreated: number;
  relationshipsCreated: number;
  duration: number;
  errors: ProcessingError[];
  metadata: Record<string, any>;
}

export interface PipelineMetrics {
  totalProcessed: number;
  averageProcessingTime: number;
  successRate: number;
  lastRun: Date;
  status: 'running' | 'idle' | 'error';
}

export interface ProcessingError {
  item: string;
  error: string;
  timestamp: Date;
  recoverable: boolean;
}
