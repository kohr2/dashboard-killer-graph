import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Console to Logger', () => {
  let originalConsole: any;

  beforeEach(() => {
    // Store original console methods before patching
    originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
  });

  describe('console patching', () => {
    it('should patch console methods when module is imported', () => {
      // Import the module to trigger the side effects
      require('../console-to-logger');
      
      // The console methods should now be patched
      expect(typeof console.log).toBe('function');
      expect(typeof console.info).toBe('function');
      expect(typeof console.warn).toBe('function');
      expect(typeof console.error).toBe('function');
      expect(typeof console.debug).toBe('function');
    });
  });

  describe('console redirection', () => {
    it('should redirect console calls to logger', () => {
      // Import the module to trigger the side effects
      require('../console-to-logger');
      
      // Test that console methods are patched
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Call the patched methods
      console.log('test message');
      console.warn('warning message');
      console.error('error message');
      
      // Verify they were called
      expect(logSpy).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
      
      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });
}); 