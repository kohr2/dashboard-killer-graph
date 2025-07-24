/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'pino' {
  interface Logger {
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    debug: (...args: any[]) => void;
  }

  function pino(options?: unknown): Logger;
  export default pino;
} 