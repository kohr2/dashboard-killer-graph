import 'reflect-metadata';
import { container } from 'tsyringe';
import { ContactService } from '@crm/application/services/contact.service';
import { registerDependencies } from '@src/bootstrap';
import { logger } from '@shared/logger';

describe('Bootstrap DI & Logger POC', () => {
  afterEach(() => {
    container.reset();
  });

  it('should resolve ContactService via tsyringe container', () => {
    registerDependencies();

    const mockRepo = {
      findById: jest.fn(),
      save: jest.fn(),
      search: jest.fn(),
      delete: jest.fn(),
    } as any;

    container.register('ContactRepository', { useValue: mockRepo });

    const service = container.resolve(ContactService);
    expect(service).toBeInstanceOf(ContactService);
  });

  it('should log structured info via logger', () => {
    const spy = jest.spyOn(logger, 'info');
    logger.info({ poc: true }, 'TEST');
    expect(spy).toHaveBeenCalledWith({ poc: true }, 'TEST');
    spy.mockRestore();
  });
}); 