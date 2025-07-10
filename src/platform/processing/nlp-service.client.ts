import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface Entity {
  type: string;
  value: string;
  confidence?: number;
  properties?: Record<string, any>;
  start?: number;
  end?: number;
  spacy_label?: string;
  context?: string;
}

export interface Relationship {
  source: string;
  target: string;
  type: string;
  confidence?: number;
  explanation?: string;
}

export interface GraphResponse {
  entities: Entity[];
  relationships: Relationship[];
  refinement_info: string;
  embedding?: number[];
  ontology_used?: string;
}

export interface RefinedExtractionResponse {
  raw_entities: Entity[];
  refined_entities: Entity[];
  refinement_info: string;
  ontology_used?: string;
}

export interface OntologyInfo {
  available_ontologies: string[];
  default_ontology: string;
  ontology_details: Record<string, any>;
}

export class NLPServiceError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'NLPServiceError';
  }
}

export class NLPServiceClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private timeout: number;
  private retries: number;

  constructor(
    baseUrl: string = 'http://localhost:8000',
    timeout: number = 300000, // 5 minutes
    retries: number = 3
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeout = timeout;
    this.retries = retries;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NLP-Service-Client/1.0'
      }
    });
  }

  private async makeRequest<T>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const response: AxiosResponse<T> = await this.client.request({
          method,
          url: endpoint,
          data,
        });

        return response.data;
      } catch (error: any) {
        lastError = error;

        if (error.response) {
          const statusCode = error.response.status;
          const errorDetail = error.response.data?.detail || error.response.data || 'Unknown error';
          
          throw new NLPServiceError(
            `HTTP ${statusCode}: ${errorDetail}`,
            statusCode
          );
        }

        if (attempt === this.retries) {
          throw new NLPServiceError(
            `Request failed after ${this.retries} retries: ${error.message}`
          );
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw lastError!;
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.makeRequest('GET', '/health');
  }

  async getAvailableOntologies(): Promise<OntologyInfo> {
    return this.makeRequest('GET', '/ontologies');
  }

  async extractEntities(text: string, ontologyName?: string): Promise<Entity[]> {
    const payload: any = { text };
    if (ontologyName) {
      payload.ontology_name = ontologyName;
    }

    return this.makeRequest('POST', '/extract-entities', payload);
  }

  async refineEntities(text: string, ontologyName?: string): Promise<RefinedExtractionResponse> {
    const payload: any = { text };
    if (ontologyName) {
      payload.ontology_name = ontologyName;
    }

    return this.makeRequest('POST', '/refine-entities', payload);
  }

  async extractGraph(text: string, ontologyName?: string): Promise<GraphResponse> {
    const payload: any = { text };
    if (ontologyName) {
      payload.ontology_name = ontologyName;
    }

    return this.makeRequest('POST', '/extract-graph', payload);
  }

  async batchExtractGraph(texts: string[], ontologyName?: string): Promise<GraphResponse[]> {
    const payload: any = { texts };
    if (ontologyName) {
      payload.ontology_name = ontologyName;
    }

    return this.makeRequest('POST', '/batch-extract-graph', payload);
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await this.makeRequest<{ embeddings: number[][] }>('POST', '/embed', { texts });
    return response.embeddings;
  }
} 