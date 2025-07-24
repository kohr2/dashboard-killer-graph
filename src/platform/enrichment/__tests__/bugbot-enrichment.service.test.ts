import { BugBotEnrichmentService } from '../bugbot-enrichment.service';
import { GenericEntity, EnrichmentResult } from '../dto-aliases';
import { logger } from '@shared/utils/logger';

// Mock logger
jest.mock('@shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('BugBotEnrichmentService', () => {
  let service: BugBotEnrichmentService;
  let mockBugBotClient: any;

  beforeEach(() => {
    // Mock BugBot client
    mockBugBotClient = {
      analyze: jest.fn(),
      generateReport: jest.fn(),
      suggestFix: jest.fn()
    };

    service = new BugBotEnrichmentService(mockBugBotClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('service properties', () => {
    it('should have the correct service name', () => {
      expect(service.name).toBe('BugBot');
    });
  });

  describe('enrich', () => {
    it('should analyze errors in entity data and return enrichment result', async () => {
      // Arrange
      const entity: GenericEntity = {
        id: 'test-entity-1',
        type: 'Error',
        label: 'Database Connection Error',
        name: 'Database Connection Error',
        properties: {
          errorMessage: 'Connection timeout after 30 seconds',
          stackTrace: 'Error: Connection timeout\n    at Database.connect()',
          timestamp: '2024-01-15T10:30:00Z',
          severity: 'high'
        }
      };

      const mockAnalysis = {
        rootCause: 'Network connectivity issues',
        confidence: 0.85,
        suggestions: ['Check network connection', 'Increase timeout value'],
        severity: 'high',
        category: 'infrastructure'
      };

      mockBugBotClient.analyze.mockResolvedValue(mockAnalysis);

      // Act
      const result: EnrichmentResult = await service.enrich(entity);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        analysis: mockAnalysis,
        enrichedAt: expect.any(String),
        service: 'BugBot'
      });

      expect(mockBugBotClient.analyze).toHaveBeenCalledWith({
        errorMessage: 'Connection timeout after 30 seconds',
        stackTrace: 'Error: Connection timeout\n    at Database.connect()',
        severity: 'high',
        context: {
          entityId: 'test-entity-1',
          entityType: 'Error',
          timestamp: '2024-01-15T10:30:00Z'
        }
      });
    });

    it('should handle entities without error properties gracefully', async () => {
      // Arrange
      const entity: GenericEntity = {
        id: 'test-entity-2',
        type: 'Organization',
        label: 'Test Company',
        name: 'Test Company',
        properties: {
          industry: 'Technology',
          employees: 100
        }
      };

      // Act
      const result: EnrichmentResult = await service.enrich(entity);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No error data found in entity');
      expect(mockBugBotClient.analyze).not.toHaveBeenCalled();
    });

    it('should handle BugBot client errors gracefully', async () => {
      // Arrange
      const entity: GenericEntity = {
        id: 'test-entity-3',
        type: 'Error',
        label: 'API Error',
        name: 'API Error',
        properties: {
          errorMessage: 'Internal server error',
          stackTrace: 'Error: 500 Internal Server Error'
        }
      };

      const clientError = new Error('BugBot service unavailable');
      mockBugBotClient.analyze.mockRejectedValue(clientError);

      // Act
      const result: EnrichmentResult = await service.enrich(entity);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('BugBot analysis failed: BugBot service unavailable');
      expect(logger.error).toHaveBeenCalledWith(
        'BugBot enrichment failed for entity test-entity-3:',
        clientError
      );
    });

    it('should extract error information from various entity types', async () => {
      // Arrange
      const entity: GenericEntity = {
        id: 'test-entity-4',
        type: 'LogEntry',
        label: 'Application Log',
        name: 'Application Log',
        properties: {
          level: 'ERROR',
          message: 'Failed to process request',
          details: 'NullPointerException in UserService',
          timestamp: '2024-01-15T11:00:00Z'
        }
      };

      const mockAnalysis = {
        rootCause: 'Null pointer dereference',
        confidence: 0.92,
        suggestions: ['Add null checks', 'Use Optional wrapper'],
        severity: 'critical',
        category: 'code-quality'
      };

      mockBugBotClient.analyze.mockResolvedValue(mockAnalysis);

      // Act
      const result: EnrichmentResult = await service.enrich(entity);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.analysis).toEqual(mockAnalysis);

      expect(mockBugBotClient.analyze).toHaveBeenCalledWith({
        errorMessage: 'Failed to process request',
        stackTrace: 'NullPointerException in UserService',
        severity: 'high',
        context: {
          entityId: 'test-entity-4',
          entityType: 'LogEntry',
          timestamp: '2024-01-15T11:00:00Z'
        }
      });
    });

    it('should handle missing error message but present stack trace', async () => {
      // Arrange
      const entity: GenericEntity = {
        id: 'test-entity-5',
        type: 'Exception',
        label: 'Runtime Exception',
        name: 'Runtime Exception',
        properties: {
          stackTrace: 'java.lang.RuntimeException: Something went wrong\n    at Main.main()',
          timestamp: '2024-01-15T12:00:00Z'
        }
      };

      const mockAnalysis = {
        rootCause: 'Runtime exception in main method',
        confidence: 0.78,
        suggestions: ['Add exception handling', 'Check input validation'],
        severity: 'medium',
        category: 'runtime'
      };

      mockBugBotClient.analyze.mockResolvedValue(mockAnalysis);

      // Act
      const result: EnrichmentResult = await service.enrich(entity);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.analysis).toEqual(mockAnalysis);

      expect(mockBugBotClient.analyze).toHaveBeenCalledWith({
        errorMessage: 'Runtime Exception',
        stackTrace: 'java.lang.RuntimeException: Something went wrong\n    at Main.main()',
        severity: 'medium',
        context: {
          entityId: 'test-entity-5',
          entityType: 'Exception',
          timestamp: '2024-01-15T12:00:00Z'
        }
      });
    });
  });

  describe('generateDebugReport', () => {
    it('should generate a comprehensive debug report', async () => {
      // Arrange
      const entity: GenericEntity = {
        id: 'test-entity-6',
        type: 'Error',
        label: 'Complex Error',
        name: 'Complex Error',
        properties: {
          errorMessage: 'Multiple issues detected',
          stackTrace: 'Error: Issue 1\nError: Issue 2',
          severity: 'high',
          environment: 'production'
        }
      };

      const mockReport = {
        summary: 'Multiple critical issues detected',
        details: [
          { issue: 'Issue 1', impact: 'high', fix: 'Fix 1' },
          { issue: 'Issue 2', impact: 'medium', fix: 'Fix 2' }
        ],
        recommendations: ['Deploy hotfix', 'Update monitoring'],
        estimatedFixTime: '2 hours'
      };

      mockBugBotClient.generateReport.mockResolvedValue(mockReport);

      // Act
      const report = await service.generateDebugReport(entity);

      // Assert
      expect(report).toEqual(mockReport);
      expect(mockBugBotClient.generateReport).toHaveBeenCalledWith({
        errorMessage: 'Multiple issues detected',
        stackTrace: 'Error: Issue 1\nError: Issue 2',
        severity: 'high',
        context: {
          entityId: 'test-entity-6',
          entityType: 'Error',
          environment: 'production'
        }
      });
    });
  });

  describe('suggestFix', () => {
    it('should suggest fixes for error entities', async () => {
      // Arrange
      const entity: GenericEntity = {
        id: 'test-entity-7',
        type: 'Bug',
        label: 'Memory Leak',
        name: 'Memory Leak',
        properties: {
          errorMessage: 'OutOfMemoryError',
          stackTrace: 'java.lang.OutOfMemoryError: Java heap space',
          severity: 'critical'
        }
      };

      const mockSuggestions = [
        'Increase heap size',
        'Add memory monitoring',
        'Review object lifecycle management'
      ];

      mockBugBotClient.suggestFix.mockResolvedValue(mockSuggestions);

      // Act
      const suggestions = await service.suggestFix(entity);

      // Assert
      expect(suggestions).toEqual(mockSuggestions);
      expect(mockBugBotClient.suggestFix).toHaveBeenCalledWith({
        errorMessage: 'OutOfMemoryError',
        stackTrace: 'java.lang.OutOfMemoryError: Java heap space',
        severity: 'critical',
        context: {
          entityId: 'test-entity-7',
          entityType: 'Bug'
        }
      });
    });
  });
}); 