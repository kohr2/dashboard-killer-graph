/**
 * Patch Node's console methods to forward to our typed logger while tagging legacy usage.
 * Import this module as a side effect early in your bootstrap to capture logs.
 */

import { logger } from './logger';

// Capture original console methods before we patch them
const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
};

function stringifySafe(value: unknown): string {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return '[Unserializable]';
  }
}

function redirect(level: 'info' | 'warn' | 'error' | 'debug', args: unknown[]): void {
  const message = args.map(stringifySafe).join(' ');
  
  // Use original console methods to avoid recursion when logger internally uses console
  if (process.env.NODE_ENV === 'test') {
    // In tests, just use original console to avoid complexity
    originalConsole[level === 'info' ? 'log' : level](`[LEGACY] ${message}`);
  } else {
    // In production, use our logger but ensure it doesn't trigger console recursion
    logger[level](message);
  }
}

// Map console methods
console.log = (...args: unknown[]) => redirect('info', args);
console.info = (...args: unknown[]) => redirect('info', args);
console.warn = (...args: unknown[]) => redirect('warn', args);
console.error = (...args: unknown[]) => redirect('error', args);
console.debug = (...args: unknown[]) => redirect('debug', args);

export const consolePatched = true; 