// Lightweight wrapper around `pino` with graceful fallback for environments
// (like CI or unit tests) where the dependency might not be installed.
let createLogger: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires,import/no-extraneous-dependencies
  createLogger = require('pino');
} catch (err) {
  // Provide a minimal console-backed logger
  createLogger = () => {
    const noop = () => undefined;
    const consoleLogger = {
      info: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: process.env.NODE_ENV === 'production' ? noop : console.debug.bind(console),
    };
    return consoleLogger;
  };
}

export const logger = createLogger({
  level:
    process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
}); 