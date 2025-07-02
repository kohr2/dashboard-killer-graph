# Platform Processing Architecture

This document describes the centralized processing architecture implemented in the `src/platform/processing/` module.

## Overview

The platform processing module provides a centralized, reusable set of services for data processing, content analysis, and knowledge graph operations. This architecture promotes code reuse, maintainability, and consistent processing patterns across the application.

## Architecture Principles

### 1. Centralization
All processing logic is centralized in the platform module, eliminating duplication and ensuring consistent behavior.

### 2. Separation of Concerns
Each service has a single, well-defined responsibility:
- **Email Parsing**: Extract structured data from emails
- **Attachment Processing**: Handle various file formats
- **Neo4j Ingestion**: Manage database operations
- **Content Processing**: Analyze and enrich content
- **Enrichment Utils**: Data transformation utilities

### 3. Dependency Injection
Services use dependency injection for loose coupling and testability.

### 4. Error Handling
Comprehensive error handling with detailed logging and recovery mechanisms.

## Service Architecture

```
src/platform/processing/
├── email-parsing.service.ts          # Email parsing and content extraction
├── attachment-processing.service.ts   # Attachment processing and text extraction
├── neo4j-ingestion.service.ts        # Neo4j database operations
├── content-processing.service.ts      # Content analysis and enrichment
└── utils/
    └── enrichment.utils.ts           # Data enrichment utilities
```

## Core Services

### EmailParsingService

**Location**: `src/platform/processing/email-parsing.service.ts`

**Purpose**: Parse email files (.eml) and extract structured data.

**Key Features**:
- Parse .eml files using mailparser library
- Extract email metadata (from, to, cc, bcc, subject, date)
- Parse email headers
- Extract attachments with metadata
- Convert email content to structured format

**Main Methods**:
```typescript
async parseEmlFile(emlFilePath: string): Promise<ParsedEmailData>
async parseEmailContent(emlContent: string): Promise<ParsedEmailData>
extractTextContent(parsedEmail: ParsedEmailData): string
```

**Interfaces**:
```typescript
interface ParsedEmailData {
  messageId: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  date: Date;
  headers: Record<string, string>;
  attachments: EmailAttachment[];
}

interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
}
```

### AttachmentProcessingService

**Location**: `src/platform/processing/attachment-processing.service.ts`

**Purpose**: Process email attachments to extract text content and identify entities.

**Supported File Types**:
- **PDF Documents**: `application/pdf`
- **Microsoft Word**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/msword`
- **Microsoft Excel**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel`
- **Microsoft PowerPoint**: `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `application/vnd.ms-powerpoint`
- **Images**: `image/png`, `image/jpeg`, `image/jpg`, `image/gif`
- **Plain Text**: `text/plain`

**Processing Methods**:
- **PDF_TEXT_EXTRACTION**: Uses officeparser for PDF text extraction
- **DOCX_TEXT_EXTRACTION**: Uses officeparser for Word document extraction
- **Excel**: Uses node-xlsx for spreadsheet data extraction
- **PowerPoint**: Uses officeparser for presentation content extraction
- **OCR**: Placeholder for image text extraction (not yet implemented)
- **SKIP**: For unsupported file types

**Main Methods**:
```typescript
async processAttachments(attachments: EmailAttachment[]): Promise<AttachmentProcessingResult>
async extractTextFromPdf(pdfBuffer: Buffer): Promise<string>
async extractTextFromDocx(docxBuffer: Buffer): Promise<string>
async extractTextFromExcel(excelBuffer: Buffer): Promise<string>
async extractTextFromPowerPoint(pptBuffer: Buffer): Promise<string>
isSupportedFileType(contentType: string): boolean
```

**Interfaces**:
```typescript
interface ProcessedAttachment {
  filename: string;
  contentType: string;
  size: number;
  supportedFormat: boolean;
  processingMethod?: 'PDF_TEXT_EXTRACTION' | 'DOCX_TEXT_EXTRACTION' | 'Excel' | 'PowerPoint' | 'OCR' | 'SKIP';
  extractedText?: string;
  entities?: ExtractedEntity[];
  error?: string;
  skipReason?: string;
  processingDuration: number;
}

interface AttachmentProcessingResult {
  success: boolean;
  totalProcessed: number;
  supportedFormats: number;
  unsupportedFormats: number;
  processedAttachments: ProcessedAttachment[];
  extractedEntities: ExtractedEntity[];
  errors: AttachmentProcessingError[];
  totalProcessingTime: number;
}

interface ExtractedEntity {
  id: string;
  name: string;
  type: string;
  confidence: number;
  source: string;
  properties?: Record<string, any>;
}
```

### Neo4jIngestionService

**Location**: `src/platform/processing/neo4j-ingestion.service.ts`

**Purpose**: Handle all Neo4j database operations including node creation, relationship management, and vector search.

**Key Features**:
- Create nodes with properties and labels
- Create relationships between nodes
- Handle vector embeddings for similarity search
- Flatten and merge enriched data
- Manage transaction rollbacks

**Main Methods**:
```typescript
async createNode(label: string, properties: Record<string, any>): Promise<string>
async createRelationship(fromId: string, toId: string, type: string, properties?: Record<string, any>): Promise<void>
async upsertNode(label: string, properties: Record<string, any>, uniqueProperty: string): Promise<string>
async searchSimilarNodes(label: string, vector: number[], limit: number): Promise<any[]>
```

### ContentProcessingService

**Location**: `src/platform/processing/content-processing.service.ts`

**Purpose**: Provide content analysis and enrichment capabilities.

**Key Features**:
- Content normalization
- Entity extraction coordination
- Content enrichment processing

**Main Methods**:
```typescript
async processContent(content: string, contentType: string): Promise<ProcessedContent>
async extractEntities(content: string): Promise<ExtractedEntity[]>
async enrichContent(content: string): Promise<EnrichedContent>
```

### Enrichment Utils

**Location**: `src/platform/processing/utils/enrichment.utils.ts`

**Purpose**: Provide utilities for data enrichment and flattening.

**Key Functions**:
```typescript
function flattenEnrichmentData(enrichedData: any): Record<string, any>
function mergeEnrichedData(existingProps: Record<string, any>, enrichedData: any): Record<string, any>
```

## Integration Patterns

### Service Composition

Services are designed to work together through composition:

```typescript
// Email processing with attachments
const emailProcessor = new EmailProcessor(
  emailParsingService,
  attachmentProcessingService
);

const result = await emailProcessor.processEmlFileWithAttachments('/path/to/email.eml');
```

### Dependency Injection

Services use dependency injection for loose coupling:

```typescript
@singleton()
export class EmailProcessor {
  constructor(
    private emailParsingService: EmailParsingService,
    private attachmentProcessingService: AttachmentProcessingService,
  ) {}
}
```

### Error Handling

Comprehensive error handling with detailed logging:

```typescript
try {
  const result = await attachmentProcessingService.processAttachments(attachments);
  // Process successful result
} catch (error) {
  logger.error('Attachment processing failed:', error);
  // Handle error appropriately
}
```

## Testing Strategy

### Unit Tests

Each service has comprehensive unit tests located in corresponding `__tests__/` directories:

- `src/platform/processing/utils/__tests__/enrichment.utils.test.ts`
- `src/ingestion/sources/email/processors/__tests__/attachment-processor.test.ts`
- `src/ingestion/sources/email/processors/__tests__/email-processor-with-attachments.test.ts`

### Integration Tests

Integration tests verify service interactions:

```typescript
describe('Email Processing Integration', () => {
  it('should process email with attachments end-to-end', async () => {
    const emailProcessor = new EmailProcessor(
      new EmailParsingService(),
      new AttachmentProcessingService()
    );
    
    const result = await emailProcessor.processEmlFileWithAttachments('/path/to/email.eml');
    expect(result.success).toBe(true);
  });
});
```

### Demo Scripts

Demo scripts provide examples of service usage:

- `scripts/demo/test-attachment-processing.ts`: Comprehensive attachment processing demo

## Performance Considerations

### Processing Time Tracking

Each service tracks processing time for performance monitoring:

```typescript
const processingStart = Date.now();
// ... processing logic ...
const processingDuration = Date.now() - processingStart;
```

### Batch Processing

Services support batch processing for efficiency:

```typescript
// Process multiple attachments in a single call
const result = await attachmentProcessingService.processAttachments(attachments);
```

### Memory Management

Large files are handled efficiently with streaming where possible:

```typescript
// Handle large files with appropriate memory management
if (attachment.size > MAX_SIZE) {
  // Use streaming processing
}
```

## Error Handling

### Comprehensive Error Handling

Each service implements comprehensive error handling:

```typescript
interface AttachmentProcessingError {
  filename: string;
  error: string;
  timestamp: Date;
  recoverable: boolean;
}
```

### Error Recovery

Services implement error recovery mechanisms:

```typescript
// Individual attachment failures don't stop batch processing
for (const attachment of attachments) {
  try {
    const processed = await this.processSingleAttachment(attachment);
    processedAttachments.push(processed);
  } catch (error) {
    // Log error and continue with next attachment
    errors.push({
      filename: attachment.filename,
      error: error.message,
      timestamp: new Date(),
      recoverable: true,
    });
  }
}
```

## Monitoring and Logging

### Structured Logging

All services use structured logging with appropriate log levels:

```typescript
logger.info(`📧 Processing EML file: ${emlFilePath}`);
logger.warn(`Skipping unsupported attachment type: ${contentType}`);
logger.error(`Error processing attachment ${filename}:`, error);
```

### Performance Metrics

Services collect performance metrics:

```typescript
const totalProcessingTime = Date.now() - startTime;
logger.info(`✅ Completed processing ${attachments.length} attachments in ${totalProcessingTime}ms`);
```

## Configuration

### Service Registration

Services are registered in the dependency injection container:

```typescript
// Register services in DI container
container.registerSingleton(EmailParsingService);
container.registerSingleton(AttachmentProcessingService);
container.registerSingleton(Neo4jIngestionService);
container.registerSingleton(ContentProcessingService);
```

### Environment Configuration

Services can be configured through environment variables:

```bash
# Processing configuration
MAX_ATTACHMENT_SIZE=10485760
SUPPORTED_MIME_TYPES=application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document
PROCESSING_TIMEOUT=30000
```

## Future Enhancements

### Planned Improvements

1. **OCR Implementation**: Add actual OCR capabilities for image processing
2. **Entity Extraction**: Integrate with NLP services for better entity recognition
3. **Content Classification**: Add automatic content type classification
4. **Compression Support**: Add support for compressed file formats
5. **Streaming Processing**: Implement streaming for very large files

### Performance Optimizations

1. **Caching**: Implement intelligent caching for processed content
2. **Parallel Processing**: Add parallel processing capabilities
3. **Resource Pooling**: Implement connection and resource pooling
4. **Load Balancing**: Add load balancing for distributed processing

### Monitoring Enhancements

1. **Metrics Collection**: Add comprehensive metrics collection
2. **Health Checks**: Implement health check endpoints
3. **Alerting**: Add alerting for processing failures
4. **Dashboard**: Create monitoring dashboard for processing services 