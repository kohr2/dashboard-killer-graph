/**
 * Patch Node's console methods to forward to our typed logger while tagging legacy usage.
 * Import this module as a side effect early in your bootstrap to capture logs.
 */

import { logger } from './logger';

function redirect(level: 'info' | 'warn' | 'error' | 'debug', args: unknown[]): void {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore – pino supports object arg first signature
  logger[level]({ legacy: true }, ...args);
}

console.log = (...args: unknown[]) => redirect('info', args);
console.info = (...args: unknown[]) => redirect('info', args);
console.warn = (...args: unknown[]) => redirect('warn', args);
console.error = (...args: unknown[]) => redirect('error', args);
console.debug = (...args: unknown[]) => redirect('debug', args);

export const consolePatched = true; 