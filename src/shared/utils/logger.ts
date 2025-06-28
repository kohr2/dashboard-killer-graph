/**
 * Simple Logger Utility
 * Replaces console.* statements with structured logging
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: unknown;
  service: string;
}

class Logger {
  private level: LogLevel;
  private service: string;

  constructor(service: string = 'dashboard-killer-graph') {
    this.service = service;
    this.level = this.getLogLevel();
  }

  private getLogLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  private formatMessage(level: string, message: string, data?: unknown): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service
    };

    if (data !== undefined) {
      entry.data = data;
    }

    if (process.env.NODE_ENV === 'production') {
      return JSON.stringify(entry);
    } else {
      // Pretty format for development
      const emoji = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : level === 'INFO' ? 'ℹ️' : '🐛';
      return `${emoji} [${entry.timestamp}] ${level}: ${message}${data ? ` | ${JSON.stringify(data)}` : ''}`;
    }
  }

  error(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message, data));
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('INFO', message, data));
    }
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message, data));
    }
  }

  // Convenience methods for common patterns
  success(message: string, data?: unknown): void {
    this.info(`✅ ${message}`, data);
  }

  failure(message: string, error?: unknown): void {
    this.error(`❌ ${message}`, error);
  }

  progress(message: string, step?: number, total?: number): void {
    const progress = step && total ? ` (${step}/${total})` : '';
    this.info(`🔄 ${message}${progress}`);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export factory for service-specific loggers
export const createLogger = (service: string): Logger => new Logger(); 