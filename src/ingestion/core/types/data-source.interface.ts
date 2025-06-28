/**
 * Interface commune pour toutes les sources de données
 * Permet l'unification des différents types de sources
 */
export interface DataSource<T = any> {
  readonly id: string;
  readonly type: SourceType;
  readonly config: SourceConfig;
  
  connect(): Promise<void>;
  fetch(params?: FetchParams): AsyncIterable<T>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<HealthStatus>;
}

export enum SourceType {
  EMAIL = 'email',
  DOCUMENT = 'document',
  API = 'api',
  DATABASE = 'database'
}

export interface SourceConfig {
  name: string;
  enabled: boolean;
  batchSize?: number;
  retryAttempts?: number;
  timeout?: number;
  [key: string]: any;
}

export interface FetchParams {
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  message?: string;
  metrics?: Record<string, number>;
}
