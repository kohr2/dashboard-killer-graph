import { logger } from '@common/utils/logger';

import '@common/utils/console-to-logger';

describe('console-to-logger redirect', () => {
  it('should call logger.info when console.log is used', () => {
    const spy = jest.spyOn(logger, 'info');

    console.log('hello world');

    expect(spy).toHaveBeenCalledWith({ legacy: true }, 'hello world');

    spy.mockRestore();
  });
}); 