# Logger Guidelines

This document outlines the logging standards and best practices for the dashboard-killer-graph project.

## Basic Usage

```ts
import { logger } from '@shared/utils/logger';

logger.info('Application started');
logger.warn('Deprecated feature used');
logger.error('Failed to connect to database', { error: 'Connection timeout' });
```

## Creating Service-Specific Loggers

```ts
import { createLogger } from '@shared/utils/logger';

const serviceLogger = createLogger('email-service');
serviceLogger.info('Processing email batch', { count: 10 });
```

## Console Redirection

To capture legacy console.log calls and redirect them to our logger:

```ts
import '@shared/utils/console-to-logger';
```

This should be imported early in your application bootstrap to capture all console output.

## Log Levels

- **ERROR**: Critical errors that prevent normal operation
- **WARN**: Issues that don't stop execution but should be addressed
- **INFO**: General information about application flow
- **DEBUG**: Detailed information for debugging

## Environment Variables

- `LOG_LEVEL`: Set the minimum log level (ERROR, WARN, INFO, DEBUG)
- `LOG_SILENT`: Set to 'true' to disable all logging
- `NODE_ENV`: Affects log format (JSON in production, readable in development)

## Best Practices

### **Use Structured Logging**

```ts
// Good
logger.info('User action completed', { 
  userId: '123', 
  action: 'email_processed', 
  duration: 1500 
});

// Avoid
logger.info('User 123 completed email_processed in 1500ms');
```

### **Include Context**

```ts
// Good
logger.error('Database connection failed', { 
  database: 'neo4j', 
  host: 'localhost:7687',
  error: error.message 
});

// Avoid
logger.error('Connection failed');
```

### **Use Appropriate Levels**

```ts
// ERROR: Critical failures
logger.error('Failed to start service', { error: error.message });

// WARN: Non-fatal issues
logger.warn('Deprecated API endpoint used', { endpoint: '/old-api' });

// INFO: Normal operations
logger.info('Service started successfully', { port: 3001 });

// DEBUG: Detailed diagnostics
logger.debug('Processing request', { method: 'POST', path: '/api/chat' });
```

### **Avoid Sensitive Data**

```ts
// Good
logger.info('API call made', { 
  endpoint: '/api/users', 
  method: 'POST',
  userId: '123' 
});

// Avoid
logger.info('API call made', { 
  endpoint: '/api/users', 
  method: 'POST',
  password: 'secret123',  // Never log passwords
  apiKey: 'sk-...'        // Never log API keys
});
```

## Integration with Scripts

The unified script system uses the same logging approach:

```bash
# Scripts use colored output for better UX
print_status "Starting service..."
print_success "Service started successfully"
print_warning "Deprecated feature used"
print_error "Service failed to start"
```

## Testing

In test environments, logging is automatically configured:

```ts
// Tests use simplified logging
logger.info('Test message'); // Outputs to console in readable format
```

## Migration from Legacy Logging

If you're migrating from old logging patterns:

```ts
// Old way
import { logger } from '../../common/utils/logger';

// New way
import { logger } from '@shared/utils/logger';
```

## Configuration

The logger is configured in `src/shared/utils/logger.ts` and provides:

- **Development**: Human-readable format
- **Production**: JSON format for log aggregation
- **Testing**: Simplified output
- **Silent Mode**: Disabled for CI/CD 