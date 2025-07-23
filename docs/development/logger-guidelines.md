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