# Logging Guidelines

The project uses a single, minimal yet powerful logger implementation based on **Pino** that lives in:

```
src/common/utils/logger.ts
```

Import it **always** via the path alias:

```ts
import { logger } from '@common/utils/logger';
```

## Levels

| Method | Env var level | Description                        |
| ------ | ------------- | ---------------------------------- |
| error  | ERROR         | Critical failures, will exit soon  |
| warn   | WARN          | Non-fatal issues that need review  |
| info   | INFO          | Normal operational messages        |
| debug  | DEBUG         | Verbose diagnostics (disabled in production) |

`LOG_LEVEL` can override the default level (`INFO` in development, `silent` in test).

## Service-scoped loggers

```ts
import { createLogger } from '@common/utils/logger';
const serviceLogger = createLogger('neo4j-ingestion');
serviceLogger.info('vector index skipped');
```

## Redirecting `console.*`

For legacy code or third-party libraries that still use the global console, we patch the methods early in bootstrap:

```ts
import '@common/utils/console-to-logger';
```

This module forwards all `console.*` calls to the appropriate logger level while tagging them with `{ legacy: true }`.

## Do NOT

* Add new imports from `src/shared/logger.ts` – that file was removed.
* Log sensitive data (passwords, API keys, PII).
* Scatter `console.log` calls – rely on the typed logger instead. 