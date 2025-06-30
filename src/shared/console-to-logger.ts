import { logger } from './logger';

// Helper to call the appropriate logger level while tagging legacy usage
function redirect(level: 'info' | 'warn' | 'error' | 'debug', args: unknown[]): void {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore – pino logger supports object arg first signature
  logger[level]({ legacy: true }, ...args);
}

// Overwrite Node's console methods
console.log = (...args: unknown[]) => redirect('info', args);
console.info = (...args: unknown[]) => redirect('info', args);
console.warn = (...args: unknown[]) => redirect('warn', args);
console.error = (...args: unknown[]) => redirect('error', args);
console.debug = (...args: unknown[]) => redirect('debug', args);

// Export something so consumers can import the module intentionally
export const consolePatched = true; 