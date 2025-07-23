/**
 * Common logger utility (moved from src/shared/utils/logger.ts)
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
      case 'ERROR':
        return LogLevel.ERROR;
      case 'WARN':
        return LogLevel.WARN;
      case 'INFO':
        return LogLevel.INFO;
      case 'DEBUG':
        return LogLevel.DEBUG;
      default:
        return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (process.env.LOG_SILENT === 'true') {
      return false;
    }
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
      let extra = '';
      if (data !== undefined) {
        try {
          extra = ` | ${JSON.stringify(data)}`;
        } catch {
          extra = ' | [Unserializable]';
        }
      }
      return `[${entry.timestamp}] ${level}: ${message}${extra}`;
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
      console.info(this.formatMessage('INFO', message, data));
    }
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message, data));
    }
  }
}

export const logger = new Logger();
export const createLogger = (service: string): Logger => new Logger(service); 