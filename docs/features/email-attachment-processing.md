# Email Attachment Processing

Extracts and analyzes content from email attachments to build knowledge graph relationships.

## Overview

Processes various file types from email attachments and extracts structured data for knowledge graph integration.

## Architecture

### Core Services

```
src/platform/processing/
├── email-parsing.service.ts          # Email parsing and content extraction
├── attachment-processing.service.ts   # Attachment processing and text extraction
├── neo4j-ingestion.service.ts        # Neo4j database operations
├── content-processing.service.ts      # Content analysis and enrichment
└── utils/
    └── enrichment.utils.ts           # Data enrichment utilities
```

## Supported File Types

| Format | Extensions | Processing Method |
|--------|------------|-------------------|
| **PDF** | `.pdf` | Text extraction |
| **Word** | `.docx`, `.doc` | Document parsing |
| **Excel** | `.xlsx`, `.xls` | Spreadsheet data |
| **PowerPoint** | `.pptx`, `.ppt` | Presentation content |
| **Images** | `.jpg`, `.png`, `.gif` | OCR processing |
| **Text** | `.txt` | Direct reading |

## Core Services

### EmailParsingService

Parses .eml files and extracts structured data.

**Key Methods:**
- `parseEmlFile(emlFilePath: string)`: Parse .eml file
- `parseEmailContent(emlContent: string)`: Parse email content
- `extractTextContent(parsedEmail: ParsedEmailData)`: Extract text

### AttachmentProcessingService

Processes attachments to extract text and identify entities.

**Processing Methods:**
- **PDF_TEXT_EXTRACTION**: PDF text extraction
- **DOCX_TEXT_EXTRACTION**: Word document extraction
- **Excel**: Spreadsheet data extraction
- **PowerPoint**: Presentation content extraction
- **OCR**: Image text extraction (placeholder)
- **SKIP**: Unsupported file types

**Main Methods:**
- `processAttachments(attachments: EmailAttachment[])`: Process multiple attachments
- `extractTextFromPdf(pdfBuffer: Buffer)`: Extract PDF text
- `extractTextFromDocx(docxBuffer: Buffer)`: Extract Word text
- `extractTextFromExcel(excelBuffer: Buffer)`: Extract Excel data
- `extractTextFromPowerPoint(pptBuffer: Buffer)`: Extract PowerPoint content

### Neo4jIngestionService

Handles Neo4j database operations.

**Features:**
- Create nodes with properties and labels
- Create relationships between nodes
- Handle vector embeddings for similarity search
- Manage transaction rollbacks

### ContentProcessingService

Provides content analysis and enrichment.

**Features:**
- Content normalization
- Entity extraction coordination
- Content enrichment processing

## Usage Examples

### Basic Attachment Processing

```typescript
import { AttachmentProcessingService } from '@platform/processing/attachment-processing.service';

const attachmentProcessor = new AttachmentProcessingService();

const attachments = [
  {
    filename: 'document.pdf',
    contentType: 'application/pdf',
    size: 1024,
    content: Buffer.from('PDF content...'),
  }
];

const result = await attachmentProcessor.processAttachments(attachments);
console.log(`Processed ${result.totalProcessed} attachments`);
```

### Email Processing with Attachments

```typescript
import { EmailProcessor } from '@ingestion/sources/email/processors/email-processor';
import { EmailParsingService } from '@platform/processing/email-parsing.service';
import { AttachmentProcessingService } from '@platform/processing/attachment-processing.service';

const emailProcessor = new EmailProcessor(
  new EmailParsingService(),
  new AttachmentProcessingService()
);

const result = await emailProcessor.processEmlFileWithAttachments('/path/to/email.eml');

if (result.success) {
  console.log(`Email: ${result.email?.subject}`);
  console.log(`Attachments processed: ${result.attachmentProcessing?.totalProcessed}`);
  console.log(`Entities found: ${result.entities.length}`);
}
```

## Testing

### Unit Tests

Tests are located near their corresponding source files:

- `src/platform/processing/utils/__tests__/enrichment.utils.test.ts`
- `src/ingestion/sources/email/processors/__tests__/attachment-processor.test.ts`
- `src/ingestion/sources/email/processors/__tests__/email-processor-with-attachments.test.ts`

### Demo Scripts

- `scripts/demo/test-attachment-processing.ts`: Comprehensive attachment processing demo

## Error Handling

The system provides comprehensive error handling:

- **Unsupported file types**: Gracefully skipped with reason provided
- **Processing errors**: Captured and reported with details
- **Empty content**: Handled with appropriate error messages
- **Corrupted files**: Error details captured for debugging

## Performance Considerations

- **Processing time tracking**: Each attachment processing includes duration metrics
- **Batch processing**: Multiple attachments processed efficiently
- **Memory management**: Large files handled with streaming where possible
- **Error recovery**: Individual attachment failures don't stop batch processing

## Future Enhancements

- **OCR Implementation**: Add actual OCR capabilities for image processing
- **Entity Extraction**: Integrate with NLP services for better entity recognition
- **Content Classification**: Add automatic content type classification
- **Compression Support**: Add support for compressed file formats
- **Streaming Processing**: Implement streaming for very large files

## Configuration

The processing services use dependency injection and can be configured through the DI container:

```typescript
// Register services in DI container
container.registerSingleton(EmailParsingService);
container.registerSingleton(AttachmentProcessingService);
container.registerSingleton(Neo4jIngestionService);
container.registerSingleton(ContentProcessingService);
```

## Monitoring and Logging

All services include comprehensive logging:

- Processing start/completion events
- File type detection and support status
- Processing duration metrics
- Error details and recovery attempts
- Entity extraction results

The system uses structured logging with appropriate log levels for different types of information. 