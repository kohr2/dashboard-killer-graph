import { IEnrichmentService } from './i-enrichment-service.interface';
import { GenericEntity, EnrichmentResult } from './dto-aliases';
import { logger } from '@shared/utils/logger';

/**
 * BugBot Client Interface
 * Defines the contract for interacting with BugBot services
 */
export interface BugBotClient {
  analyze(errorData: BugBotAnalysisRequest): Promise<BugBotAnalysis>;
  generateReport(errorData: BugBotAnalysisRequest): Promise<BugBotReport>;
  suggestFix(errorData: BugBotAnalysisRequest): Promise<string[]>;
}

/**
 * BugBot Analysis Request
 * Data structure for requesting error analysis
 */
export interface BugBotAnalysisRequest {
  errorMessage: string;
  stackTrace: string;
  severity: string;
  context: {
    entityId: string;
    entityType: string;
    timestamp?: string;
    environment?: string;
  };
}

/**
 * BugBot Analysis Result
 * Result structure from BugBot analysis
 */
export interface BugBotAnalysis {
  rootCause: string;
  confidence: number;
  suggestions: string[];
  severity: string;
  category: string;
}

/**
 * BugBot Report
 * Comprehensive debug report structure
 */
export interface BugBotReport {
  summary: string;
  details: Array<{
    issue: string;
    impact: string;
    fix: string;
  }>;
  recommendations: string[];
  estimatedFixTime: string;
}

/**
 * BugBot Enrichment Service
 * 
 * This service integrates with BugBot to provide error analysis and debugging
 * capabilities for entities containing error information. It follows the
 * ontology-agnostic principles and can work with any entity type that contains
 * error-related properties.
 * 
 * The service automatically detects error information in entity properties and
 * provides:
 * - Root cause analysis
 * - Confidence scoring
 * - Fix suggestions
 * - Debug reports
 * - Severity assessment
 */
export class BugBotEnrichmentService implements IEnrichmentService {
  public readonly name = 'BugBot';

  constructor(private readonly bugBotClient: BugBotClient) {}

  /**
   * Enrich an entity with BugBot error analysis
   * 
   * @param entity The entity to enrich
   * @returns Enrichment result with BugBot analysis
   */
  async enrich(entity: GenericEntity): Promise<EnrichmentResult> {
    try {
      // Extract error information from entity
      const errorData = this.extractErrorData(entity);
      
      if (!errorData) {
        return {
          success: false,
          error: 'No error data found in entity'
        };
      }

      // Analyze the error using BugBot
      const analysis = await this.bugBotClient.analyze(errorData);

      return {
        success: true,
        data: {
          analysis,
          enrichedAt: new Date().toISOString(),
          service: this.name
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`BugBot enrichment failed for entity ${entity.id}:`, error);
      
      return {
        success: false,
        error: `BugBot analysis failed: ${errorMessage}`
      };
    }
  }

  /**
   * Generate a comprehensive debug report for an entity
   * 
   * @param entity The entity to generate a report for
   * @returns BugBot debug report
   */
  async generateDebugReport(entity: GenericEntity): Promise<BugBotReport> {
    const errorData = this.extractErrorData(entity);
    
    if (!errorData) {
      throw new Error('No error data found in entity');
    }

    return await this.bugBotClient.generateReport(errorData);
  }

  /**
   * Get fix suggestions for an entity
   * 
   * @param entity The entity to get suggestions for
   * @returns Array of fix suggestions
   */
  async suggestFix(entity: GenericEntity): Promise<string[]> {
    const errorData = this.extractErrorData(entity);
    
    if (!errorData) {
      throw new Error('No error data found in entity');
    }

    return await this.bugBotClient.suggestFix(errorData);
  }

  /**
   * Extract error information from entity properties
   * 
   * @param entity The entity to extract error data from
   * @returns BugBot analysis request or null if no error data found
   */
  private extractErrorData(entity: GenericEntity): BugBotAnalysisRequest | null {
    const properties = entity.properties || {};
    
    // Look for error-related properties
    const errorMessage = this.findErrorMessage(properties);
    const stackTrace = this.findStackTrace(properties);
    
    if (!errorMessage && !stackTrace) {
      return null;
    }

    // Determine severity
    const severity = this.determineSeverity(properties);
    
    // Build context
    const context = {
      entityId: entity.id,
      entityType: entity.type,
      timestamp: properties.timestamp || properties.createdAt,
      environment: properties.environment || properties.env
    };

    return {
      errorMessage: errorMessage || entity.name || entity.label,
      stackTrace: stackTrace || '',
      severity,
      context
    };
  }

  /**
   * Find error message in entity properties
   */
  private findErrorMessage(properties: Record<string, any>): string | null {
    return properties.errorMessage || 
           properties.message || 
           properties.error || 
           properties.err || 
           null;
  }

  /**
   * Find stack trace in entity properties
   */
  private findStackTrace(properties: Record<string, any>): string | null {
    return properties.stackTrace || 
           properties.stack || 
           properties.trace || 
           properties.details || 
           null;
  }

  /**
   * Determine error severity from properties
   */
  private determineSeverity(properties: Record<string, any>): string {
    const severity = properties.severity || 
                    properties.level || 
                    properties.priority;
    
    if (severity) {
      const lowerSeverity = severity.toLowerCase();
      
      if (lowerSeverity.includes('critical') || lowerSeverity.includes('fatal')) {
        return 'critical';
      }
      if (lowerSeverity.includes('error') || lowerSeverity.includes('high')) {
        return 'high';
      }
      if (lowerSeverity.includes('warning') || lowerSeverity.includes('medium')) {
        return 'medium';
      }
      if (lowerSeverity.includes('info') || lowerSeverity.includes('low')) {
        return 'low';
      }
    }
    
    // Default severity based on entity type
    if (properties.errorMessage || properties.stackTrace) {
      return 'medium';
    }
    
    return 'low';
  }
} 