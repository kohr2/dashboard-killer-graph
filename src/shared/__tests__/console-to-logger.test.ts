import 'reflect-metadata';
import { logger } from '@common/utils/logger';
import '@common/utils/console-to-logger';

describe('console-to-logger redirect', () => {
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;

  it('should call logger.info when console.log is used', () => {
    const spy = jest.spyOn(logger, 'info');

    console.log('hello world');

    expect(spy).toHaveBeenCalledWith({ legacy: true }, 'hello world');

    spy.mockRestore();
  });
}); 