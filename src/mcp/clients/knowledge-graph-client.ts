import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface HealthResponse {
  status: string;
  server: string;
  version: string;
  database: string;
  activeOntologies: string[];
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export interface ToolsResponse {
  tools: Tool[];
}

export interface QueryResponse {
  content: string;
  query: string;
  timestamp: string;
}

export interface CallResponse {
  tool: string;
  result: any;
  timestamp: string;
}

export interface NLPResponse {
  operation: string;
  result: any;
  ontology_used: string;
  timestamp: string;
}

export interface KnowledgeGraphClientConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  apiKey?: string;
}

export class KnowledgeGraphClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'KnowledgeGraphClientError';
  }
}

export class KnowledgeGraphClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private timeout: number;
  private retries: number;

  constructor(config: KnowledgeGraphClientConfig = {}) {
    this.baseUrl = (config.baseUrl || 'http://localhost:3002').replace(/\/$/, '');
    this.timeout = config.timeout || 300000; // 5 minutes
    this.retries = config.retries || 3;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'KnowledgeGraph-Client/1.0',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
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
          const errorDetail = error.response.data?.error || error.response.data || 'Unknown error';
          
          throw new KnowledgeGraphClientError(
            `HTTP ${statusCode}: ${errorDetail}`,
            statusCode,
            error.response.data
          );
        }

        if (attempt === this.retries) {
          throw new KnowledgeGraphClientError(
            `Request failed after ${this.retries} retries: ${error.message}`
          );
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw lastError!;
  }

  /**
   * Check if the server is healthy
   */
  async healthCheck(): Promise<HealthResponse> {
    return this.makeRequest<HealthResponse>('GET', '/health');
  }

  /**
   * Get available tools and their schemas
   */
  async getTools(): Promise<ToolsResponse> {
    return this.makeRequest<ToolsResponse>('GET', '/tools');
  }

  /**
   * Query the knowledge graph using natural language
   */
  async queryKnowledgeGraph(query: string): Promise<QueryResponse> {
    const payload = {
      tool: 'query_knowledge_graph',
      arguments: { query }
    };
    const response = await this.makeRequest<CallResponse>('POST', '/call', payload);
    return {
      content: response.result.content,
      query: response.result.query,
      timestamp: response.timestamp
    };
  }

  /**
   * Simple query endpoint (alternative to queryKnowledgeGraph)
   */
  async query(query: string): Promise<QueryResponse> {
    return this.makeRequest<QueryResponse>('GET', `/query?q=${encodeURIComponent(query)}`);
  }

  /**
   * Extract entities from text
   */
  async extractEntities(
    text: string, 
    ontologyName: string = 'default'
  ): Promise<any> {
    const payload = {
      tool: 'nlp_processing',
      arguments: {
        operation: 'extract_entities',
        text,
        ontology_name: ontologyName
      }
    };
    const response = await this.makeRequest<CallResponse>('POST', '/call', payload);
    return response.result;
  }

  /**
   * Extract and refine entities using LLM
   */
  async refineEntities(
    text: string, 
    ontologyName: string = 'default'
  ): Promise<any> {
    const payload = {
      tool: 'nlp_processing',
      arguments: {
        operation: 'refine_entities',
        text,
        ontology_name: ontologyName
      }
    };
    const response = await this.makeRequest<CallResponse>('POST', '/call', payload);
    return response.result;
  }

  /**
   * Extract knowledge graph from text
   */
  async extractGraph(
    text: string, 
    ontologyName: string = 'default'
  ): Promise<any> {
    const payload = {
      tool: 'nlp_processing',
      arguments: {
        operation: 'extract_graph',
        text,
        ontology_name: ontologyName
      }
    };
    const response = await this.makeRequest<CallResponse>('POST', '/call', payload);
    return response.result;
  }

  /**
   * Batch extract knowledge graphs from multiple texts
   */
  async batchExtractGraph(
    texts: string[], 
    ontologyName: string = 'default'
  ): Promise<any> {
    const payload = {
      tool: 'nlp_processing',
      arguments: {
        operation: 'batch_extract_graph',
        texts,
        ontology_name: ontologyName
      }
    };
    const response = await this.makeRequest<CallResponse>('POST', '/call', payload);
    return response.result;
  }

  /**
   * Generate embeddings for texts
   */
  async generateEmbeddings(texts: string[]): Promise<any> {
    const payload = {
      tool: 'nlp_processing',
      arguments: {
        operation: 'generate_embeddings',
        texts
      }
    };
    const response = await this.makeRequest<CallResponse>('POST', '/call', payload);
    return response.result;
  }

  /**
   * Call any tool with custom arguments
   */
  async callTool(tool: string, args: any): Promise<CallResponse> {
    const payload = { tool, arguments: args };
    return this.makeRequest<CallResponse>('POST', '/call', payload);
  }

  /**
   * Process text with NLP operations (alternative endpoint)
   */
  async processNLP(
    operation: string,
    options: {
      text?: string;
      texts?: string[];
      ontology_name?: string;
    }
  ): Promise<NLPResponse> {
    const payload = { operation, ...options };
    return this.makeRequest<NLPResponse>('POST', '/nlp', payload);
  }

  /**
   * Get server information
   */
  async getServerInfo(): Promise<any> {
    return this.makeRequest('GET', '/');
  }
}

// Export default instance
export default KnowledgeGraphClient; 