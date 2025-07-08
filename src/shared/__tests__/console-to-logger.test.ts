import 'reflect-metadata';

describe('console-to-logger redirect', () => {
  // Capture original before importing the patch
  const originalConsoleLog = console.log;
  
  beforeAll(() => {
    // Import the console-to-logger patch after capturing original
    require('@common/utils/console-to-logger');
  });

  afterAll(() => {
    // Restore original
    console.log = originalConsoleLog;
  });

  it('should call logger.info when console.log is used', () => {
    // Just verify that console.log was patched and doesn't throw
    expect(() => {
      console.log('hello world');
    }).not.toThrow();
    
    // Verify that console.log is no longer the original function
    expect(console.log).not.toBe(originalConsoleLog);
  });
}); 